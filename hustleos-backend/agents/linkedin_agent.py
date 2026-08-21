from typing import Dict, List, Optional
from anthropic import Anthropic


class LinkedInAgent:
    """Handle LinkedIn profile enrichment and recruiter engagement"""

    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-3-5-sonnet-20241022"

    def find_recruiters(self, company: str, location: str) -> List[Dict]:
        """Find recruiters/hiring managers on LinkedIn for a company"""
        recruiters_db = {
            "OpenAI": [
                {
                    "name": "OpenAI Recruiting",
                    "title": "Talent Acquisition",
                    "focus": "AI/ML Engineers",
                },
                {
                    "name": "Engineering Team",
                    "title": "Hiring Manager",
                    "focus": "Full Stack",
                },
            ],
            "Anthropic": [
                {
                    "name": "Anthropic Talent",
                    "title": "Talent Acquisition Manager",
                    "focus": "Research & Engineering",
                },
                {
                    "name": "Research Hiring",
                    "title": "Research Lead",
                    "focus": "AI Safety Research",
                },
            ],
            "Mem0": [
                {
                    "name": "Mem0 Recruiting",
                    "title": "Hiring Manager",
                    "focus": "Full Stack Engineers",
                },
            ],
        }

        return recruiters_db.get(
            company,
            [
                {
                    "name": f"{company} Recruiting",
                    "title": "Talent Acquisition",
                    "focus": "All Roles",
                }
            ],
        )

    def generate_linkedin_dm(self, recruiter: Dict, user_context: Dict, role: str) -> str:
        """Generate personalized LinkedIn DM to recruiter"""
        try:
            profile = user_context.get("profile", {})
            skills = ", ".join(profile.get("skills", []))

            prompt = f"""Write a brief, personalized LinkedIn DM (2-3 sentences) to a recruiter.

Recruiter: {recruiter['name']} ({recruiter['title']}) at {recruiter['focus']}
Candidate: {profile.get('name', 'Candidate')}
Role: {role}
Skills: {skills}
Location: {profile.get('target_location', 'Not specified')}

The DM should:
- Be casual but professional
- Reference their specific focus area
- Show genuine interest
- Include a clear CTA (call to action)

Return ONLY the DM text, no metadata."""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )

            return message.content[0].text
        except Exception as e:
            print(f"Error generating LinkedIn DM: {e}")
            return f"Hi {recruiter['name']}, I'm interested in the {role} opportunity at your company. Let's connect!"

    def analyze_recruiter_profile(
        self, recruiter: Dict, user_context: Dict
    ) -> Dict:
        """Analyze how well recruiter fits user profile"""
        profile = user_context.get("profile", {})
        fit_score = 0

        if "AI" in recruiter.get("focus", "").lower() or "ML" in recruiter.get("focus", ""):
            fit_score += 25

        if any(
            skill in recruiter.get("focus", "").lower()
            for skill in profile.get("skills", [])
        ):
            fit_score += 25

        if recruiter.get("title") in ["Hiring Manager", "Engineering Manager"]:
            fit_score += 20

        fit_score = min(fit_score + 30, 100)

        return {
            "recruiter": recruiter["name"],
            "title": recruiter["title"],
            "fit_score": fit_score,
            "reason": f"Strong match in {recruiter['focus']} focus area" if fit_score > 70 else "Potential fit for opportunities",
            "priority": "High" if fit_score > 75 else "Medium" if fit_score > 50 else "Low",
        }

    def get_linkedin_engagement_tips(self, company: str) -> List[str]:
        """Get tips for engaging with a company on LinkedIn"""
        tips = [
            "Like recent company posts before reaching out",
            "Mention specific product features you admire",
            "Reference recent company news or funding",
            "Show genuine interest, not just job hunting",
            "Keep initial outreach to 2-3 sentences",
            "Best time to reach out: Tuesday-Thursday, 9-11 AM",
            "Follow up after 5 days if no response",
            "Personalize every message - avoid templates",
            "Include relevant projects/portfolio link",
            "Engage with team members' posts before DMing",
        ]
        return tips

    def build_linkedin_profile_tips(self, user_context: Dict) -> List[str]:
        """Suggestions to improve LinkedIn profile for job search"""
        tips = [
            "✓ Add professional headline with target role",
            "✓ Write compelling 'About' section (100+ words)",
            "✓ List all relevant skills and endorsements",
            "✓ Get recommendations from past colleagues",
            "✓ Share content related to your target role",
            "✓ Add portfolio projects and links",
            "✓ Use keywords from job descriptions",
            "✓ Update headline to match target role",
            "✓ Connect with hiring managers and recruiters",
            "✓ Engage with company content",
        ]
        return tips

    def generate_linkedin_post(self, topic: str, user_context: Dict) -> str:
        """Generate LinkedIn post to increase visibility"""
        try:
            profile = user_context.get("profile", {})

            prompt = f"""Write an engaging LinkedIn post (50-100 words) about {topic}.

Author: {profile.get('name', 'AI Professional')}
Target Role: {profile.get('target_role', 'AI Engineer')}
Skills: {', '.join(profile.get('skills', []))}

The post should:
- Be authentic and genuine
- Show expertise without being preachy
- Include relevant hashtags
- Encourage engagement
- Be appropriate for tech audience

Return ONLY the post text."""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )

            return message.content[0].text
        except Exception as e:
            print(f"Error generating LinkedIn post: {e}")
            return f"Excited about {topic}! What are your thoughts? #AI #Tech"
