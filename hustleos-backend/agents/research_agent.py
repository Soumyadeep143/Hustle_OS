import json
import os
from typing import Dict, List, Optional

from openai import OpenAI


class ResearchAgent:
    """Understands a prospect/company from limited input and produces a
    small set of grounded findings, tagged as fact vs inference so
    provenance is never lost (see MemoryFact.type)."""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"

    def research(
        self,
        name: str,
        company: str,
        role: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, List[Dict]]:
        try:
            prompt = f"""You are a GTM research assistant. Based on the following
limited input, infer 3-5 short, plausible findings about this prospect that a
sales rep could use. Clearly separate facts that are actually given from
inferences you are making — never invent specifics that aren't grounded in
the input.

Name: {name}
Role: {role or 'unknown'}
Company: {company}
Notes provided by the user: {notes or 'none'}

Return a JSON array of objects like:
[{{"type": "fact", "text": "..."}}, {{"type": "inference", "text": "..."}}]
Only use "fact" for something literally stated above. Everything else is "inference".
Return ONLY the JSON array, no other text."""

            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )
            findings = json.loads(response.choices[0].message.content)
            if not isinstance(findings, list) or not findings:
                raise ValueError("empty or non-list findings")
            return {"findings": findings}
        except Exception as e:
            print(f"Error in research agent: {e}")
            return {"findings": self._fallback_findings(name, company, role, notes)}

    @staticmethod
    def _fallback_findings(name: str, company: str, role: Optional[str], notes: Optional[str]) -> List[Dict]:
        """Used when the Claude call is unavailable. Splits user-provided
        notes into individual atomic facts (instead of one long blob) so
        downstream keyword-based scoring/reasoning in StrategyAgent, which
        matches per-fact text, has a fair shot at picking up each signal or
        objection separately."""
        findings = [
            {"type": "fact", "text": f"{name} holds the role of {role or 'an unspecified role'} at {company}."}
        ]
        if notes:
            import re

            segments = [s.strip() for s in re.split(r"[;.]\s*|\n", notes) if s.strip()]
            findings.extend({"type": "fact", "text": s} for s in segments)
        return findings
