from datetime import date, datetime
from typing import Dict, List, Optional

from db.connection import get_cursor


def _stringify(row: Dict) -> Dict:
    """psycopg2 returns native date/datetime objects for date/timestamptz
    columns; the API layer (Pydantic str fields, JSON) expects strings."""
    out = dict(row)
    for k, v in out.items():
        if isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
    return out


class RecallStore:
    """User-scoped, Postgres-backed store for RECALL: user-captured items
    (recall_items) and their real event timeline (recall_timeline_events).
    Replaces the old JSON-file prospect/company sales-CRM model entirely —
    every row here is created by an explicit user capture, never seeded."""

    # Columns writable via create/update — kept as an explicit allowlist so
    # a stray dict key (e.g. from a Pydantic model with extra fields) can
    # never reach raw SQL.
    COLUMNS = [
        "url", "source", "title", "description", "notes", "ai_summary",
        "category", "subcategory", "tags", "status", "priority",
        "company", "person", "location", "event_date",
        "follow_up_at", "follow_up_note",
    ]

    def __init__(self, user_id: str):
        self.user_id = user_id

    def create_item(self, fields: Dict) -> Dict:
        values = {c: fields.get(c) for c in self.COLUMNS}
        columns_sql = ", ".join(["user_id"] + self.COLUMNS)
        placeholders = ", ".join(["%s"] * (len(self.COLUMNS) + 1))
        with get_cursor() as cur:
            cur.execute(
                f"insert into recall_items ({columns_sql}) values ({placeholders}) returning *",
                (self.user_id, *[values[c] for c in self.COLUMNS]),
            )
            row = _stringify(cur.fetchone())
        return row

    def get_item(self, item_id: str) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute(
                "select * from recall_items where id = %s and user_id = %s",
                (item_id, self.user_id),
            )
            row = cur.fetchone()
        return _stringify(row) if row else None

    def list_items(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        source: Optional[str] = None,
    ) -> List[Dict]:
        query = "select * from recall_items where user_id = %s"
        params: List = [self.user_id]
        if status:
            query += " and status = %s"
            params.append(status)
        if category:
            query += " and category = %s"
            params.append(category)
        if source:
            query += " and source = %s"
            params.append(source)
        query += " order by created_at desc"
        with get_cursor() as cur:
            cur.execute(query, params)
            rows = [_stringify(r) for r in cur.fetchall()]
        return rows

    def update_item(self, item_id: str, fields: Dict) -> Optional[Dict]:
        """Partial update. Values may be explicitly None (clearing a field)
        — callers control which keys are present, not this method."""
        editable = {k: v for k, v in fields.items() if k in self.COLUMNS + ["related_application_id"]}
        if not editable:
            return self.get_item(item_id)
        set_clause = ", ".join(f"{k} = %s" for k in editable)
        with get_cursor() as cur:
            cur.execute(
                f"""
                update recall_items set {set_clause}, updated_at = now()
                where id = %s and user_id = %s
                returning *
                """,
                (*editable.values(), item_id, self.user_id),
            )
            row = cur.fetchone()
        return _stringify(row) if row else None

    def set_follow_up(self, item_id: str, follow_up_at: Optional[str], follow_up_note: Optional[str]) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute(
                """
                update recall_items set follow_up_at = %s, follow_up_note = %s, updated_at = now()
                where id = %s and user_id = %s
                returning *
                """,
                (follow_up_at, follow_up_note, item_id, self.user_id),
            )
            row = cur.fetchone()
        return _stringify(row) if row else None

    def add_timeline_event(self, item_id: str, event_type: str, label: str, detail: Optional[str] = None) -> Dict:
        with get_cursor() as cur:
            cur.execute(
                """
                insert into recall_timeline_events (recall_item_id, user_id, event_type, label, detail)
                values (%s, %s, %s, %s, %s)
                returning *
                """,
                (item_id, self.user_id, event_type, label, detail),
            )
            row = _stringify(cur.fetchone())
        return row

    def list_timeline(self, item_id: str) -> List[Dict]:
        with get_cursor() as cur:
            cur.execute(
                """
                select * from recall_timeline_events
                where recall_item_id = %s and user_id = %s
                order by created_at asc
                """,
                (item_id, self.user_id),
            )
            return [_stringify(r) for r in cur.fetchall()]
