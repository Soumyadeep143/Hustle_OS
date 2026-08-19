import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional


class TaskStore:
    """Deterministic structured state for user tasks. Mirrors RecallStore's
    JSON-file persistence pattern — no DB in this backend yet."""

    def __init__(self, store_file: str = "tasks_state.json"):
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

    def has_tasks(self, user_id: str) -> bool:
        return bool(self.state["users"].get(user_id))

    def list_tasks(self, user_id: str) -> List[Dict]:
        return list(self.state["users"].get(user_id, {}).values())

    def create_task(
        self,
        user_id: str,
        title: str,
        due_at: Optional[str] = None,
        priority: str = "normal",
    ) -> Dict:
        task_id = f"task_{uuid.uuid4().hex[:8]}"
        task = {
            "id": task_id,
            "title": title,
            "meta": due_at or "Today",
            "due_at": due_at,
            "priority": priority,
            "done": False,
            "created_at": self._now(),
        }
        self.state["users"].setdefault(user_id, {})[task_id] = task
        self._save()
        return task

    def seed_tasks(self, user_id: str, titles: List[str]) -> List[Dict]:
        """One-time seed from the day's planner priorities so a new user's
        FOCUS list isn't empty. No-ops if this user already has any tasks."""
        if self.has_tasks(user_id):
            return self.list_tasks(user_id)
        return [
            self.create_task(user_id, title, priority="high" if i == 0 else "normal")
            for i, title in enumerate(titles)
        ]

    def get_task(self, task_id: str) -> Optional[Dict]:
        for tasks in self.state["users"].values():
            if task_id in tasks:
                return tasks[task_id]
        return None

    def set_done(self, task_id: str, done: bool) -> Optional[Dict]:
        for tasks in self.state["users"].values():
            if task_id in tasks:
                task = tasks[task_id]
                task["done"] = done
                task["meta"] = "Completed" if done else (task["due_at"] or "Today")
                self._save()
                return task
        return None
