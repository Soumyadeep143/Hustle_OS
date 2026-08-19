import json
import os
import uuid
from datetime import datetime
from typing import Dict, Optional


class RecommendationAgent:
    """Turns CapacityAgent's computed signals into a grounded, human-approvable recommendation.
    Mirrors StrategyAgent.next_best_action()'s role for RECALL: LLM-backed, but every id it
    returns is mechanically validated against the real signals snapshot before being trusted —
    not just prompt-instructed to stay grounded — with a deterministic fallback when the LLM is
    unavailable or returns something ungrounded."""

    ACTION_TYPES = {"reassign_task", "unblock_task_priority_bump", "no_action"}

    def __init__(self):
        self.model = "gpt-4o-mini"

    def recommend(self, team: Dict, signals: Dict) -> Dict:
        try:
            rec = self._llm_recommend(signals)
            if rec and self._validate(rec, signals):
                return self._finalize(rec)
        except Exception as e:
            print(f"Error generating team recommendation: {e}")
        return self._finalize(self._fallback_recommendation(signals))

    def _llm_recommend(self, signals: Dict) -> Optional[Dict]:
        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        task_titles = {t["id"]: t["title"] for t in signals["tasks"]}

        member_lines = "\n".join(
            f"- {m['id']}: {m['name']} ({m['role']}), skills={m.get('skills', [])}, "
            f"workload={m['workload_state']} ({m['assigned_hours']}h/{m['capacity_hours']}h), "
            f"availability={m['current_availability']}"
            for m in signals["members"]
        ) or "none"
        blocked_lines = (
            "\n".join(
                f"- {b['task_id']} '{task_titles.get(b['task_id'], b['task_id'])}' blocked by "
                + ", ".join(f"{dep_id} '{task_titles.get(dep_id, dep_id)}'" for dep_id in b["blocking_on"])
                + "; candidates: "
                + (
                    ", ".join(
                        f"{c['member_id']} ({c['name']}, {c['remaining_capacity_hours']}h free, "
                        f"skills {c['matching_skills']})"
                        for c in b["candidates"]
                    )
                    or "none"
                )
                for b in signals["blocked_tasks_with_candidates"]
            )
            or "none"
        )
        bottleneck_lines = (
            "\n".join(f"- {b['member_name']} ({b['member_id']}): {b['kind']} — {b['detail']}" for b in signals["bottlenecks"])
            or "none"
        )
        overload_lines = (
            "\n".join(
                f"- member {o['member_id']} is overloaded and owns task {o['task_id']} "
                f"'{task_titles.get(o['task_id'], o['task_id'])}'; candidates to help: "
                + ", ".join(
                    f"{c['member_id']} ({c['name']}, {c['remaining_capacity_hours']}h free, skills {c['matching_skills']})"
                    for c in o["candidates"]
                )
                for o in signals.get("overloaded_members_with_candidates", [])
            )
            or "none"
        )
        project_lines = (
            "\n".join(
                f"- {p['id']} '{p['name']}': {p['percent']}% done, risk={p['risk_level']}, {p['basis']}"
                for p in signals["projects"]
            )
            or "none"
        )

        prompt = f"""You are analyzing a software team's execution state and must recommend ONE
action to help the team deliver. Use ONLY the data below — never invent a member id, task id,
skill, or number that isn't listed here.

TEAM MEMBERS:
{member_lines}

BLOCKED TASKS (with candidate members who could help, if any):
{blocked_lines}

BOTTLENECKS:
{bottleneck_lines}

OVERLOADED MEMBERS (with candidates who could take over one of their tasks):
{overload_lines}

PROJECTS:
{project_lines}

Respond with ONLY a JSON object of this exact shape:
{{"action_type": "reassign_task"|"unblock_task_priority_bump"|"no_action",
  "params": {{...ids copied from the data above...}},
  "summary": "one sentence describing the action, using people's names and task titles, never ids",
  "reason": "one or two sentences grounded in the data above, using names and task titles, never ids"}}
The "params" object must use the exact ids from the data above. The "summary" and "reason" text
must NEVER contain a raw id like "task_..." or "member_..." — always use the name/title shown in
parentheses or quotes next to that id.

For reassign_task, params must be {{"task_id", "from_member_id", "to_member_id"}} where
to_member_id is one of the listed candidates for that task. For unblock_task_priority_bump,
params must be {{"task_id"}}. If nothing needs action, return no_action with empty params."""

        response = client.chat.completions.create(
            model=self.model,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)

    def _validate(self, rec: Dict, signals: Dict) -> bool:
        """Mechanically enforced grounding — rejects any action_type or id not present in the
        current signals snapshot. Not just a prompt instruction."""
        action_type = rec.get("action_type")
        if action_type not in self.ACTION_TYPES:
            return False
        if action_type == "no_action":
            return True

        params = rec.get("params", {})
        member_ids = {m["id"] for m in signals["members"]}
        task_ids = {t["id"] for t in signals["tasks"]}

        if action_type == "reassign_task":
            required = {"task_id", "from_member_id", "to_member_id"}
            if not required.issubset(params):
                return False
            return (
                params["task_id"] in task_ids
                and params["from_member_id"] in member_ids
                and params["to_member_id"] in member_ids
            )

        if action_type == "unblock_task_priority_bump":
            return "task_id" in params and params["task_id"] in task_ids

        return False

    def _finalize(self, rec: Dict) -> Dict:
        return {
            "id": f"rec_{uuid.uuid4().hex[:8]}",
            "action_type": rec["action_type"],
            "params": rec.get("params", {}),
            "summary": rec.get("summary", ""),
            "reason": rec.get("reason", ""),
            "generated_at": datetime.now().isoformat(),
        }

    def _fallback_recommendation(self, signals: Dict) -> Dict:
        """Deterministic — used when the LLM is unavailable or returns something ungrounded.
        Finds a real, executable action from the signals directly, or honestly reports there's
        nothing to do rather than fabricating one."""
        for b in signals["blocked_tasks_with_candidates"]:
            task = next(t for t in signals["tasks"] if t["id"] == b["task_id"])
            if b["candidates"] and task.get("assignee_id"):
                best = b["candidates"][0]
                return {
                    "action_type": "reassign_task",
                    "params": {
                        "task_id": task["id"],
                        "from_member_id": task["assignee_id"],
                        "to_member_id": best["member_id"],
                    },
                    "summary": f"Reassign '{task['title']}' to {best['name']}.",
                    "reason": (
                        f"{best['name']} has {best['remaining_capacity_hours']}h of available capacity "
                        f"and matching skills ({', '.join(best['matching_skills']) or 'general availability'}), "
                        f"while this task is currently blocked."
                    ),
                }

        for o in signals.get("overloaded_members_with_candidates", []):
            task = next(t for t in signals["tasks"] if t["id"] == o["task_id"])
            best = o["candidates"][0]
            member = next(m for m in signals["members"] if m["id"] == o["member_id"])
            return {
                "action_type": "reassign_task",
                "params": {
                    "task_id": task["id"],
                    "from_member_id": o["member_id"],
                    "to_member_id": best["member_id"],
                },
                "summary": f"Reassign '{task['title']}' from {member['name']} to {best['name']}.",
                "reason": (
                    f"{member['name']} is overloaded ({member['assigned_hours']}h/{member['capacity_hours']}h) "
                    f"and {best['name']} has {best['remaining_capacity_hours']}h of available capacity "
                    f"and matching skills ({', '.join(best['matching_skills']) or 'general availability'})."
                ),
            }

        for b in signals["blocked_tasks_with_candidates"]:
            task = next(t for t in signals["tasks"] if t["id"] == b["task_id"])
            if task.get("priority") != "urgent":
                return {
                    "action_type": "unblock_task_priority_bump",
                    "params": {"task_id": task["id"]},
                    "summary": f"Bump priority on '{task['title']}'.",
                    "reason": (
                        f"This task is blocked ({task.get('blocked_reason') or 'unmet dependency'}) with no "
                        "available candidate to reassign to — escalating visibility."
                    ),
                }

        return {
            "action_type": "no_action",
            "params": {},
            "summary": "Team is on track.",
            "reason": "No blocked tasks requiring action right now.",
        }
