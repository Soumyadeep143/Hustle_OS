import json
from anthropic import Anthropic
from typing import Dict, List, Optional


class OutreachAgent:
    """Generate personalized outreach sequences for job applications"""

    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-3-5-sonnet-20241022"
        self.dream_companies_db = self._get_dream_companies_db()

    def _get_dream_companies_db(self) -> Dict:
        """Database of companies organized by role/location"""
        return {
            "AI Engineer": {
                "Bengaluru": [
                    {
                        "name": "OpenAI",
                        "size": "1000-5000",
                        "stage": "Growth",
                        "hiring": True,
                        "salary_range": "50-70L",
                    },
                    {
                        "name": "Anthropic",
                        "size": "500-1000",
                        "stage": "Growth",
                        "hiring": True,
                        "salary_range": "55-75L",
                    },
                    {
                        "name": "Mem0",
                        "size": "50-100",
                        "stage": "Early Growth",
                        "hiring": True,
                        "salary_range": "40-60L",
                    },
                    {
                        "name": "Google DeepMind",
                        "size": "500+",
                        "stage": "Mature",
                        "hiring": True,
                        "salary_range": "60-80L",
                    },
                    {
                        "name": "Meta AI",
                        "size": "5000+",
                        "stage": "Mature",
                        "hiring": True,
                        "salary_range": "52-72L",
                    },
                ],
                "San Francisco": [
                    {"name": "OpenAI", "hiring": True, "salary_range": "$150-200k"},
                    {"name": "Anthropic", "hiring": True, "salary_range": "$160-220k"},
                    {"name": "xAI", "hiring": True, "salary_range": "$140-180k"},
                ],
            },
            "ML Engineer": {
                "Bengaluru": [
                    {"name": "Google India", "hiring": True, "salary_range": "45-65L"},
                    {"name": "Amazon ML", "hiring": True, "salary_range": "48-68L"},
                    {"name": "Microsoft Research", "hiring": True, "salary_range": "50-70L"},
                ],
            },
        }

    def find_dream_companies(self, role: str, location: str) -> List[Dict]:
        """Find top companies for the given role and location"""
        try:
            companies = self.dream_companies_db.get(role, {}).get(location, [])
            if companies:
                return sorted(companies, key=lambda x: x.get("salary_range", ""), reverse=True)
            return self._get_default_companies(role, location)
        except Exception as e:
            print(f"Error finding dream companies: {e}")
            return []

    def _get_default_companies(self, role: str, location: str) -> List[Dict]:
        """Return default companies when not in database"""
        return [
            {
                "name": "Startup AI",
                "size": "100-500",
                "stage": "Growth",
                "hiring": True,
                "location": location,
            },
            {
                "name": "Tech Corp",
                "size": "1000+",
                "stage": "Mature",
                "hiring": True,
                "location": location,
            },
        ]

    def find_hiring_managers(self, company: str, role: str) -> List[Dict]:
        """Find likely hiring managers for the company/role combo"""
        hiring_managers = {
            "OpenAI": [
                {"name": "John Schulman", "title": "VP Research", "focus": "AI Engineering"},
                {"name": "Dario Amodei", "title": "CEO", "focus": "AI Safety"},
                {"name": "Liane Moriarty", "title": "Head of Talent", "focus": "Recruitment"},
            ],
            "Anthropic": [
                {"name": "Dario Amodei", "title": "CEO", "focus": "AI Research"},
                {"name": "Daniela Amodei", "title": "President", "focus": "Operations"},
                {"name": "Chris Olah", "title": "Research Scientist", "focus": "Interpretability"},
            ],
            "Mem0": [
                {"name": "Ankush Gola", "title": "Founder", "focus": "Product"},
                {
                    "name": "Karan Anand",
                    "title": "Technical Lead",
                    "focus": "Engineering",
                },
            ],
        }

        return hiring_managers.get(company, self._get_default_managers(company))

    def _get_default_managers(self, company: str) -> List[Dict]:
        """Return default hiring managers"""
        return [
            {
                "name": "Engineering Lead",
                "title": "Head of Engineering",
                "focus": "Hiring",
            },
            {
                "name": "Talent Manager",
                "title": "Head of Talent",
                "focus": "Recruitment",
            },
        ]

    def generate_outreach_sequence(
        self, company: str, role: str, user_context: Dict
    ) -> List[Dict]:
        """Generate 5-email outreach sequence"""
        try:
            sequence = []
            profile = user_context.get("profile", {})
            skills = ", ".join(profile.get("skills", []))

            emails = [
                {
                    "day": 0,
                    "type": "introduction",
                    "subject": f"AI enthusiast interested in {role} at {company}",
                },
                {
                    "day": 3,
                    "type": "value_prop",
                    "subject": f"How I can contribute to {company}'s AI mission",
                },
                {
                    "day": 7,
                    "type": "case_study",
                    "subject": "Case study: ML project results",
                },
                {
                    "day": 10,
                    "type": "connection",
                    "subject": "Mutual connection - quick chat?",
                },
                {
                    "day": 14,
                    "type": "final",
                    "subject": "Excited about {role} opportunity",
                },
            ]

            for email in emails:
                prompt = f"""Write a personalized professional email (3-4 sentences) for {email['type']} stage.

Context:
- Company: {company}
- Role: {role}
- Candidate: {profile.get('name', 'Candidate')}
- Skills: {skills}
- Day: {email['day']} (follow-up sequence)
- Subject: {email['subject']}

Email should be:
- Concise (under 100 words)
- Personalized
- Action-oriented
- Professional but authentic

Return ONLY the email body, no subject or metadata."""

                try:
                    message = self.client.messages.create(
                        model=self.model,
                        max_tokens=300,
                        messages=[{"role": "user", "content": prompt}],
                    )
                    email["body"] = message.content[0].text
                except Exception as e:
                    email["body"] = f"Email body generation failed: {str(e)}"

                sequence.append(email)

            return sequence
        except Exception as e:
            print(f"Error generating outreach sequence: {e}")
            return []

    def find_job_fit_signals(self, company: Dict, user_context: Dict) -> List[str]:
        """Identify signals that show job fit"""
        signals = []
        profile = user_context.get("profile", {})
        skills = profile.get("skills", [])

        if "LLMs" in skills or "AI" in skills:
            signals.append("Strong AI/LLM background matches company focus")

        if company.get("stage") == "Growth" and "FastAPI" in skills:
            signals.append("Backend skills match growth-stage company needs")

        if company.get("size", "").startswith("50-"):
            signals.append("Experience fits early-stage startup environment")

        if company.get("hiring"):
            signals.append("Company actively hiring for this role")

        if company.get("salary_range"):
            signals.append(f"Competitive salary: {company['salary_range']}")

        return signals if signals else ["Good fit for this opportunity"]

    def calculate_reach_score(self, company: Dict, user_context: Dict) -> int:
        """Calculate likelihood of reaching hiring manager (0-100)"""
        score = 50

        profile = user_context.get("profile", {})
        applications = user_context.get("applications", [])

        if len(applications) > 5:
            score += 10

        skills = profile.get("skills", [])
        if any(skill in ["Python", "ML", "LLMs"] for skill in skills):
            score += 15

        if company.get("hiring"):
            score += 10

        if company.get("stage") in ["Growth", "Early Growth"]:
            score += 10

        return min(score, 100)
