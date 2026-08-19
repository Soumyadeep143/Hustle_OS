from datetime import datetime, time
from typing import Dict, List, Optional


class CapacityAgent:
    """Deterministic computation over Team state — no LLM, always available. Mirrors
    StrategyAgent.score()'s role for RECALL: the reliable non-LLM backbone the rest of the
    Team pipeline depends on. Every method is a pure function over plain dicts/lists."""

    # ---------------- Availability ----------------

    def get_availability_status(self, member: Dict, at: datetime) -> str:
        d_iso = at.date().isoformat()
        weekday = at.strftime("%a").lower()[:3]

        for exc in member.get("availability_exceptions", []):
            if exc["date"] != d_iso:
                continue
            if exc.get("start_time") and exc.get("end_time"):
                t = at.time()
                if time.fromisoformat(exc["start_time"]) <= t <= time.fromisoformat(exc["end_time"]):
                    return exc["status"]
                continue  # exception doesn't cover this specific time — fall through to default
            return exc["status"]  # whole-day exception

        wh = member.get("working_hours", {})
        if weekday not in wh.get("days", []):
            return "away"
        t = at.time()
        if time.fromisoformat(wh.get("start", "09:00")) <= t <= time.fromisoformat(wh.get("end", "17:00")):
            return "available"
        return "away"

    def get_available_hours(self, member: Dict, on: datetime) -> float:
        """Hours available on a given date, from working_hours minus any exception. This is an
        approximation (working-hours-pattern minus known exceptions), not a real calendar —
        the approximation itself is documented in compute_delivery_risk's `basis` output rather
        than hidden behind a falsely precise number."""
        weekday = on.strftime("%a").lower()[:3]
        wh = member.get("working_hours", {})
        if weekday not in wh.get("days", []):
            return 0.0

        start = time.fromisoformat(wh.get("start", "09:00"))
        end = time.fromisoformat(wh.get("end", "17:00"))
        day_hours = (datetime.combine(on, end) - datetime.combine(on, start)).total_seconds() / 3600

        d_iso = on.date().isoformat()
        for exc in member.get("availability_exceptions", []):
            if exc["date"] != d_iso:
                continue
            if exc["status"] in ("pto", "away"):
                return 0.0
            if exc.get("start_time") and exc.get("end_time"):
                ex_start = time.fromisoformat(exc["start_time"])
                ex_end = time.fromisoformat(exc["end_time"])
                busy_hours = (datetime.combine(on, ex_end) - datetime.combine(on, ex_start)).total_seconds() / 3600
                day_hours = max(0.0, day_hours - busy_hours)
            elif exc["status"] == "busy":
                return 0.0
        return day_hours

    def is_on_leave(self, member: Dict, on: datetime) -> bool:
        """Whole-day PTO/away exception for the given date — distinct from
        get_availability_status(), which also returns 'away' for simply being off-the-clock
        outside working hours right now. Task reassignment cares about "is this person out for
        the day", not "are they at their desk this exact minute" — conflating the two would make
        every candidate look unavailable after 5pm, which is wrong."""
        d_iso = on.date().isoformat()
        return any(
            exc["date"] == d_iso and exc["status"] in ("pto", "away") and not exc.get("start_time")
            for exc in member.get("availability_exceptions", [])
        )

    def find_available_members(self, members: List[Dict], on: datetime, start: str, end: str) -> List[str]:
        """Answers 'who is available tomorrow 2-5pm' — members whose working_hours cover the
        requested window on that weekday, with no PTO/away/busy exception overlapping it."""
        weekday = on.strftime("%a").lower()[:3]
        req_start = time.fromisoformat(start)
        req_end = time.fromisoformat(end)
        d_iso = on.date().isoformat()
        result = []

        for m in members:
            wh = m.get("working_hours", {})
            if weekday not in wh.get("days", []):
                continue
            if not (
                time.fromisoformat(wh.get("start", "09:00")) <= req_start
                and req_end <= time.fromisoformat(wh.get("end", "17:00"))
            ):
                continue

            blocked = False
            for exc in m.get("availability_exceptions", []):
                if exc["date"] != d_iso:
                    continue
                if exc["status"] in ("pto", "away"):
                    blocked = True
                    break
                if exc.get("start_time") and exc.get("end_time"):
                    ex_start = time.fromisoformat(exc["start_time"])
                    ex_end = time.fromisoformat(exc["end_time"])
                    if ex_start < req_end and req_start < ex_end:
                        blocked = True
                        break
                else:
                    blocked = True
                    break
            if not blocked:
                result.append(m["id"])
        return result

    # ---------------- Capacity / workload ----------------

    def compute_member_workload(self, member: Dict, tasks: List[Dict]) -> Dict:
        open_tasks = [t for t in tasks if t.get("assignee_id") == member["id"] and t["status"] != "done"]
        estimated = [t for t in open_tasks if t.get("estimate_hours") is not None]
        unestimated_count = len(open_tasks) - len(estimated)
        assigned_hours = sum(t["estimate_hours"] for t in estimated)
        capacity = member.get("capacity_hours_per_week", 0.0)
        remaining = capacity - assigned_hours
        ratio = (assigned_hours / capacity) if capacity > 0 else 0.0

        if ratio > 1.0:
            state = "overloaded"
        elif ratio >= 0.7:
            state = "optimal"
        else:
            state = "under"

        blocked_owned = sum(1 for t in open_tasks if self._is_blocked_single(t, tasks))

        return {
            "member_id": member["id"],
            "capacity_hours": capacity,
            "assigned_hours": round(assigned_hours, 1),
            "remaining_capacity": round(remaining, 1),
            "workload_ratio": round(ratio, 3),
            "workload_state": state,
            "unestimated_open_task_count": unestimated_count,
            "blocked_task_count": blocked_owned,
        }

    # ---------------- Dependencies / blockers ----------------

    def _is_blocked_single(self, task: Dict, all_tasks: List[Dict]) -> bool:
        if task.get("blocked_reason"):
            return True
        by_id = {t["id"]: t for t in all_tasks}
        return any(
            (dep := by_id.get(dep_id)) and dep["status"] != "done" for dep_id in task.get("dependencies", [])
        )

    def compute_blocked_tasks(self, tasks: List[Dict]) -> List[Dict]:
        by_id = {t["id"]: t for t in tasks}
        result = []
        for t in tasks:
            blocking_on = [
                dep_id
                for dep_id in t.get("dependencies", [])
                if (dep := by_id.get(dep_id)) and dep["status"] != "done"
            ]
            if blocking_on or t.get("blocked_reason"):
                result.append({"task_id": t["id"], "blocking_on": blocking_on, "blocked_reason": t.get("blocked_reason")})
        return result

    def compute_downstream_impact(self, task_id: str, all_tasks: List[Dict]) -> List[str]:
        """Direct dependents only — which tasks list this task_id in their own dependencies.
        Powers the UI's 'blocking N downstream tasks'. Transitive/multi-hop is Phase 2+ scope."""
        return [t["id"] for t in all_tasks if task_id in t.get("dependencies", [])]

    def task_signals(self, task: Dict, all_tasks: List[Dict]) -> Dict:
        by_id = {t["id"]: t for t in all_tasks}
        blocking_on = [
            dep_id
            for dep_id in task.get("dependencies", [])
            if (dep := by_id.get(dep_id)) and dep["status"] != "done"
        ]
        is_blocked = bool(blocking_on) or bool(task.get("blocked_reason"))
        return {
            "is_blocked": is_blocked,
            "blocking_on": blocking_on,
            "downstream_impact": self.compute_downstream_impact(task["id"], all_tasks),
        }

    # ---------------- Progress / delivery risk ----------------

    def compute_delivery_risk(
        self, scope_tasks: List[Dict], members: List[Dict], deadline: Optional[str], now: datetime
    ) -> Dict:
        """Deterministic — remaining work vs. available capacity vs. deadline vs. blockers.
        Deliberately exposes its assumptions (estimate_confidence, a plain-language basis)
        instead of synthesizing a falsely precise confidence percentage."""
        open_tasks = [t for t in scope_tasks if t["status"] != "done"]
        estimated = [t for t in open_tasks if t.get("estimate_hours") is not None]
        remaining_hours = sum(t["estimate_hours"] for t in estimated)
        unestimated_count = len(open_tasks) - len(estimated)
        total_open = len(open_tasks)

        if total_open == 0 or unestimated_count == 0:
            estimate_confidence = "high"
        elif unestimated_count < total_open:
            estimate_confidence = "medium"
        else:
            estimate_confidence = "low"

        blocked_count = len(self.compute_blocked_tasks(scope_tasks))

        if not deadline:
            return {
                "risk_level": "unknown",
                "remaining_hours": round(remaining_hours, 1),
                "available_capacity_hours": 0.0,
                "estimate_confidence": estimate_confidence,
                "basis": f"No deadline set; {remaining_hours:.0f}h remaining across {total_open} open task(s).",
            }

        try:
            deadline_date = datetime.fromisoformat(deadline)
        except ValueError:
            deadline_date = now

        weeks_remaining = max((deadline_date - now).days / 7.0, 0.0)
        assignee_ids = {t["assignee_id"] for t in open_tasks if t.get("assignee_id")}
        by_id = {m["id"]: m for m in members}
        available_capacity_hours = sum(
            by_id[mid]["capacity_hours_per_week"] * weeks_remaining for mid in assignee_ids if mid in by_id
        )

        if remaining_hours <= available_capacity_hours * 0.8 and blocked_count == 0:
            risk_level = "low"
        elif remaining_hours <= available_capacity_hours and blocked_count <= 1:
            risk_level = "medium"
        else:
            risk_level = "high"

        basis = (
            f"{remaining_hours:.0f}h remaining across {total_open} open task(s); "
            f"{available_capacity_hours:.0f}h capacity from {len(assignee_ids)} assigned member(s) "
            f"before {deadline_date.date().isoformat()}; {blocked_count} task(s) currently blocked."
        )
        if unestimated_count:
            basis += f" {unestimated_count} open task(s) have no estimate and are excluded from remaining_hours."

        return {
            "risk_level": risk_level,
            "remaining_hours": round(remaining_hours, 1),
            "available_capacity_hours": round(available_capacity_hours, 1),
            "estimate_confidence": estimate_confidence,
            "basis": basis,
        }

    def compute_feature_progress(self, feature: Dict, tasks: List[Dict], members: List[Dict], now: datetime) -> Dict:
        scope = [t for t in tasks if t.get("feature_id") == feature["id"]]
        done = sum(1 for t in scope if t["status"] == "done")
        total = len(scope)
        percent = round((done / total) * 100, 1) if total else 0.0
        blocked_ids = [b["task_id"] for b in self.compute_blocked_tasks(scope)]
        risk = self.compute_delivery_risk(scope, members, feature.get("due_at"), now)
        return {"percent": percent, "done": done, "total": total, "blocked_count": len(blocked_ids), "blocking_tasks": blocked_ids, **risk}

    def compute_project_progress(
        self, project: Dict, features: List[Dict], tasks: List[Dict], members: List[Dict], now: datetime
    ) -> Dict:
        feature_scope = [f for f in features if f.get("project_id") == project["id"]]
        feature_ids = {f["id"] for f in feature_scope}

        seen = set()
        scope = []
        for t in tasks:
            if t["id"] in seen:
                continue
            if t.get("project_id") == project["id"] or t.get("feature_id") in feature_ids:
                seen.add(t["id"])
                scope.append(t)

        done = sum(1 for t in scope if t["status"] == "done")
        total = len(scope)
        percent = round((done / total) * 100, 1) if total else 0.0
        open_blockers = len(self.compute_blocked_tasks(scope))

        at_risk_features = sum(
            1
            for f in feature_scope
            if self.compute_feature_progress(f, tasks, members, now)["risk_level"] in ("medium", "high")
        )

        risk = self.compute_delivery_risk(scope, members, project.get("target_date"), now)
        return {
            "percent": percent,
            "done": done,
            "total": total,
            "at_risk_feature_count": at_risk_features,
            "open_blockers": open_blockers,
            **risk,
        }

    def compute_sprint_progress(self, sprint: Dict, tasks: List[Dict]) -> Dict:
        scope = [t for t in tasks if t.get("sprint_id") == sprint["id"]]
        done = sum(1 for t in scope if t["status"] == "done")
        total = len(scope)
        percent = round((done / total) * 100, 1) if total else 0.0
        return {"percent": percent, "done": done, "total": total}

    # ---------------- Bottlenecks ----------------

    def identify_bottlenecks(self, members_with_workload: List[Dict], tasks: List[Dict]) -> List[Dict]:
        result = []
        for m in members_with_workload:
            if m["workload_state"] == "overloaded":
                result.append(
                    {
                        "member_id": m["member_id"],
                        "member_name": m.get("name", ""),
                        "kind": "overloaded",
                        "detail": f"{m['assigned_hours']:.0f}h assigned against {m['capacity_hours']:.0f}h capacity",
                    }
                )
            if m["blocked_task_count"] >= 2:
                result.append(
                    {
                        "member_id": m["member_id"],
                        "member_name": m.get("name", ""),
                        "kind": "blocker_owner",
                        "detail": f"Owns {m['blocked_task_count']} blocked task(s)",
                    }
                )
        return result

    # ---------------- Resource matching (grounding data, not a decision) ----------------

    def find_candidates_for_task(self, task: Dict, members: List[Dict], tasks: List[Dict], now: datetime) -> List[Dict]:
        required = set(task.get("required_skills", []))
        candidates = []
        for m in members:
            if m["id"] == task.get("assignee_id"):
                continue
            matching = required & set(m.get("skills", []))
            if required and not matching:
                continue
            if self.is_on_leave(m, now):
                continue
            workload = self.compute_member_workload(m, tasks)
            if workload["remaining_capacity"] <= 0:
                continue
            candidates.append(
                {
                    "member_id": m["id"],
                    "name": m["name"],
                    "matching_skills": sorted(matching),
                    "remaining_capacity_hours": workload["remaining_capacity"],
                }
            )
        candidates.sort(key=lambda c: c["remaining_capacity_hours"], reverse=True)
        return candidates

    # ---------------- Orchestration ----------------

    def compute_team_signals(self, team: Dict) -> Dict:
        """The TEAM STATE -> AVAILABILITY -> ... -> RISK pipeline in one call. Consumed by the
        route (for GET responses) and by RecommendationAgent (as its only grounding input)."""
        now = datetime.now()
        members = list(team["members"].values())
        tasks = list(team["tasks"].values())
        features = list(team["features"].values())
        projects = list(team["projects"].values())
        sprints = list(team["sprints"].values())

        members_with_workload = [
            {**m, **self.compute_member_workload(m, tasks), "current_availability": self.get_availability_status(m, now)}
            for m in members
        ]
        tasks_with_signals = [{**t, **self.task_signals(t, tasks)} for t in tasks]
        features_with_signals = [{**f, **self.compute_feature_progress(f, tasks, members, now)} for f in features]
        projects_with_signals = [
            {**p, **self.compute_project_progress(p, features, tasks, members, now)} for p in projects
        ]
        sprints_with_signals = [{**s, **self.compute_sprint_progress(s, tasks)} for s in sprints]
        bottlenecks = self.identify_bottlenecks(members_with_workload, tasks)

        blocked_with_candidates = []
        for b in self.compute_blocked_tasks(tasks):
            task = next(t for t in tasks if t["id"] == b["task_id"])
            blocked_with_candidates.append(
                {**b, "candidates": self.find_candidates_for_task(task, members, tasks, now)}
            )

        # Resource-matching candidates for relieving an overloaded member — a distinct trigger
        # from "this task is blocked": the task itself may be perfectly healthy, but its owner
        # doesn't have the hours to get to it before the deadline.
        overloaded_with_candidates = []
        for m in members_with_workload:
            if m["workload_state"] != "overloaded":
                continue
            open_owned = [t for t in tasks if t.get("assignee_id") == m["id"] and t["status"] != "done"]
            if not open_owned:
                continue
            candidate_task = max(open_owned, key=lambda t: t.get("estimate_hours") or 0)
            candidates = self.find_candidates_for_task(candidate_task, members, tasks, now)
            if candidates:
                overloaded_with_candidates.append(
                    {"member_id": m["id"], "task_id": candidate_task["id"], "candidates": candidates}
                )

        return {
            "members": members_with_workload,
            "tasks": tasks_with_signals,
            "features": features_with_signals,
            "projects": projects_with_signals,
            "sprints": sprints_with_signals,
            "bottlenecks": bottlenecks,
            "blocked_tasks_with_candidates": blocked_with_candidates,
            "overloaded_members_with_candidates": overloaded_with_candidates,
        }
