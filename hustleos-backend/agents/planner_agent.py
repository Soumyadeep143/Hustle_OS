import json
import os
from openai import OpenAI
from typing import Dict, List


def _parse_json_array(text: str) -> list:
    """Groq's gpt-oss models sometimes wrap JSON replies in a ```json ... ```
    fence even when told not to -- strip it before parsing."""
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    return json.loads(text)


class PlannerAgent:
    """Uses Groq (openai/gpt-oss-20b) -- fast/cheap, fine for a short
    structured JSON reply once given enough max_tokens to cover the
    model's internal reasoning overhead before the visible answer."""

    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
        self.model = "openai/gpt-oss-20b"

    def generate_daily_plan(self, user_context: Dict) -> List[str]:
        """Generate a motivational 3-item priority list for today"""
        try:
            profile = user_context.get("profile", {})
            applications = user_context.get("applications", [])
            insights = user_context.get("insights", [])

            prompt = f"""Based on the user's job applications and follow-ups due, generate a motivational 3-item priority list for today. Include relevant emojis.

User Context:
- Name: {profile.get('name', 'User')}
- Target role: {profile.get('target_role', 'N/A')}
- Total applications: {len(applications)}
- Recent insights: {', '.join(insights[:2]) if insights else 'Keep applying'}

Return as a JSON array of 3 strings with emojis.
Example: ["🎯 Item 1", "📝 Item 2", "🚀 Item 3"]

Return ONLY the JSON array, no other text."""

            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )

            try:
                plans = _parse_json_array(response.choices[0].message.content)
                return plans if isinstance(plans, list) else []
            except json.JSONDecodeError:
                return []
        except Exception as e:
            print(f"Error generating daily plan: {e}")
            return []

    def generate_brief_headline(self, user_context: Dict) -> str:
        """Generate one polished, professional sentence summarizing what
        matters today, grounded in the user's real applications/tasks/
        follow-ups. Replaces the old approach of throwing away the
        planner's real output and showing a generic "N important actions"
        template instead."""
        try:
            profile = user_context.get("profile", {})
            applications = user_context.get("applications", [])
            insights = user_context.get("insights", [])

            prompt = f"""Write ONE short, professional sentence (under 18 words) summarizing what matters most today for a job seeker, based on this real context. No greeting, no emoji, no surrounding quotes -- just the sentence itself.

User Context:
- Name: {profile.get('name', 'User')}
- Target role: {profile.get('target_role', 'N/A')}
- Total applications: {len(applications)}
- Recent insights: {', '.join(insights[:2]) if insights else 'none yet'}

If nothing is genuinely urgent, say so plainly and encouragingly -- never invent urgency that isn't there."""

            # max_tokens must cover gpt-oss's internal reasoning overhead
            # before the visible sentence, not just the sentence itself --
            # see HANDOVER.md's Groq gotcha note (a too-tight budget here
            # silently returns "" the same way the original score_opportunity
            # bug did with max_tokens=10).
            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
            )
            text = (response.choices[0].message.content or "").strip().strip('"')
            return text or self._fallback_headline(applications)
        except Exception as e:
            print(f"Error generating brief headline: {e}")
            return self._fallback_headline(user_context.get("applications", []))

    @staticmethod
    def _fallback_headline(applications: List[Dict]) -> str:
        count = len(applications)
        if not count:
            return "Nothing urgent right now — a good day to start tracking your first application."
        return f"Tracking {count} application{'s' if count != 1 else ''} — check in on the ones due for a follow-up."

    def calculate_execution_score(self, user_context: Dict) -> int:
        """Calculate execution score (0-100)"""
        total_apps = user_context.get("total_applications", 0)
        applications = user_context.get("applications", [])

        followups_done = sum(
            1 for app in applications if app.get("last_followup") is not None
        )
        total_followups = len([a for a in applications if a["status"] in ["applied", "reviewing"]])

        if total_followups == 0:
            total_followups = 1

        breadth_score = min((total_apps / 20) * 50, 50)
        consistency_score = (followups_done / total_followups) * 50

        score = int(breadth_score + consistency_score)
        return min(score, 100)
