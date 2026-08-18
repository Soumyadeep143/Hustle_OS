from fastapi import APIRouter, Depends, Query
from models import MemoryResponse
from agents import MemoryAgent
from typing import Dict

router = APIRouter()

def get_memory_agent() -> MemoryAgent:
    return MemoryAgent()

@router.get("/", response_model=MemoryResponse)
async def get_memory(
    user_id: str = Query("user_default"),
    agent: MemoryAgent = Depends(get_memory_agent),
):
    """Get user memory including profile, applications, and insights"""
    try:
        memory = agent.load_memory()
        applications = agent.get_applications()
        insights = agent.detect_insights()

        return MemoryResponse(
            user_profile=memory["user_profile"],
            applications=applications,
            insights=insights,
        )
    except Exception as e:
        return MemoryResponse(
            user_profile={
                "name": "User",
                "email": "",
                "target_role": "",
                "target_location": "",
                "skills": [],
            },
            applications=[],
            insights=[f"Error loading memory: {str(e)}"],
        )
