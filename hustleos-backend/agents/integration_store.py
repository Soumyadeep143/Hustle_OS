import json
import os
from datetime import datetime
from typing import Dict, List, Optional


class IntegrationStore:
    """Connection state for external integrations. No OAuth apps are
    registered for this backend (no client id/secret for Gmail, LinkedIn,
    GitHub, Notion), so 'connect' flips a persisted flag instead of
    performing a real OAuth handshake — the same "local stand-in" pattern
    already used by memory_providers/execution_providers when no external
    credentials are configured."""

    def __init__(self, store_file: str = "integrations_state.json"):
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
        now = datetime.now().isoformat()
        state = {
            "integrations": [
                {"key": "gmail", "name": "Gmail", "connected": True, "last_sync": now},
                {"key": "calendar", "name": "Calendar", "connected": True, "last_sync": now},
                {"key": "linkedin", "name": "LinkedIn", "connected": True, "last_sync": now},
                {"key": "github", "name": "GitHub", "connected": True, "last_sync": now},
                {"key": "notion", "name": "Notion", "connected": False, "last_sync": None},
            ]
        }
        with open(self.store_file, "w") as f:
            json.dump(state, f, indent=2)
        return state

    def list_integrations(self) -> List[Dict]:
        return self.state["integrations"]

    def connect(self, key: str) -> Optional[Dict]:
        for integration in self.state["integrations"]:
            if integration["key"] == key:
                integration["connected"] = True
                integration["last_sync"] = datetime.now().isoformat()
                self._save()
                return integration
        return None
