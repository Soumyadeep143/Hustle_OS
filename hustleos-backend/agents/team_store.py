import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from .team_repository import TeamRepository


class TeamStore(TeamRepository):
    """Deterministic structured state for Team execution intelligence. Mirrors RecallStore's
    JSON-file persistence pattern — this is the local implementation of TeamRepository (see
    team_repository.py for the interface and why no Hydra-backed implementation exists yet)."""

    def __init__(self, store_file: str = "team_state.json"):
        self.store_file = store_file
        self.state = self._load()

    def _load(self) -> Dict:
        if os.path.exists(self.store_file):
            with open(self.store_file, "r") as f:
                return json.load(f)
        return {"organizations": {}, "teams": {}}

    def _save(self):
        with open(self.store_file, "w") as f:
            json.dump(self.state, f, indent=2)

    def _now(self) -> str:
        return datetime.now().isoformat()

    def get_team(self, team_id: str) -> Optional[Dict]:
        return self.state["teams"].get(team_id)

    def list_teams(self) -> List[Dict]:
        return list(self.state["teams"].values())

    def create_team(self, name: str, team_id: Optional[str] = None, organization_id: str = "org_default") -> Dict:
        team_id = team_id or f"team_{uuid.uuid4().hex[:8]}"
        now = self._now()
        if organization_id not in self.state["organizations"]:
            self.state["organizations"][organization_id] = {
                "id": organization_id,
                "name": "Default Organization",
                "created_at": now,
            }
        team = {
            "id": team_id,
            "organization_id": organization_id,
            "name": name,
            "members": {},
            "tasks": {},
            "projects": {},
            "features": {},
            "sprints": {},
            "timeline": [
                {"id": f"evt_{uuid.uuid4().hex[:8]}", "label": "Team created", "detail": name, "created_at": now}
            ],
            "current_recommendation": None,
            "created_at": now,
            "updated_at": now,
        }
        self.state["teams"][team_id] = team
        self._save()
        return team

    def get_or_create_team(self, team_id: str) -> Dict:
        team = self.get_team(team_id)
        if team:
            return team
        return self.create_team(name="Core Team", team_id=team_id)

    # ---- Members ----

    def add_member(
        self,
        team_id: str,
        name: str,
        role: str,
        email: Optional[str] = None,
        skills: Optional[List[str]] = None,
        capacity_hours_per_week: float = 40.0,
        working_hours: Optional[Dict] = None,
    ) -> Dict:
        team = self.get_or_create_team(team_id)
        member_id = f"member_{uuid.uuid4().hex[:8]}"
        now = self._now()
        member = {
            "id": member_id,
            "team_id": team_id,
            "name": name,
            "role": role,
            "email": email,
            "skills": skills or [],
            "capacity_hours_per_week": capacity_hours_per_week,
            "working_hours": working_hours
            or {"days": ["mon", "tue", "wed", "thu", "fri"], "start": "09:00", "end": "17:00", "timezone": "UTC"},
            "availability_exceptions": [],
            "created_at": now,
            "updated_at": now,
        }
        team["members"][member_id] = member
        team["updated_at"] = now
        self._save()
        return member

    def update_member(self, team_id: str, member_id: str, updates: Dict) -> Optional[Dict]:
        team = self.get_team(team_id)
        if not team or member_id not in team["members"]:
            return None
        member = team["members"][member_id]
        for k, v in updates.items():
            if v is not None:
                member[k] = v
        member["updated_at"] = self._now()
        team["updated_at"] = self._now()
        self._save()
        return member

    # ---- Tasks ----

    def add_task(self, team_id: str, title: str, **kwargs) -> Dict:
        team = self.get_or_create_team(team_id)
        task_id = f"task_{uuid.uuid4().hex[:8]}"
        now = self._now()
        task = {
            "id": task_id,
            "organization_id": team.get("organization_id", "org_default"),
            "team_id": team_id,
            "project_id": kwargs.get("project_id"),
            "feature_id": kwargs.get("feature_id"),
            "sprint_id": kwargs.get("sprint_id"),
            "title": title,
            "description": kwargs.get("description"),
            "assignee_id": kwargs.get("assignee_id"),
            "required_skills": kwargs.get("required_skills") or [],
            "status": "todo",
            "dependencies": kwargs.get("dependencies") or [],
            "estimate_hours": kwargs.get("estimate_hours"),
            "actual_hours": None,
            "due_at": kwargs.get("due_at"),
            "priority": kwargs.get("priority") or "normal",
            "blocked_reason": None,
            "created_at": now,
            "updated_at": now,
            "completed_at": None,
        }
        team["tasks"][task_id] = task
        team["updated_at"] = now
        self._save()
        return task

    def update_task(self, team_id: str, task_id: str, updates: Dict) -> Optional[Dict]:
        team = self.get_team(team_id)
        if not team or task_id not in team["tasks"]:
            return None
        task = team["tasks"][task_id]
        for k, v in updates.items():
            if v is not None:
                task[k] = v
        if updates.get("status") == "done" and not task.get("completed_at"):
            task["completed_at"] = self._now()
        elif updates.get("status") is not None and updates["status"] != "done":
            task["completed_at"] = None
        task["updated_at"] = self._now()
        team["updated_at"] = self._now()
        self._save()
        return task

    # ---- Features ----

    def add_feature(
        self, team_id: str, project_id: str, name: str, description: Optional[str] = None, due_at: Optional[str] = None
    ) -> Dict:
        team = self.get_or_create_team(team_id)
        feature_id = f"feature_{uuid.uuid4().hex[:8]}"
        now = self._now()
        feature = {
            "id": feature_id,
            "team_id": team_id,
            "project_id": project_id,
            "name": name,
            "description": description,
            "status": "planned",
            "due_at": due_at,
            "created_at": now,
            "updated_at": now,
        }
        team["features"][feature_id] = feature
        team["updated_at"] = now
        self._save()
        return feature

    # ---- Projects ----

    def add_project(
        self, team_id: str, name: str, description: Optional[str] = None, target_date: Optional[str] = None
    ) -> Dict:
        team = self.get_or_create_team(team_id)
        project_id = f"project_{uuid.uuid4().hex[:8]}"
        now = self._now()
        project = {
            "id": project_id,
            "organization_id": team.get("organization_id", "org_default"),
            "team_id": team_id,
            "name": name,
            "description": description,
            "status": "active",
            "target_date": target_date,
            "created_at": now,
            "updated_at": now,
        }
        team["projects"][project_id] = project
        team["updated_at"] = now
        self._save()
        return project

    # ---- Sprints ----

    def add_sprint(
        self, team_id: str, name: str, start_date: Optional[str] = None, end_date: Optional[str] = None
    ) -> Dict:
        team = self.get_or_create_team(team_id)
        sprint_id = f"sprint_{uuid.uuid4().hex[:8]}"
        now = self._now()
        sprint = {
            "id": sprint_id,
            "team_id": team_id,
            "name": name,
            "start_date": start_date,
            "end_date": end_date,
            "status": "planned",
            "created_at": now,
            "updated_at": now,
        }
        team["sprints"][sprint_id] = sprint
        team["updated_at"] = now
        self._save()
        return sprint

    # ---- Timeline ----

    def add_timeline_event(self, team_id: str, label: str, detail: Optional[str] = None) -> Optional[Dict]:
        team = self.get_team(team_id)
        if not team:
            return None
        event = {"id": f"evt_{uuid.uuid4().hex[:8]}", "label": label, "detail": detail, "created_at": self._now()}
        team["timeline"].append(event)
        team["updated_at"] = self._now()
        self._save()
        return event

    # ---- Recommendation ----

    def set_recommendation(self, team_id: str, recommendation: Dict) -> None:
        team = self.get_team(team_id)
        if not team:
            return
        team["current_recommendation"] = recommendation
        team["updated_at"] = self._now()
        self._save()

    def clear_recommendation(self, team_id: str) -> None:
        team = self.get_team(team_id)
        if not team:
            return
        team["current_recommendation"] = None
        team["updated_at"] = self._now()
        self._save()

    # ---- Action mutations (invoked by routes/team.py's ACTION_HANDLERS registry) ----

    def reassign_task(self, team_id: str, task_id: str, to_member_id: str) -> Optional[Dict]:
        team = self.get_team(team_id)
        if not team or task_id not in team["tasks"]:
            return None
        task = team["tasks"][task_id]
        task["assignee_id"] = to_member_id
        task["updated_at"] = self._now()
        team["updated_at"] = self._now()
        self._save()
        return task

    def bump_task_priority(self, team_id: str, task_id: str) -> Optional[Dict]:
        team = self.get_team(team_id)
        if not team or task_id not in team["tasks"]:
            return None
        task = team["tasks"][task_id]
        task["priority"] = "urgent"
        task["updated_at"] = self._now()
        team["updated_at"] = self._now()
        self._save()
        return task
