import json
import os
from typing import Dict, List

from openai import OpenAI


class StrategyAgent:
    """Scores prospects and recommends the next best action, grounded in
    stored memory facts rather than the LLM's own assumptions."""

    SIGNAL_WORDS = ["interested", "engaged", "requested", "asked", "responded", "meeting"]
    OBJECTION_WORDS = ["concern", "objection", "security", "cost", "hesitant"]

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"

    @staticmethod
    def _evidence_facts(memory_facts: List[Dict]) -> List[Dict]:
        """Excludes our own action-log entries ("Executed action: ... Result:
        ...") from scoring/reasoning input. Those record what we already
        did, not new evidence about the prospect — including them creates a
        feedback loop where an approved action's own reason text (which
        quotes the original facts) gets re-read as a *new* objection/signal
        on the next rescore, producing increasingly self-referential,
        garbled reasoning each time an action is approved."""
        return [f for f in memory_facts if f.get("metadata", {}).get("type") != "action"]

    def score(self, prospect: Dict, memory_facts: List[Dict]) -> Dict:
        """Deterministic heuristic scoring so lead/intent scores don't
        depend on an LLM call being available — the demo stays reliable
        even without API keys configured."""
        base = 40
        evidence = self._evidence_facts(memory_facts)

        text_blob = " ".join(f.get("text", "") for f in evidence).lower()
        signal_hits = sum(1 for w in self.SIGNAL_WORDS if w in text_blob)
        objection_hits = sum(1 for w in self.OBJECTION_WORDS if w in text_blob)

        score = base + signal_hits * 12 - objection_hits * 3
        score = max(0, min(100, score))

        if score >= 75:
            intent, relationship = "high", "high_intent"
        elif score >= 45:
            intent, relationship = "medium", "engaged"
        else:
            intent, relationship = "low", "new"

        return {"lead_score": score, "intent": intent, "relationship": relationship}

    def next_best_action(self, prospect: Dict, memory_facts: List[Dict]) -> Dict:
        evidence = self._evidence_facts(memory_facts)
        facts_text = "\n".join(
            f"- ({f.get('metadata', {}).get('type', 'fact')}) {f.get('text', '')}" for f in evidence
        ) or "- No memory yet."

        try:
            prompt = f"""You are a GTM strategy assistant. Based ONLY on the facts
below, recommend one concrete next action for this prospect, and explain why
in one sentence. Do not invent information that isn't present in the facts.

Prospect: {prospect.get('name')} ({prospect.get('role') or 'unknown role'}) at {prospect.get('company')}
Lead score: {prospect.get('lead_score')}
Intent: {prospect.get('intent')}

Known facts:
{facts_text}

Return JSON: {{"action": "...", "reason": "..."}}
Return ONLY the JSON object, no other text."""

            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )
            result = json.loads(response.choices[0].message.content)
            return {"action": result["action"], "reason": result["reason"]}
        except Exception as e:
            print(f"Error generating next-best-action: {e}")
            return self._fallback_next_best_action(prospect, evidence)

    def _fallback_next_best_action(self, prospect: Dict, memory_facts: List[Dict]) -> Dict:
        """Used when the Claude call is unavailable (no/placeholder API key).
        Still grounded: it quotes real stored fact text rather than emitting
        a single generic template, using the same signal/objection keyword
        signal as score() so the reasoning stays consistent with the score."""
        name = prospect.get("name", "this prospect")
        objection_fact = next(
            (f for f in memory_facts if any(w in f.get("text", "").lower() for w in self.OBJECTION_WORDS)),
            None,
        )
        signal_fact = next(
            (f for f in memory_facts if any(w in f.get("text", "").lower() for w in self.SIGNAL_WORDS)),
            None,
        )

        if objection_fact and signal_fact:
            action = f"Send material that directly addresses their concern, referencing their recent engagement"
            reason = (
                f'{name} raised a concern — "{objection_fact["text"]}" — and separately showed active '
                f'interest — "{signal_fact["text"]}". Addressing the concern now capitalizes on that momentum.'
            )
        elif objection_fact:
            action = "Address the objection directly with supporting material"
            reason = f'{name} raised a concern: "{objection_fact["text"]}". This is the main blocker to progressing right now.'
        elif signal_fact:
            action = f"Follow up with {name} while interest is active"
            reason = f'{name} recently showed engagement: "{signal_fact["text"]}". Following up now capitalizes on that momentum.'
        elif memory_facts:
            top_fact = memory_facts[0]
            action = f"Reach out to {name} to continue the conversation"
            reason = f'Based on what we know so far — "{top_fact["text"]}" — a personalized follow-up is the natural next step.'
        else:
            action = f"Reach out to {name} to start building context"
            reason = "No stored context yet — an initial outreach will help establish facts for future recommendations."

        return {"action": action, "reason": reason}
