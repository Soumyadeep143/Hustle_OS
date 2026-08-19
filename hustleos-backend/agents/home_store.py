from datetime import date, datetime
from typing import Dict, List, Optional

from db.connection import get_cursor


def _stringify(row: Dict) -> Dict:
    out = dict(row)
    for k, v in out.items():
        if isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
    return out


class HomeStore:
    """Deterministic structured state for the Personal Home screen's TODAY timeline,
    SIGNALS, and AI Brief headline. Backed by Postgres (timeline_entries / signals /
    briefs / seed_flags tables) instead of home_state.json, keyed by user_id."""

    # ---- Timeline ----

    def list_timeline(self, user_id: str) -> List[Dict]:
        with get_cursor() as cur:
            cur.execute(
                "select * from timeline_entries where user_id = %s order by created_at",
                (user_id,),
            )
            return [_stringify(r) for r in cur.fetchall()]

    def has_timeline(self, user_id: str) -> bool:
        with get_cursor() as cur:
            cur.execute(
                "select 1 from seed_flags where user_id = %s and flag_name = 'timeline'",
                (user_id,),
            )
            return cur.fetchone() is not None

    def add_timeline_entry(
        self, user_id: str, title: str, at: str = "Today", subtitle: Optional[str] = None,
        tone: str = "neutral", flag: Optional[str] = None,
    ) -> Dict:
        with get_cursor() as cur:
            cur.execute(
                """
                insert into timeline_entries (user_id, at, title, subtitle, tone, flag)
                values (%s, %s, %s, %s, %s, %s)
                returning *
                """,
                (user_id, at, title, subtitle, tone, flag),
            )
            row = cur.fetchone()
        return _stringify(row)

    def seed_timeline(self, user_id: str, entries: List[Dict]) -> List[Dict]:
        if self.has_timeline(user_id):
            return self.list_timeline(user_id)
        created = [
            self.add_timeline_entry(
                user_id, e["title"], at=e.get("at", "Today"), subtitle=e.get("subtitle"),
                tone=e.get("tone", "neutral"), flag=e.get("flag"),
            )
            for e in entries
        ]
        with get_cursor() as cur:
            cur.execute(
                """
                insert into seed_flags (user_id, flag_name) values (%s, 'timeline')
                on conflict (user_id, flag_name) do nothing
                """,
                (user_id,),
            )
        return created

    def update_timeline_entry(self, user_id: str, entry_id: str, updates: Dict) -> Optional[Dict]:
        fields = {k: v for k, v in updates.items() if v is not None}
        set_clause = ", ".join(f"{k} = %s" for k in fields) + ", " if fields else ""
        with get_cursor() as cur:
            cur.execute(
                f"""
                update timeline_entries set {set_clause}updated_at = now()
                where id = %s and user_id = %s
                returning *
                """,
                (*fields.values(), entry_id, user_id),
            )
            row = cur.fetchone()
        return _stringify(row) if row else None

    def delete_timeline_entry(self, user_id: str, entry_id: str) -> bool:
        with get_cursor() as cur:
            cur.execute(
                "delete from timeline_entries where id = %s and user_id = %s",
                (entry_id, user_id),
            )
            return cur.rowcount > 0

    # ---- Signals ----

    def list_signals(self, user_id: str) -> List[Dict]:
        with get_cursor() as cur:
            cur.execute(
                "select * from signals where user_id = %s order by created_at",
                (user_id,),
            )
            return [_stringify(r) for r in cur.fetchall()]

    def has_signals(self, user_id: str) -> bool:
        with get_cursor() as cur:
            cur.execute(
                "select 1 from seed_flags where user_id = %s and flag_name = 'signals'",
                (user_id,),
            )
            return cur.fetchone() is not None

    def add_signal(self, user_id: str, text: str, tag: str = "RECOMMENDATION", tone: str = "yellow") -> Dict:
        with get_cursor() as cur:
            cur.execute(
                """
                insert into signals (user_id, text, tag, tone)
                values (%s, %s, %s, %s)
                returning *
                """,
                (user_id, text, tag, tone),
            )
            row = cur.fetchone()
        return _stringify(row)

    def seed_signals(self, user_id: str, signals: List[Dict]) -> List[Dict]:
        if self.has_signals(user_id):
            return self.list_signals(user_id)
        created = [
            self.add_signal(user_id, s["text"], tag=s.get("tag", "RECOMMENDATION"), tone=s.get("tone", "yellow"))
            for s in signals
        ]
        with get_cursor() as cur:
            cur.execute(
                """
                insert into seed_flags (user_id, flag_name) values (%s, 'signals')
                on conflict (user_id, flag_name) do nothing
                """,
                (user_id,),
            )
        return created

    def update_signal(self, user_id: str, signal_id: str, updates: Dict) -> Optional[Dict]:
        fields = {k: v for k, v in updates.items() if v is not None}
        set_clause = ", ".join(f"{k} = %s" for k in fields) + ", " if fields else ""
        with get_cursor() as cur:
            cur.execute(
                f"""
                update signals set {set_clause}updated_at = now()
                where id = %s and user_id = %s
                returning *
                """,
                (*fields.values(), signal_id, user_id),
            )
            row = cur.fetchone()
        return _stringify(row) if row else None

    def delete_signal(self, user_id: str, signal_id: str) -> bool:
        with get_cursor() as cur:
            cur.execute(
                "delete from signals where id = %s and user_id = %s",
                (signal_id, user_id),
            )
            return cur.rowcount > 0

    # ---- Brief ----

    def get_brief(self, user_id: str) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute("select * from briefs where user_id = %s", (user_id,))
            row = cur.fetchone()
        return _stringify(row) if row else None

    def set_brief(self, user_id: str, headline: str) -> Dict:
        with get_cursor() as cur:
            cur.execute(
                """
                insert into briefs (user_id, headline)
                values (%s, %s)
                on conflict (user_id) do update set headline = excluded.headline, updated_at = now()
                returning *
                """,
                (user_id, headline),
            )
            row = cur.fetchone()
        return _stringify(row)
