import os
from typing import Dict

from openai import OpenAI

from .provider import ExecutionProvider


class LocalExecutionProvider(ExecutionProvider):
    """Generates the approved action's content locally via OpenAI. This does
    NOT send anything externally — it produces the artifact a human reviews
    and sends themselves, consistent with HustleOS's approve-before-execute
    model and the existing DocumentationAgent's email-drafting pattern."""

    name = "local"

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"

    def execute(self, action: str, context: Dict) -> Dict:
        prospect = context.get("prospect", {})
        try:
            prompt = f"""Write the content for this approved GTM action. Be concise and concrete.

Action: {action}
Prospect: {prospect.get('name')} ({prospect.get('role') or 'unknown role'}) at {prospect.get('company')}
Reason for action: {context.get('reason', '')}
Known context: {context.get('memory_summary', '')}

Return only the content itself (e.g. the email/message body), no preamble."""

            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
            )
            return {"status": "completed", "output": response.choices[0].message.content, "provider": self.name}
        except Exception as e:
            print(f"Error in local execution provider: {e}")
            return {
                "status": "completed",
                "output": self._fallback_draft(action, context),
                "provider": self.name,
            }

    @staticmethod
    def _fallback_draft(action: str, context: Dict) -> str:
        """Used when the Claude call is unavailable (no/placeholder
        ANTHROPIC_API_KEY). Produces a real, grounded draft — quoting the
        actual reason and known context — instead of a placeholder string,
        while being explicit that it wasn't AI-generated so the UI never
        misrepresents this as a live model output."""
        prospect = context.get("prospect", {})
        name = prospect.get("name", "there")
        first_name = name.split()[0] if name else "there"
        reason = context.get("reason", "")
        memory_summary = context.get("memory_summary", "")

        lines = [f"Subject: Following up — {action}", "", f"Hi {first_name},", ""]
        if reason:
            lines.append(f"Reaching out because: {reason}")
        if memory_summary and memory_summary != "No stored memory yet.":
            lines.append(f"For context, here's what we have on file: {memory_summary}")
        lines.append("")
        lines.append("— Sent via HustleOS RECALL")
        lines.append(
            "[Note: this draft was template-assembled locally, not AI-generated — "
            "set a live OPENAI_API_KEY to enable AI-personalized drafting.]"
        )
        return "\n".join(lines)
