from datetime import date, datetime, timezone
from typing import Dict, Optional

from db.connection import get_cursor

# A pending slot older than this is abandoned rather than resumed — avoids
# resurrecting a half-finished "interview tomorrow" from hours ago just
# because the next message happens to contain a number.
_MAX_PENDING_AGE_SECONDS = 10 * 60


def _stringify(row: Dict) -> Dict:
    out = dict(row)
    for k, v in out.items():
        if isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
    return out


class ConversationStateStore:
    """Short-term, per-user conversational working memory (spec: 'the AI
    must understand incomplete information' — the follow-up answer belongs
    to the question just asked, not a fresh unrelated message). Postgres-
    backed, one pending slot per user; expires itself on read rather than
    needing a cleanup job."""

    def get_pending(self, user_id: str) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute(
                "select * from conversation_state where user_id = %s and pending_type is not null",
                (user_id,),
            )
            row = cur.fetchone()
        if not row:
            return None
        row = _stringify(row)
        updated = datetime.fromisoformat(row["updated_at"])
        if updated.tzinfo is None:
            updated = updated.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - updated).total_seconds()
        if age > _MAX_PENDING_AGE_SECONDS:
            self.clear_pending(user_id)
            return None
        return row

    def save_pending(self, user_id: str, pending_type: str, payload: Dict) -> None:
        import json

        with get_cursor() as cur:
            cur.execute(
                """
                insert into conversation_state (user_id, pending_type, pending_payload, updated_at)
                values (%s, %s, %s, now())
                on conflict (user_id) do update set
                    pending_type = excluded.pending_type,
                    pending_payload = excluded.pending_payload,
                    updated_at = now()
                """,
                (user_id, pending_type, json.dumps(payload)),
            )

    def clear_pending(self, user_id: str) -> None:
        with get_cursor() as cur:
            cur.execute(
                """
                insert into conversation_state (user_id, pending_type, pending_payload, updated_at)
                values (%s, null, '{}'::jsonb, now())
                on conflict (user_id) do update set
                    pending_type = null,
                    pending_payload = '{}'::jsonb,
                    updated_at = now()
                """,
                (user_id,),
            )
