from datetime import date, datetime
from typing import Dict, Optional

from db.connection import get_cursor


def _stringify(row: Dict) -> Dict:
    out = dict(row)
    for k, v in out.items():
        if isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
    return out


class UserStore:
    """Accounts for real sign-in. Backed by Postgres (users table);
    see db/migrations/002_users_auth.sql."""

    def create(self, name: str, email: str, password_hash: str) -> Dict:
        with get_cursor() as cur:
            cur.execute(
                """
                insert into users (name, email, password_hash)
                values (%s, %s, %s)
                returning *
                """,
                (name, email, password_hash),
            )
            row = cur.fetchone()
        return _stringify(row)

    def get_by_email(self, email: str) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute("select * from users where email = %s", (email,))
            row = cur.fetchone()
        return _stringify(row) if row else None

    def get_by_id(self, user_id: str) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute("select * from users where id = %s", (user_id,))
            row = cur.fetchone()
        return _stringify(row) if row else None
