import os
from typing import Dict, List, Optional
from anthropic import Anthropic


class OpportunityAgent:
    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-3-5-sonnet-20241022"

    def discover_jobs(self, role: str, location: str) -> List[Dict]:
        """Return mock job list matching criteria"""
        jobs = [
            {
                "id": "job_1",
                "company": "OpenAI",
                "role": "ML Engineer",
                "description": "Build cutting-edge AI systems at scale. Work on core models and products.",
                "salary": "50-70L",
                "location": location,
            },
            {
                "id": "job_2",
                "company": "Anthropic",
                "role": "AI Research Engineer",
                "description": "Research and develop safe, interpretable AI systems.",
                "salary": "55-75L",
                "location": location,
            },
            {
                "id": "job_3",
                "company": "Mem0",
                "role": "Senior ML Engineer",
                "description": "Build memory AI infrastructure for the next generation of apps.",
                "salary": "40-60L",
                "location": location,
            },
            {
                "id": "job_4",
                "company": "Google DeepMind",
                "role": "AI Engineer",
                "description": "Work on fundamental AI research and applications.",
                "salary": "60-80L",
                "location": location,
            },
            {
                "id": "job_5",
                "company": "Meta AI",
                "role": "Machine Learning Engineer",
                "description": "Build AI systems used by billions of people.",
                "salary": "52-72L",
                "location": location,
            },
        ]
        return jobs

    def score_opportunity(self, job: Dict, user_context: Dict) -> int:
        """Score a job opportunity using Claude API"""
        try:
            profile = user_context.get("profile", {})
            skills = ", ".join(profile.get("skills", []))

            prompt = f"""Score this job opportunity for the user on a 0-100 scale.

Job: {job['role']} at {job['company']}
Description: {job['description']}
Salary: {job['salary']}
Location: {job['location']}

User Profile:
- Target Role: {profile.get('target_role', 'N/A')}
- Location: {profile.get('target_location', 'N/A')}
- Skills: {skills}

Return ONLY the number (0-100). No explanation."""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=10,
                messages=[{"role": "user", "content": prompt}],
            )

            score_text = message.content[0].text.strip()
            return int(score_text)
        except Exception as e:
            print(f"Error scoring opportunity: {e}")
            return 50

    def rank_opportunities(self, jobs: List[Dict], user_context: Dict) -> List[Dict]:
        """Score and rank opportunities"""
        scored_jobs = []
        for job in jobs:
            score = self.score_opportunity(job, user_context)
            job_with_score = {**job, "score": score}
            scored_jobs.append(job_with_score)

        return sorted(scored_jobs, key=lambda x: x["score"], reverse=True)
