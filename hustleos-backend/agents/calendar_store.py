from datetime import date, datetime
from typing import Dict, Optional

from db.connection import get_cursor


def _stringify(row: Dict) -> Dict:
    out = dict(row)
    for k, v in out.items():
        if isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
    return out


class CalendarStore:
    """Google Calendar OAuth token storage (calendar_connections table).
    See db/migrations/004_scheduling.sql. One row per user — this app has no
    multi-calendar-account concept."""

    def get(self, user_id: str) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute("select * from calendar_connections where user_id = %s", (user_id,))
            row = cur.fetchone()
        return _stringify(row) if row else None

    def upsert(
        self, user_id: str, access_token: str, refresh_token: str, token_expires_at: str, scope: str = ""
    ) -> Dict:
        with get_cursor() as cur:
            cur.execute(
                """
                insert into calendar_connections (user_id, access_token, refresh_token, token_expires_at, scope)
                values (%s, %s, %s, %s, %s)
                on conflict (user_id) do update set
                  access_token = excluded.access_token,
                  refresh_token = excluded.refresh_token,
                  token_expires_at = excluded.token_expires_at,
                  scope = excluded.scope,
                  updated_at = now()
                returning *
                """,
                (user_id, access_token, refresh_token, token_expires_at, scope),
            )
            row = cur.fetchone()
        return _stringify(row)

    def update_access_token(self, user_id: str, access_token: str, token_expires_at: str) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute(
                """
                update calendar_connections set access_token = %s, token_expires_at = %s, updated_at = now()
                where user_id = %s
                returning *
                """,
                (access_token, token_expires_at, user_id),
            )
            row = cur.fetchone()
        return _stringify(row) if row else None

    def disconnect(self, user_id: str) -> bool:
        with get_cursor() as cur:
            cur.execute("delete from calendar_connections where user_id = %s", (user_id,))
            return cur.rowcount > 0
