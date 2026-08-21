"""Per-user conversational working memory — Postgres-backed.

Three independent concerns live here, all in the same table row:

1. PENDING SLOT  (pending_type / pending_payload)
   Used when the assistant asks a follow-up question and the next message
   should complete the original request rather than start a fresh one.
   Currently used for schedule_clarification; extensible via new
   pending_type strings + branches in voice_agent.process_voice_command.
   Expires after _MAX_PENDING_AGE_SECONDS (10 min) on read.

2. LAST ENTITY  (last_entity_type / last_entity_id / last_entity_label)
   Tracks the most recently referenced real record (application, recall
   item, timeline entry, task) so pronouns like "it", "that one", "that
   job" in the next turn can resolve back to it without the user re-
   stating the full name. Written by ai_tools.py after any tool call
   that returns an unambiguous single result. Read by voice_agent.py
   before the tool-calling loop.
   No expiry — the last entity stays until a different one is referenced.

3. HISTORY  (history)
   The last _MAX_HISTORY_TURNS (user, assistant) exchanges, oldest first.
   Written by voice_agent.py after every turn (chat and scheduling alike);
   read back and spliced into the prompt before the current turn so the
   model actually sees the conversation instead of treating each message
   as an isolated one-shot query. Trimmed on every write, not just on
   read, so the stored blob never grows unbounded.

Schema: db/migrations/005_conversation_state.sql, 007_conversation_history.sql
"""
import json
from datetime import date, datetime, timezone
from typing import Dict, List, Optional

from db.connection import get_cursor

_MAX_PENDING_AGE_SECONDS = 10 * 60
_MAX_HISTORY_TURNS = 10  # 10 user+assistant pairs = 20 messages of context

# Entity types the system can track.  Kept as a small closed set so the
# voice_agent can apply type-specific resolution logic without guessing.
ENTITY_TYPES = frozenset({"application", "recall_item", "timeline_entry", "task"})


def _stringify(row: Dict) -> Dict:
    out = dict(row)
    for k, v in out.items():
        if isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
    return out


class ConversationStateStore:

    # ── pending slot ──────────────────────────────────────────────────────

    def get_pending(self, user_id: str) -> Optional[Dict]:
        """Return the active pending slot for user_id, or None if absent /
        expired.  Expiry is evaluated on read — no background cleanup job."""
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
        with get_cursor() as cur:
            cur.execute(
                """
                insert into conversation_state (user_id, pending_type, pending_payload, updated_at)
                values (%s, %s, %s, now())
                on conflict (user_id) do update set
                    pending_type    = excluded.pending_type,
                    pending_payload = excluded.pending_payload,
                    updated_at      = now()
                """,
                (user_id, pending_type, json.dumps(payload)),
            )

    def clear_pending(self, user_id: str) -> None:
        """Clear the pending slot without touching last_entity columns."""
        with get_cursor() as cur:
            cur.execute(
                """
                insert into conversation_state (user_id, pending_type, pending_payload, updated_at)
                values (%s, null, '{}'::jsonb, now())
                on conflict (user_id) do update set
                    pending_type    = null,
                    pending_payload = '{}'::jsonb,
                    updated_at      = now()
                """,
                (user_id,),
            )

    # ── last-entity tracking ──────────────────────────────────────────────

    def save_last_entity(
        self,
        user_id: str,
        entity_type: str,
        entity_id: str,
        label: str,
    ) -> None:
        """Record the most recently touched entity so the next turn can
        resolve "it" / "that one" without the user repeating the name.

        entity_type must be one of ENTITY_TYPES.
        label is a human-readable name (company name, item title, etc.)
        used only for disambiguation prompts — never trusted as a PK.
        """
        if entity_type not in ENTITY_TYPES:
            return  # silently ignore unknown types rather than raise
        with get_cursor() as cur:
            cur.execute(
                """
                insert into conversation_state
                    (user_id, last_entity_type, last_entity_id, last_entity_label, updated_at)
                values (%s, %s, %s, %s, now())
                on conflict (user_id) do update set
                    last_entity_type  = excluded.last_entity_type,
                    last_entity_id    = excluded.last_entity_id,
                    last_entity_label = excluded.last_entity_label,
                    updated_at        = now()
                """,
                (user_id, entity_type, entity_id, label),
            )

    def get_last_entity(self, user_id: str) -> Optional[Dict]:
        """Return {entity_type, entity_id, label} for the last referenced
        entity, or None if nothing has been referenced yet."""
        with get_cursor() as cur:
            cur.execute(
                """
                select last_entity_type, last_entity_id, last_entity_label
                from conversation_state
                where user_id = %s and last_entity_id is not null
                """,
                (user_id,),
            )
            row = cur.fetchone()
        if not row:
            return None
        return {
            "entity_type": row["last_entity_type"],
            "entity_id":   row["last_entity_id"],
            "label":       row["last_entity_label"],
        }

    def clear_last_entity(self, user_id: str) -> None:
        with get_cursor() as cur:
            cur.execute(
                """
                insert into conversation_state
                    (user_id, last_entity_type, last_entity_id, last_entity_label, updated_at)
                values (%s, null, null, null, now())
                on conflict (user_id) do update set
                    last_entity_type  = null,
                    last_entity_id    = null,
                    last_entity_label = null,
                    updated_at        = now()
                """,
                (user_id,),
            )

    # ── conversation history ────────────────────────────────────────────────

    def get_history(self, user_id: str) -> List[Dict]:
        """Return the last N (role, content) messages for this user, oldest
        first, or [] if there's no history yet."""
        with get_cursor() as cur:
            cur.execute(
                "select history from conversation_state where user_id = %s",
                (user_id,),
            )
            row = cur.fetchone()
        if not row or not row.get("history"):
            return []
        return row["history"]

    def append_turn(self, user_id: str, user_message: str, assistant_message: str) -> None:
        """Append one (user, assistant) exchange to this user's stored
        history, trimming to the last _MAX_HISTORY_TURNS pairs so the
        stored blob — and therefore every future prompt — never grows
        unbounded. Best-effort: callers should treat a failure here as
        non-fatal (history is a quality improvement, never a hard
        dependency for producing a reply)."""
        if not user_message or not assistant_message:
            return
        history = self.get_history(user_id)
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": assistant_message})
        history = history[-(_MAX_HISTORY_TURNS * 2):]
        with get_cursor() as cur:
            cur.execute(
                """
                insert into conversation_state (user_id, history, updated_at)
                values (%s, %s, now())
                on conflict (user_id) do update set
                    history    = excluded.history,
                    updated_at = now()
                """,
                (user_id, json.dumps(history)),
            )
