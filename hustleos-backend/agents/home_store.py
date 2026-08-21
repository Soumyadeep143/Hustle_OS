from datetime import date, datetime, time as time_cls
from typing import Dict, List, Optional

from db.connection import get_cursor
from .schedule_engine import format_time_12h


def _stringify(row: Dict) -> Dict:
    out = dict(row)
    for k, v in out.items():
        if isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
        elif isinstance(v, time_cls):
            out[k] = v.strftime("%H:%M")
    return out


_PRIORITY_TONE = {"highest": "blue", "high": "red", "medium": "yellow", "low": "green", "none": "neutral"}
_PRIORITY_FLAG = {"highest": "Highest Priority", "high": "High", "medium": "Medium", "low": "Low", "none": None}


def _derive_display(priority: str, scheduled_date: Optional[str], start_time: Optional[str], all_day: bool) -> Dict:
    """Server-computed tone/flag/at from the structured scheduling fields —
    replaces the old free-text tone/flag/at inputs. `at` is a simple
    fallback label only; the frontend computes the live "Now"-relative
    label itself since only the browser knows the user's current time."""
    tone = _PRIORITY_TONE.get(priority, "neutral")
    flag = _PRIORITY_FLAG.get(priority)
    if all_day:
        at = "All day"
    elif start_time:
        at = format_time_12h(start_time)
    elif scheduled_date:
        at = scheduled_date
    else:
        at = "Anytime"
    return {"tone": tone, "flag": flag, "at": at}


class HomeStore:
    """Deterministic structured state for the Personal Home screen's TODAY timeline,
    SIGNALS, and AI Brief headline. Backed by Postgres (timeline_entries / signals /
    briefs / seed_flags tables) instead of home_state.json, keyed by user_id."""

    # ---- Timeline ----

    def list_timeline(self, user_id: str, on_date: Optional[str] = None) -> List[Dict]:
        with get_cursor() as cur:
            if on_date:
                cur.execute(
                    """
                    select * from timeline_entries
                    where user_id = %s and (scheduled_date = %s or scheduled_date is null)
                    order by all_day desc, start_time nulls last, created_at
                    """,
                    (user_id, on_date),
                )
            else:
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
        self,
        user_id: str,
        title: str,
        subtitle: Optional[str] = None,
        item_type: str = "task",
        priority: str = "none",
        scheduled_date: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        all_day: bool = False,
        duration_minutes: Optional[int] = None,
        reminder_minutes_before: Optional[int] = None,
        timezone: Optional[str] = None,
        calendar_target: str = "none",
        notes: Optional[str] = None,
        original_phrase: Optional[str] = None,
    ) -> Dict:
        display = _derive_display(priority, scheduled_date, start_time, all_day)
        with get_cursor() as cur:
            cur.execute(
                """
                insert into timeline_entries (
                  user_id, at, title, subtitle, tone, flag, item_type, priority,
                  scheduled_date, start_time, end_time, all_day, duration_minutes,
                  reminder_minutes_before, timezone, calendar_target, notes, original_phrase
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                returning *
                """,
                (
                    user_id, display["at"], title, subtitle, display["tone"], display["flag"], item_type, priority,
                    scheduled_date, start_time, end_time, all_day, duration_minutes,
                    reminder_minutes_before, timezone, calendar_target, notes, original_phrase,
                ),
            )
            row = cur.fetchone()
        return _stringify(row)

    def seed_timeline(self, user_id: str, entries: List[Dict]) -> List[Dict]:
        if self.has_timeline(user_id):
            return self.list_timeline(user_id)
        created = [
            self.add_timeline_entry(
                user_id, e["title"], subtitle=e.get("subtitle"),
                item_type=e.get("item_type", "task"), priority=e.get("priority", "none"),
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

    def get_timeline_entry(self, user_id: str, entry_id: str) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute(
                "select * from timeline_entries where id = %s and user_id = %s",
                (entry_id, user_id),
            )
            row = cur.fetchone()
        return _stringify(row) if row else None

    def update_timeline_entry(self, user_id: str, entry_id: str, updates: Dict) -> Optional[Dict]:
        clear_scheduled_date = updates.pop("clear_scheduled_date", False)
        clear_start_time = updates.pop("clear_start_time", False)
        clear_end_time = updates.pop("clear_end_time", False)
        fields = {k: v for k, v in updates.items() if v is not None}

        if clear_scheduled_date:
            fields["scheduled_date"] = None
        if clear_start_time:
            fields["start_time"] = None
        if clear_end_time:
            fields["end_time"] = None

        if fields.get("completed") is True:
            fields.setdefault("completed_at", datetime.now().isoformat())
        elif fields.get("completed") is False:
            fields["completed_at"] = None

        # Recompute the derived display fields whenever anything that feeds
        # them changes, using the post-update values (existing row for
        # anything not part of this update).
        display_inputs = {"priority", "scheduled_date", "start_time", "all_day"}
        if display_inputs & set(fields.keys()) or clear_scheduled_date or clear_start_time:
            current = self.get_timeline_entry(user_id, entry_id)
            if current:
                priority = fields.get("priority", current["priority"])
                scheduled_date = fields["scheduled_date"] if "scheduled_date" in fields else current["scheduled_date"]
                start_time = fields["start_time"] if "start_time" in fields else current["start_time"]
                all_day = fields.get("all_day", current["all_day"])
                display = _derive_display(priority, scheduled_date, start_time, all_day)
                fields.update(display)

        if not fields:
            return self.get_timeline_entry(user_id, entry_id)

        set_clause = ", ".join(f"{k} = %s" for k in fields) + ", "
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

    def set_calendar_sync(self, user_id: str, entry_id: str, calendar_event_id: str) -> Optional[Dict]:
        with get_cursor() as cur:
            cur.execute(
                """
                update timeline_entries set calendar_event_id = %s, calendar_synced_at = now(), updated_at = now()
                where id = %s and user_id = %s
                returning *
                """,
                (calendar_event_id, entry_id, user_id),
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
