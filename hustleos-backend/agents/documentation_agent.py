from anthropic import Anthropic
from typing import Dict


class DocumentationAgent:
    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-3-5-sonnet-20241022"

    def generate_email(self, opportunity: Dict, user_context: Dict) -> str:
        """Generate a personalized cold email"""
        try:
            profile = user_context.get("profile", {})
            skills = ", ".join(profile.get("skills", []))

            prompt = f"""Draft a personalized, punchy cold email (3 sentences max) to the hiring manager at {opportunity['company']} for the {opportunity['role']} position. The candidate is {profile['name']}, a {skills} engineer based in {profile['target_location']} interested in {profile['target_role']}. Make it engaging and to-the-point."""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )

            return message.content[0].text
        except Exception as e:
            print(f"Error generating email: {e}")
            return f"Hi {opportunity['company']} team,\n\nI'm interested in the {opportunity['role']} position."

    def generate_cover_letter(self, opportunity: Dict, user_context: Dict) -> str:
        """Generate a cover letter"""
        try:
            profile = user_context.get("profile", {})
            skills = ", ".join(profile.get("skills", []))

            prompt = f"""Draft a compelling cover letter for {profile['name']} applying to {opportunity['role']} at {opportunity['company']}.
The candidate specializes in {skills} and is based in {profile['target_location']}.
Company: {opportunity['company']}
Role: {opportunity['role']}
Description: {opportunity['description']}
Make it 3-4 paragraphs, professional but authentic."""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}],
            )

            return message.content[0].text
        except Exception as e:
            print(f"Error generating cover letter: {e}")
            return f"Dear {opportunity['company']} Hiring Team,\n\nI am writing to express my strong interest in the {opportunity['role']} position."
