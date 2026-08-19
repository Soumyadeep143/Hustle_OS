import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional


class HomeStore:
    """Deterministic structured state for the Personal Home screen's TODAY timeline,
    SIGNALS, and AI Brief headline — these used to be recomputed on every load from
    dashboard/memory (src/lib/adapters.ts) with no way to add/edit/delete an entry.
    Mirrors TaskStore's JSON-file persistence pattern, keyed by user_id."""

    def __init__(self, store_file: str = "home_state.json"):
        self.store_file = store_file
        self.state = self._load()

    def _load(self) -> Dict:
        if os.path.exists(self.store_file):
            with open(self.store_file, "r") as f:
                return json.load(f)
        return {"users": {}}

    def _save(self):
        with open(self.store_file, "w") as f:
            json.dump(self.state, f, indent=2)

    def _now(self) -> str:
        return datetime.now().isoformat()

    def _user(self, user_id: str) -> Dict:
        return self.state["users"].setdefault(
            user_id, {"timeline": {}, "signals": {}, "brief": None, "timeline_seeded": False, "signals_seeded": False}
        )

    # ---- Timeline ----

    def list_timeline(self, user_id: str) -> List[Dict]:
        return list(self._user(user_id)["timeline"].values())

    def has_timeline(self, user_id: str) -> bool:
        return self._user(user_id)["timeline_seeded"]

    def add_timeline_entry(
        self, user_id: str, title: str, at: str = "Today", subtitle: Optional[str] = None,
        tone: str = "neutral", flag: Optional[str] = None,
    ) -> Dict:
        user = self._user(user_id)
        entry_id = f"tl_{uuid.uuid4().hex[:8]}"
        now = self._now()
        entry = {
            "id": entry_id, "user_id": user_id, "at": at, "title": title, "subtitle": subtitle,
            "tone": tone, "flag": flag, "created_at": now, "updated_at": now,
        }
        user["timeline"][entry_id] = entry
        self._save()
        return entry

    def seed_timeline(self, user_id: str, entries: List[Dict]) -> List[Dict]:
        user = self._user(user_id)
        if user["timeline_seeded"]:
            return list(user["timeline"].values())
        created = [
            self.add_timeline_entry(
                user_id, e["title"], at=e.get("at", "Today"), subtitle=e.get("subtitle"),
                tone=e.get("tone", "neutral"), flag=e.get("flag"),
            )
            for e in entries
        ]
        self._user(user_id)["timeline_seeded"] = True
        self._save()
        return created

    def update_timeline_entry(self, user_id: str, entry_id: str, updates: Dict) -> Optional[Dict]:
        user = self._user(user_id)
        if entry_id not in user["timeline"]:
            return None
        entry = user["timeline"][entry_id]
        for k, v in updates.items():
            if v is not None:
                entry[k] = v
        entry["updated_at"] = self._now()
        self._save()
        return entry

    def delete_timeline_entry(self, user_id: str, entry_id: str) -> bool:
        user = self._user(user_id)
        if entry_id not in user["timeline"]:
            return False
        del user["timeline"][entry_id]
        self._save()
        return True

    # ---- Signals ----

    def list_signals(self, user_id: str) -> List[Dict]:
        return list(self._user(user_id)["signals"].values())

    def has_signals(self, user_id: str) -> bool:
        return self._user(user_id)["signals_seeded"]

    def add_signal(self, user_id: str, text: str, tag: str = "RECOMMENDATION", tone: str = "yellow") -> Dict:
        user = self._user(user_id)
        signal_id = f"sig_{uuid.uuid4().hex[:8]}"
        now = self._now()
        signal = {"id": signal_id, "user_id": user_id, "text": text, "tag": tag, "tone": tone, "created_at": now, "updated_at": now}
        user["signals"][signal_id] = signal
        self._save()
        return signal

    def seed_signals(self, user_id: str, signals: List[Dict]) -> List[Dict]:
        user = self._user(user_id)
        if user["signals_seeded"]:
            return list(user["signals"].values())
        created = [self.add_signal(user_id, s["text"], tag=s.get("tag", "RECOMMENDATION"), tone=s.get("tone", "yellow")) for s in signals]
        self._user(user_id)["signals_seeded"] = True
        self._save()
        return created

    def update_signal(self, user_id: str, signal_id: str, updates: Dict) -> Optional[Dict]:
        user = self._user(user_id)
        if signal_id not in user["signals"]:
            return None
        signal = user["signals"][signal_id]
        for k, v in updates.items():
            if v is not None:
                signal[k] = v
        signal["updated_at"] = self._now()
        self._save()
        return signal

    def delete_signal(self, user_id: str, signal_id: str) -> bool:
        user = self._user(user_id)
        if signal_id not in user["signals"]:
            return False
        del user["signals"][signal_id]
        self._save()
        return True

    # ---- Brief ----

    def get_brief(self, user_id: str) -> Optional[Dict]:
        return self._user(user_id)["brief"]

    def set_brief(self, user_id: str, headline: str) -> Dict:
        user = self._user(user_id)
        brief = {"user_id": user_id, "headline": headline, "updated_at": self._now()}
        user["brief"] = brief
        self._save()
        return brief
