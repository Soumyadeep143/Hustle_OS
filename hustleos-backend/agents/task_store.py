from datetime import date, datetime
from typing import Dict, List, Optional

from db.connection import get_cursor


def _stringify(row: Dict) -> Dict:
    out = dict(row)
    for k, v in out.items():
        if isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
    return out


class TaskStore:
    """Deterministic structured state for user tasks. Backed by Postgres
    (tasks + seed_flags tables) instead of tasks_state.json."""

    def has_tasks(self, user_id: str) -> bool:
        with get_cursor() as cur:
            cur.execute(
                "select 1 from seed_flags where user_id = %s and flag_name = 'tasks'",
                (user_id,),
            )
            return cur.fetchone() is not None

    def list_tasks(self, user_id: str) -> List[Dict]:
        with get_cursor() as cur:
            cur.execute(
                "select * from tasks where user_id = %s order by created_at",
                (user_id,),
            )
            return [_stringify(r) for r in cur.fetchall()]

    def create_task(
        self,
        user_id: str,
        title: str,
        due_at: Optional[str] = None,
        priority: str = "normal",
    ) -> Dict:
        with get_cursor() as cur:
            cur.execute(
                """
                insert into tasks (user_id, title, meta, due_at, priority)
                values (%s, %s, %s, %s, %s)
                returning *
                """,
                (user_id, title, due_at or "Today", due_at, priority),
            )
            row = cur.fetchone()
        return _stringify(row)

    def seed_tasks(self, user_id: str, titles: List[str]) -> List[Dict]:
        """One-time seed from the day's planner priorities so a new user's
        FOCUS list isn't empty. No-ops if this user has already been seeded."""
        if self.has_tasks(user_id):
            return self.list_tasks(user_id)
        created = [
            self.create_task(user_id, title, priority="high" if i == 0 else "normal")
            for i, title in enumerate(titles)
        ]
        with get_cursor() as cur:
            cur.execute(
                """
                insert into seed_flags (user_id, flag_name) values (%s, 'tasks')
                on conflict (user_id, flag_name) do nothing
                """,
                (user_id,),
            )
        return created

    def get_task(self, task_id: str) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute("select * from tasks where id = %s", (task_id,))
            row = cur.fetchone()
        return _stringify(row) if row else None

    def set_done(self, task_id: str, done: bool) -> Optional[Dict]:
        task = self.get_task(task_id)
        if not task:
            return None
        meta = "Completed" if done else (task["due_at"] or "Today")
        with get_cursor() as cur:
            cur.execute(
                """
                update tasks set done = %s, meta = %s, updated_at = now()
                where id = %s
                returning *
                """,
                (done, meta, task_id),
            )
            row = cur.fetchone()
        return _stringify(row) if row else None
