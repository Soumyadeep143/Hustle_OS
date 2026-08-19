import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional


class MemoryAgent:
    def __init__(self, memory_file: str = "memory.json"):
        self.memory_file = memory_file
        self.memory = self._load_memory()

    def _load_memory(self) -> Dict:
        if os.path.exists(self.memory_file):
            with open(self.memory_file, "r") as f:
                return json.load(f)
        return self._get_default_memory()

    def _get_default_memory(self) -> Dict:
        return {
            "user_profile": {
                "name": "Soumyadeep",
                "email": "soumya@example.com",
                "target_role": "AI Engineer",
                "target_location": "Bengaluru",
                "skills": ["Python", "ML", "LLMs", "FastAPI", "React"],
            },
            "applications": [
                {
                    "id": "app_1",
                    "company": "OpenAI",
                    "role": "AI Engineer Intern",
                    "applied_at": "2026-08-12",
                    "status": "applied",
                    "match_score": 94,
                    "description": "Build AI systems at scale",
                    "last_followup": None,
                    "notes": "",
                },
                {
                    "id": "app_2",
                    "company": "Anthropic",
                    "role": "ML Engineer",
                    "applied_at": "2026-08-13",
                    "status": "reviewing",
                    "match_score": 91,
                    "description": "AI safety and research",
                    "last_followup": "2026-08-15",
                    "notes": "",
                },
                {
                    "id": "app_3",
                    "company": "Mem0",
                    "role": "AI Engineer",
                    "applied_at": "2026-08-15",
                    "status": "interview",
                    "match_score": 89,
                    "description": "Memory AI infrastructure",
                    "last_followup": "2026-08-17",
                    "notes": "",
                },
            ],
        }

    def _save_memory(self):
        with open(self.memory_file, "w") as f:
            json.dump(self.memory, f, indent=2)

    def load_memory(self) -> Dict:
        return self.memory

    def save_opportunity(
        self,
        company: str,
        role: str,
        status: str,
        match_score: int,
        description: str,
    ) -> Dict:
        return self.add_application(company, role, status=status, match_score=match_score, description=description)

    def add_application(
        self,
        company: str,
        role: str,
        status: str = "applied",
        match_score: int = 0,
        description: str = "",
        applied_at: Optional[str] = None,
        last_followup: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict:
        application = {
            "id": f"app_{uuid.uuid4().hex[:8]}",
            "company": company,
            "role": role,
            "applied_at": applied_at or datetime.now().isoformat()[:10],
            "status": status,
            "match_score": match_score,
            "description": description,
            "last_followup": last_followup,
            "notes": notes or "",
        }
        self.memory["applications"].append(application)
        self._save_memory()
        return application

    def update_application(self, app_id: str, updates: Dict) -> Optional[Dict]:
        for app in self.memory["applications"]:
            if app["id"] == app_id:
                for k, v in updates.items():
                    if v is not None:
                        app[k] = v
                self._save_memory()
                return app
        return None

    def delete_application(self, app_id: str) -> bool:
        apps = self.memory["applications"]
        for i, app in enumerate(apps):
            if app["id"] == app_id:
                del apps[i]
                self._save_memory()
                return True
        return False

    def save_capture(self, kind: str, title: str, org: str, meta: Optional[Dict] = None) -> Dict:
        """Persist a Quick Capture item that isn't an application or a RECALL
        prospect (event / article / repo / note / task-adjacent captures)."""
        item = {
            "id": f"cap_{uuid.uuid4().hex[:8]}",
            "kind": kind,
            "title": title,
            "org": org,
            "created_at": datetime.now().isoformat(),
            **(meta or {}),
        }
        self.memory.setdefault("captures", []).append(item)
        self._save_memory()
        return item

    def update_profile(self, profile: Dict) -> Dict:
        self.memory["user_profile"] = {
            **self.memory.get("user_profile", {}),
            **profile,
        }
        self._save_memory()
        return self.memory["user_profile"]

    def get_applications(self) -> List[Dict]:
        apps = self.memory.get("applications", [])
        return sorted(apps, key=lambda x: x["applied_at"], reverse=True)

    def detect_insights(self) -> List[str]:
        insights = []
        today = datetime.now().date()

        for app in self.memory.get("applications", []):
            applied_date = datetime.fromisoformat(app["applied_at"]).date()
            days_since_applied = (today - applied_date).days

            last_followup = app.get("last_followup")
            if last_followup:
                followup_date = datetime.fromisoformat(last_followup).date()
                days_since_followup = (today - followup_date).days
            else:
                days_since_followup = days_since_applied

            if days_since_followup > 5 and app["status"] in ["applied", "reviewing"]:
                insights.append(
                    f"Follow up with {app['company']} ({days_since_followup} days without contact)"
                )

        if len(self.memory.get("applications", [])) < 5:
            insights.append("Increase application rate to 5+ per week")

        interviews = [a for a in self.memory.get("applications", []) if a["status"] == "interview"]
        if interviews:
            insights.append(f"Prepare for {len(interviews)} upcoming interview(s)")

        return insights[:3] if insights else ["Stay focused on your job search goals"]

    def get_user_context(self) -> Dict:
        return {
            "profile": self.memory["user_profile"],
            "applications": self.get_applications(),
            "total_applications": len(self.memory["applications"]),
            "insights": self.detect_insights(),
        }
