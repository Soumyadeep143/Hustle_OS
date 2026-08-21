from typing import Dict, List, Optional
from anthropic import Anthropic


class AssessmentAgent:
    """Generate job search and career readiness assessments"""

    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-3-5-sonnet-20241022"

    def calculate_career_readiness_score(self, user_context: Dict) -> Dict:
        """Calculate 0-100 career readiness score"""
        profile = user_context.get("profile", {})
        applications = user_context.get("applications", [])

        score = 0
        details = []

        # Skills assessment (0-20 points)
        skills = profile.get("skills", [])
        if len(skills) >= 5:
            score += 20
            details.append("✓ Strong skill set (5+ skills)")
        elif len(skills) >= 3:
            score += 15
            details.append("~ Decent skill set (3-4 skills)")
        else:
            score += 5
            details.append("✗ Limited skill set - consider adding more skills")

        # Experience assessment (0-20 points)
        if len(applications) >= 10:
            score += 20
            details.append("✓ Active application rate (10+ applications)")
        elif len(applications) >= 5:
            score += 15
            details.append("~ Moderate application rate (5-9 applications)")
        else:
            score += 5
            details.append("✗ Low application rate - increase daily applications")

        # Interview pipeline (0-20 points)
        interviews = sum(1 for app in applications if app["status"] == "interview")
        if interviews >= 2:
            score += 20
            details.append("✓ Strong interview pipeline (2+ interviews)")
        elif interviews >= 1:
            score += 15
            details.append("~ Interview scheduled (1 interview)")
        else:
            score += 5
            details.append("✗ No interviews yet - focus on applications")

        # Follow-up consistency (0-20 points)
        followups = sum(1 for app in applications if app.get("last_followup"))
        if followups > len(applications) * 0.5:
            score += 20
            details.append("✓ Excellent follow-up rate (>50%)")
        elif followups > 0:
            score += 10
            details.append("~ Some follow-ups - increase frequency")
        else:
            score += 0
            details.append("✗ No follow-ups yet - critical to follow up")

        # Profile completeness (0-20 points)
        profile_complete = 0
        if profile.get("name"):
            profile_complete += 5
        if profile.get("email"):
            profile_complete += 5
        if profile.get("target_role"):
            profile_complete += 5
        if profile.get("target_location"):
            profile_complete += 5

        score += profile_complete
        if profile_complete == 20:
            details.append("✓ Complete profile")
        else:
            details.append(f"~ Profile {profile_complete}% complete")

        return {
            "score": min(score, 100),
            "level": self._get_readiness_level(score),
            "details": details,
            "next_actions": self._get_next_actions(score, user_context),
        }

    def _get_readiness_level(self, score: int) -> str:
        """Get readiness level from score"""
        if score >= 80:
            return "🚀 Job Ready"
        elif score >= 60:
            return "✓ Prepared"
        elif score >= 40:
            return "△ Developing"
        elif score >= 20:
            return "✗ Starting Out"
        else:
            return "❌ Needs Work"

    def _get_next_actions(self, score: int, user_context: Dict) -> List[str]:
        """Get specific next actions based on score"""
        actions = []
        applications = user_context.get("applications", [])

        if len(applications) < 5:
            actions.append("Apply to 5+ positions this week")

        interviews = sum(1 for app in applications if app["status"] == "interview")
        if interviews == 0:
            actions.append("Focus on applications - interviews will follow")

        followups = sum(1 for app in applications if app.get("last_followup"))
        if followups == 0:
            actions.append("Send follow-up messages to 3 companies today")

        if score < 40:
            actions.append("Update LinkedIn profile - optimize for search")

        if score < 60:
            actions.append("Take 1 technical test/assessment")

        return actions

    def calculate_job_fit_score(self, job: Dict, user_context: Dict) -> int:
        """Calculate how well a job matches user profile (0-100)"""
        try:
            profile = user_context.get("profile", {})

            prompt = f"""Rate job fit on 0-100 scale.

Job: {job.get('role', 'Unknown')} at {job.get('company', 'Unknown')}
Description: {job.get('description', '')}
Salary: {job.get('salary', 'Unknown')}

User Profile:
- Target Role: {profile.get('target_role', '')}
- Skills: {', '.join(profile.get('skills', []))}
- Location: {profile.get('target_location', '')}

Consider: skill match, location, role alignment, growth opportunity.
Return ONLY the number (0-100)."""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=10,
                messages=[{"role": "user", "content": prompt}],
            )

            return int(message.content[0].text.strip())
        except Exception as e:
            print(f"Error calculating job fit: {e}")
            return 50

    def get_readiness_recommendations(self, user_context: Dict) -> Dict:
        """Get detailed recommendations to improve readiness"""
        score_result = self.calculate_career_readiness_score(user_context)

        recommendations = {
            "overall_score": score_result["score"],
            "level": score_result["level"],
            "improvements": {
                "skills": {
                    "current": len(user_context.get("profile", {}).get("skills", [])),
                    "target": 8,
                    "action": "Add 3 more skills to profile (focus on trending tech)",
                },
                "applications": {
                    "current": len(user_context.get("applications", [])),
                    "target": 20,
                    "action": "Submit 5 applications per week",
                },
                "interviews": {
                    "current": sum(
                        1
                        for app in user_context.get("applications", [])
                        if app["status"] == "interview"
                    ),
                    "target": 3,
                    "action": "Prepare with mock interviews",
                },
                "follow_ups": {
                    "current": sum(
                        1
                        for app in user_context.get("applications", [])
                        if app.get("last_followup")
                    ),
                    "target": 10,
                    "action": "Set follow-up reminders for all applications",
                },
            },
            "quick_wins": [
                "Update LinkedIn headline with target role",
                "Add 5 skills to profile",
                "Send follow-up to 3 companies",
                "Take 1 online course/certification",
                "Do 1 mock interview",
            ],
            "resources": [
                "LeetCode for technical prep",
                "Coursera for skill building",
                "LinkedIn Learning for soft skills",
                "Glassdoor for company research",
                "Blind for insider tips",
            ],
        }

        return recommendations

    def generate_readiness_report(self, user_context: Dict) -> str:
        """Generate comprehensive readiness report"""
        try:
            profile = user_context.get("profile", {})
            score_result = self.calculate_career_readiness_score(user_context)

            prompt = f"""Generate a 150-word career readiness report.

Profile: {profile.get('name', 'Candidate')}
Target Role: {profile.get('target_role', 'AI Engineer')}
Location: {profile.get('target_location', 'Bengaluru')}
Readiness Score: {score_result['score']}/100
Level: {score_result['level']}

Make it motivational but honest. Include:
- Current status assessment
- Key strengths
- Areas to improve
- Next 30-day focus"""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )

            return message.content[0].text
        except Exception as e:
            print(f"Error generating report: {e}")
            return "Unable to generate report at this time."
