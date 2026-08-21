import json
import os
from typing import Dict


class WorkspaceStore:
    """Org-health state for the Enterprise workspace. The Team workspace's sprint/member/
    project data now lives in TeamStore (agents/team_store.py) with real capacity/dependency
    modeling — this store only still serves /api/org/health, which stays a fixture until
    Enterprise (multi-team rollup) is built as its own phase."""

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
            "org_health": {
                "execution_health": 0,
                "delta": "",
                "rows": [],
                "insight_lines": [],
            },
        }
        with open(self.store_file, "w") as f:
            json.dump(state, f, indent=2)
        return state

    def get_org_health(self) -> Dict:
        return self.state["org_health"]
