import json
from anthropic import Anthropic
from typing import Dict, List


class PlannerAgent:
    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-3-5-sonnet-20241022"

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

            message = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )

            try:
                plans = json.loads(message.content[0].text)
                return plans if isinstance(plans, list) else []
            except json.JSONDecodeError:
                return []
        except Exception as e:
            print(f"Error generating daily plan: {e}")
            return []

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
