from fastapi import APIRouter, Depends
from models import DashboardResponse
from agents import MemoryAgent, PlannerAgent
from auth import get_current_user_id
from typing import Dict

router = APIRouter()

def get_agents(user_id: str = Depends(get_current_user_id)) -> Dict:
    return {
        "memory": MemoryAgent(user_id=user_id),
        "planner": PlannerAgent(),
    }

@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    agents: Dict = Depends(get_agents),
):
    """Get dashboard data including metrics and priorities"""
    try:
        memory_agent = agents["memory"]
        planner_agent = agents["planner"]

        user_context = memory_agent.get_user_context()
        applications = user_context.get("applications", [])
        insights = user_context.get("insights", [])

        followups_due = sum(
            1 for app in applications
            if app["status"] in ["applied", "reviewing"]
            and (app.get("last_followup") is None or (len(applications) > 5))
        )

        execution_score = planner_agent.calculate_execution_score(user_context)
        priorities = planner_agent.generate_daily_plan(user_context)

        applied_count = sum(1 for a in applications if a["status"] == "applied")
        reviewing_count = sum(1 for a in applications if a["status"] == "reviewing")
        interview_count = sum(1 for a in applications if a["status"] == "interview")

        success_rate = (interview_count / len(applications) * 100) if applications else 0
        avg_response_time = 2.3
        this_week = 5
        this_month = 12

        return DashboardResponse(
            total_applications=len(applications),
            followups_due=followups_due,
            execution_score=execution_score,
            priorities=priorities,
            metrics={
                "success_rate": success_rate,
                "avg_response_time": avg_response_time,
                "this_week": this_week,
                "this_month": this_month,
                "applied": applied_count,
                "reviewing": reviewing_count,
                "interview": interview_count,
            },
        )
    except Exception as e:
        return DashboardResponse(
            total_applications=0,
            followups_due=0,
            execution_score=0,
            priorities=[f"Error loading dashboard: {str(e)}"],
            metrics={},
        )
