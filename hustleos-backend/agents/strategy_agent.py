import json
import os
from typing import Dict, Optional

from openai import OpenAI

_OPPORTUNITY_CATEGORIES = {"Business Opportunity", "Startup"}
_TRACKABLE_CATEGORIES = {"Career", "Job", "Internship", "Hackathon", "Event"}

_VALID_STATUSES = {
    "saved", "interested", "applied", "following_up", "interview",
    "responded", "opportunity", "completed", "archived",
}
_VALID_PRIORITIES = {"low", "medium", "high"}


class StrategyAgent:
    """Suggests a starting status/priority/next-step for a freshly-enriched
    RECALL item — grounded in the category and summary ResearchAgent already
    produced, never inventing new facts. The user reviews and can change or
    ignore every suggestion before saving (see spec: 'AI suggestions are
    suggestions')."""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"

    def suggest(self, category: str, context_text: str) -> Dict:
        try:
            if not (context_text or "").strip():
                raise ValueError("nothing to reason about")

            prompt = f"""Based ONLY on the category and summary below, suggest a starting
status, priority, and one concrete next step for this saved item. Do not
invent information that isn't present.

Category: {category}
Summary: {context_text}

Valid statuses: {sorted(_VALID_STATUSES)}
Valid priorities: {sorted(_VALID_PRIORITIES)} (or null if not clearly time-sensitive)

Return ONLY a JSON object: {{"status_suggestion": "...", "priority_suggestion": "...", "potential_action": "..."}}"""

            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            status = str(result.get("status_suggestion") or "").strip().lower()
            priority = str(result.get("priority_suggestion") or "").strip().lower()
            return {
                "status_suggestion": status if status in _VALID_STATUSES else "saved",
                "priority_suggestion": priority if priority in _VALID_PRIORITIES else None,
                "potential_action": result.get("potential_action"),
            }
        except Exception as e:
            print(f"Error generating recall suggestion: {e}")
            return self._fallback_suggestion(category)

    @staticmethod
    def _fallback_suggestion(category: str) -> Dict:
        """Used when the LLM call is unavailable. Deterministic, based only
        on category — never a single generic template for everything."""
        if category in {"Career", "Job", "Internship"}:
            return {
                "status_suggestion": "interested",
                "priority_suggestion": "medium",
                "potential_action": "Review the requirements and decide whether to apply.",
            }
        if category in {"Hackathon", "Event"}:
            return {
                "status_suggestion": "interested",
                "priority_suggestion": "medium",
                "potential_action": "Check the dates and registration deadline.",
            }
        if category in _OPPORTUNITY_CATEGORIES:
            return {
                "status_suggestion": "opportunity",
                "priority_suggestion": "high",
                "potential_action": "Follow up to learn more.",
            }
        return {
            "status_suggestion": "saved",
            "priority_suggestion": None,
            "potential_action": "Review when you have time.",
        }
