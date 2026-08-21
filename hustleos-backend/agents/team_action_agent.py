from typing import Dict


class TeamActionAgent:
    """Validates a proposed team action before it's allowed to mutate TeamStore. Mirrors
    ExecutionAgent's "never runs without prior approval" guarantee, but for structured internal
    state mutations rather than free-text external drafts — the mutation itself happens via
    TeamStore methods in routes/team.py's ACTION_HANDLERS registry, exactly how RECALL's route
    (not ExecutionAgent) is the only thing that ever touches RecallStore."""

    ACTION_TYPES = {"reassign_task", "unblock_task_priority_bump", "no_action"}

    def validate(self, action_type: str, params: Dict, team: Dict) -> None:
        """Raises ValueError if the action can't actually be applied to this team's current
        state. Team state may have changed since RecommendationAgent validated it at generation
        time, so this check is never skipped."""
        if action_type not in self.ACTION_TYPES:
            raise ValueError(f"Unknown action_type: {action_type}")

        if action_type == "no_action":
            raise ValueError("no_action has nothing to execute")

        if action_type == "reassign_task":
            task_id = params.get("task_id")
            from_member_id = params.get("from_member_id")
            to_member_id = params.get("to_member_id")
            task = team["tasks"].get(task_id)
            if not task:
                raise ValueError(f"Task {task_id} not found")
            if task.get("assignee_id") != from_member_id:
                raise ValueError(f"Task {task_id} is not currently assigned to {from_member_id}")
            if to_member_id not in team["members"]:
                raise ValueError(f"Member {to_member_id} not found")
            return

        if action_type == "unblock_task_priority_bump":
            task_id = params.get("task_id")
            if task_id not in team["tasks"]:
                raise ValueError(f"Task {task_id} not found")
            return

        raise ValueError(f"Unhandled action_type: {action_type}")
