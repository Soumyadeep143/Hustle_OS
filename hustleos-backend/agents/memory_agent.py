import uuid
from datetime import date, datetime
from typing import Dict, List, Optional

from db.connection import get_cursor

DEFAULT_USER_ID = "user_default"


def _stringify(row: Dict) -> Dict:
    """psycopg2 returns native date/datetime objects for date/timestamptz
    columns; the API layer (Pydantic v1 str fields, JSON) expects strings,
    matching what the old JSON-file store always held."""
    out = dict(row)
    for k, v in out.items():
        if isinstance(v, (date, datetime)):
            out[k] = v.isoformat()
    return out


class MemoryAgent:
    """Profile, applications, and quick-capture items for the single implicit
    user this app has today. Backed by Postgres (profiles / applications /
    captures tables) instead of memory.json, but keeps the exact same public
    surface so routes/ don't need to change."""

    def __init__(self, user_id: str = DEFAULT_USER_ID):
        self.user_id = user_id

    def _ensure_profile(self, cur) -> Dict:
        cur.execute(
            """
            insert into profiles (user_id) values (%s)
            on conflict (user_id) do nothing
            """,
            (self.user_id,),
        )
        cur.execute("select * from profiles where user_id = %s", (self.user_id,))
        return _stringify(cur.fetchone())

    def load_memory(self) -> Dict:
        with get_cursor() as cur:
            profile = self._ensure_profile(cur)
            cur.execute(
                "select * from applications where user_id = %s order by applied_at desc",
                (self.user_id,),
            )
            applications = [_stringify(r) for r in cur.fetchall()]
            cur.execute(
                "select * from captures where user_id = %s order by created_at desc",
                (self.user_id,),
            )
            captures = [_stringify(r) for r in cur.fetchall()]
        return {
            "user_profile": profile,
            "applications": applications,
            "captures": captures,
        }

    def save_opportunity(
        self,
        company: str,
        role: str,
        status: str,
        match_score: int,
        description: str,
    ) -> Dict:
        return self.add_application(company, role, status=status, match_score=match_score, description=description)

    def add_application(
        self,
        company: str,
        role: str,
        status: str = "applied",
        match_score: int = 0,
        description: str = "",
        applied_at: Optional[str] = None,
        last_followup: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict:
        with get_cursor() as cur:
            cur.execute(
                """
                insert into applications
                    (user_id, company, role, status, match_score, description,
                     applied_at, last_followup, notes)
                values
                    (%s, %s, %s, %s, %s, %s,
                     coalesce(%s, current_date), %s, %s)
                returning *
                """,
                (
                    self.user_id, company, role, status, match_score, description,
                    applied_at, last_followup, notes or "",
                ),
            )
            row = _stringify(cur.fetchone())
        return row

    def update_application(self, app_id: str, updates: Dict) -> Optional[Dict]:
        fields = {k: v for k, v in updates.items() if v is not None}
        if not fields:
            with get_cursor() as cur:
                cur.execute(
                    "select * from applications where id = %s and user_id = %s",
                    (app_id, self.user_id),
                )
                row = cur.fetchone()
            return _stringify(row) if row else None

        set_clause = ", ".join(f"{k} = %s" for k in fields)
        with get_cursor() as cur:
            cur.execute(
                f"""
                update applications set {set_clause}, updated_at = now()
                where id = %s and user_id = %s
                returning *
                """,
                (*fields.values(), app_id, self.user_id),
            )
            row = cur.fetchone()
        return _stringify(row) if row else None

    def delete_application(self, app_id: str) -> bool:
        with get_cursor() as cur:
            cur.execute(
                "delete from applications where id = %s and user_id = %s",
                (app_id, self.user_id),
            )
            deleted = cur.rowcount > 0
        return deleted

    def save_capture(self, kind: str, title: str, org: str, meta: Optional[Dict] = None) -> Dict:
        """Persist a Quick Capture item that isn't an application or a RECALL
        prospect (event / article / repo / note / task-adjacent captures)."""
        meta = meta or {}
        with get_cursor() as cur:
            cur.execute(
                """
                insert into captures (user_id, kind, title, org, location, deadline, category, source_url)
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                returning *
                """,
                (
                    self.user_id, kind, title, org,
                    meta.get("location"), meta.get("deadline"), meta.get("category"), meta.get("source_url"),
                ),
            )
            row = _stringify(cur.fetchone())
        return row

    def update_profile(self, profile: Dict) -> Dict:
        fields = {k: v for k, v in profile.items() if v is not None}
        with get_cursor() as cur:
            self._ensure_profile(cur)
            if fields:
                set_clause = ", ".join(f"{k} = %s" for k in fields)
                cur.execute(
                    f"""
                    update profiles set {set_clause}, updated_at = now()
                    where user_id = %s
                    returning *
                    """,
                    (*fields.values(), self.user_id),
                )
                row = _stringify(cur.fetchone())
            else:
                cur.execute("select * from profiles where user_id = %s", (self.user_id,))
                row = _stringify(cur.fetchone())
        return row

    def get_applications(self) -> List[Dict]:
        with get_cursor() as cur:
            cur.execute(
                "select * from applications where user_id = %s order by applied_at desc",
                (self.user_id,),
            )
            rows = [_stringify(r) for r in cur.fetchall()]
        return rows

    def detect_insights(self) -> List[str]:
        applications = self.get_applications()
        insights = []
        today = datetime.now().date()

        for app in applications:
            applied_date = datetime.fromisoformat(app["applied_at"]).date()
            days_since_applied = (today - applied_date).days

            last_followup = app.get("last_followup")
            if last_followup:
                followup_date = datetime.fromisoformat(last_followup).date()
                days_since_followup = (today - followup_date).days
            else:
                days_since_followup = days_since_applied

            if days_since_followup > 5 and app["status"] in ["applied", "reviewing"]:
                insights.append(
                    f"Follow up with {app['company']} ({days_since_followup} days without contact)"
                )

        if len(applications) < 5:
            insights.append("Increase application rate to 5+ per week")

        interviews = [a for a in applications if a["status"] == "interview"]
        if interviews:
            insights.append(f"Prepare for {len(interviews)} upcoming interview(s)")

        return insights[:3] if insights else ["Stay focused on your job search goals"]

    def get_user_context(self) -> Dict:
        with get_cursor() as cur:
            profile = self._ensure_profile(cur)
        applications = self.get_applications()
        return {
            "profile": profile,
            "applications": applications,
            "total_applications": len(applications),
            "insights": self.detect_insights(),
        }
