import json
import os
import re
from typing import Dict, List, Optional
from openai import OpenAI


def _parse_json_array(text: str) -> list:
    """Groq's gpt-oss models sometimes wrap JSON replies in a ```json ... ```
    fence even when told not to -- strip it before parsing."""
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    parsed = json.loads(text)
    return parsed if isinstance(parsed, list) else []


class OpportunityAgent:
    """Uses Groq (openai/gpt-oss-20b) -- fast/cheap, fine for structured
    JSON output once given enough max_tokens to cover the model's internal
    reasoning overhead before the visible answer. DocumentationAgent uses
    OpenAI directly instead, since prose quality matters more there."""

    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
        self.model = "openai/gpt-oss-20b"

    def discover_jobs(self, role: str, location: str) -> List[Dict]:
        """Discover job opportunities via Groq based on role and location."""
        try:
            prompt = f"""Generate a list of 5 realistic job opportunities for someone looking for a "{role}" role in "{location}".

Return ONLY a JSON array of objects with these exact keys:
  id, company, role, description, salary, location

Example format:
[{{"id": "job_1", "company": "Acme Corp", "role": "Software Engineer", "description": "...", "salary": "30-50L", "location": "{location}"}}]

Base the companies and salaries on real market data for the role and location. Return ONLY the JSON array, no other text."""

            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )
            return _parse_json_array(response.choices[0].message.content)
        except Exception as e:
            print(f"Error discovering jobs: {e}")
            return []

    def score_opportunity(self, job: Dict, user_context: Dict) -> int:
        """Score a job opportunity using Groq"""
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

            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
            )

            score_text = response.choices[0].message.content.strip()
            match = re.search(r"\d+", score_text)
            if not match:
                raise ValueError(f"No number in response: {score_text!r}")
            return max(0, min(100, int(match.group())))
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
