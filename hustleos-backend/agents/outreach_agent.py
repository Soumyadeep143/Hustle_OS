import json
import os
from openai import OpenAI
from typing import Dict, List, Optional


class OutreachAgent:
    """Generate personalized outreach sequences for job applications"""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"

    def find_dream_companies(self, role: str, location: str) -> List[Dict]:
        """Find real companies likely to be hiring for a role/location,
        generated live from the model's real-world knowledge — no
        hardcoded company list. Returns [] if generation fails; there is
        no static fallback, so a failure surfaces as "no results" rather
        than presenting stale or invented data as current."""
        try:
            prompt = f"""List 5 real, currently-operating companies that would realistically be hiring for a "{role}" role in "{location}" right now.

Return ONLY a JSON array of objects with these exact keys:
  name, size, stage, hiring, salary_range

- name: the real company's actual name
- size: approximate employee headcount range, e.g. "500-1000"
- stage: one of "Early Growth", "Growth", "Mature"
- hiring: true/false — your best real-world estimate of whether they're
  actively hiring for this kind of role right now
- salary_range: a realistic market salary range for this role/location,
  in local currency notation

Base this on real market knowledge, not invented figures. Return ONLY the JSON array, no other text."""

            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}],
            )
            companies = json.loads(response.choices[0].message.content)
            return companies if isinstance(companies, list) else []
        except Exception as e:
            print(f"Error finding dream companies: {e}")
            return []

    def find_hiring_managers(self, company: str, role: str) -> List[Dict]:
        """Identify realistic hiring-contact roles at a real company for a
        given role, generated live from the model's real-world knowledge
        of how hiring is typically structured there. Deliberately never
        returns a real named individual — we don't scrape or guess actual
        employees' identities for outreach; only role/title descriptors.
        Returns [] if generation fails, with no static fallback list."""
        try:
            prompt = f"""For the real company "{company}", suggest 2-3 hiring-contact roles relevant to a "{role}" position there.

Return ONLY a JSON array of objects with these exact keys:
  name, title, focus

- name: a ROLE DESCRIPTOR, never a real person's name — e.g. "Engineering Hiring Manager"
- title: their likely job title, e.g. "Head of Engineering"
- focus: what they'd care about when evaluating a candidate

Return ONLY the JSON array, no other text."""

            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )
            managers = json.loads(response.choices[0].message.content)
            return managers if isinstance(managers, list) else []
        except Exception as e:
            print(f"Error finding hiring managers: {e}")
            return []

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
                    response = self.client.chat.completions.create(
                        model=self.model,
                        max_tokens=300,
                        messages=[{"role": "user", "content": prompt}],
                    )
                    email["body"] = response.choices[0].message.content
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
