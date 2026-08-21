import json
import os
from typing import Dict, List, Optional
from anthropic import Anthropic


class OpportunityAgent:
    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-3-5-sonnet-20241022"

    def discover_jobs(self, role: str, location: str) -> List[Dict]:
        """Discover job opportunities via Claude based on role and location."""
        try:
            prompt = f"""Generate a list of 5 realistic job opportunities for someone looking for a "{role}" role in "{location}".

Return ONLY a JSON array of objects with these exact keys:
  id, company, role, description, salary, location

Example format:
[{{"id": "job_1", "company": "Acme Corp", "role": "Software Engineer", "description": "...", "salary": "30-50L", "location": "{location}"}}]

Base the companies and salaries on real market data for the role and location. Return ONLY the JSON array, no other text."""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}],
            )
            jobs = json.loads(message.content[0].text)
            return jobs if isinstance(jobs, list) else []
        except Exception as e:
            print(f"Error discovering jobs: {e}")
            return []

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
