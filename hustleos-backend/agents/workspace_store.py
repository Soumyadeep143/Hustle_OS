import json
import os
from typing import Dict


class WorkspaceStore:
    """Team/org state for the Team and Enterprise workspaces. There is no
    multi-user/auth model in this backend yet, so this holds one default
    team's data rather than being scoped per real team — the point of this
    store is to make that data server-authoritative (editable, persistent,
    servable to any client) instead of hardcoded into the frontend bundle."""

    def __init__(self, store_file: str = "workspace_state.json"):
        self.store_file = store_file
        self.state = self._load()

    def _load(self) -> Dict:
        if os.path.exists(self.store_file):
            with open(self.store_file, "r") as f:
                return json.load(f)
        return self._defaults()

    def _save(self):
        with open(self.store_file, "w") as f:
            json.dump(self.state, f, indent=2)

    def _defaults(self) -> Dict:
        state = {
            "sprint": {
                "name": "Sprint 04",
                "percent": 72,
                "done": 18,
                "total": 25,
                "blocked": [
                    {"task": "API contract review", "owner": "Aditi Rao"},
                    {"task": "Voice pipeline latency fix", "owner": "Marcus Chen"},
                ],
                "members": [
                    {"name": "Aditi Rao", "role": "Backend", "status": "Blocked"},
                    {"name": "Marcus Chen", "role": "Voice/ML", "status": "Blocked"},
                    {"name": "Priya Nair", "role": "Frontend", "status": "Available"},
                    {"name": "Jordan Lee", "role": "Design", "status": "Available"},
                    {"name": "Sam Okafor", "role": "QA", "status": "Busy"},
                ],
                "recommendation": {
                    "text": "Unblock Aditi and Marcus first — both blockers are on the critical path for the sprint demo.",
                    "actions": ["Review", "Later"],
                },
            },
            "org_health": {
                "execution_health": 91,
                "delta": "+4 pts",
                "rows": [
                    {"label": "Projects at risk", "value": "2", "tone": "red"},
                    {"label": "Critical blockers", "value": "3", "tone": "red"},
                    {"label": "Teams overloaded", "value": "1", "tone": "yellow"},
                    {"label": "Shipped this month", "value": "12", "tone": None},
                ],
                "insight_lines": [
                    {"text": "Execution health is trending up across all teams this quarter.", "tone": None},
                    {"text": "Two projects are at risk of missing their deadline this sprint.", "tone": "red"},
                    {"text": "Consider reallocating QA capacity to the platform team.", "tone": None},
                ],
            },
            "projects": [
                {"id": "p1", "name": "RECALL v2 rollout", "percent": 64, "meta": "4 of 9 milestones", "at_risk": False},
                {"id": "p2", "name": "Voice pipeline latency", "percent": 30, "meta": "2 of 6 milestones", "at_risk": True},
                {"id": "p3", "name": "Mobile redesign", "percent": 85, "meta": "6 of 7 milestones", "at_risk": False},
            ],
        }
        with open(self.store_file, "w") as f:
            json.dump(state, f, indent=2)
        return state

    def get_sprint(self, team_id: str) -> Dict:
        return self.state["sprint"]

    def get_org_health(self) -> Dict:
        return self.state["org_health"]

    def get_projects(self, team_id: str) -> list:
        return self.state["projects"]
