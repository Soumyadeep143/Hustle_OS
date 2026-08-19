from fastapi import APIRouter, Depends, HTTPException, Query
from models import Application, ApplicationCreateRequest, ApplicationUpdateRequest, MemoryResponse, UserProfile
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

@router.post("/", response_model=UserProfile)
async def update_profile(
    profile: UserProfile,
    agent: MemoryAgent = Depends(get_memory_agent),
):
    """Update user profile"""
    updated = agent.update_profile(profile.dict())
    return updated


@router.post("/applications", response_model=Application)
async def create_application(
    request: ApplicationCreateRequest,
    agent: MemoryAgent = Depends(get_memory_agent),
):
    return agent.add_application(**request.dict())


@router.patch("/applications/{app_id}", response_model=Application)
async def update_application(
    app_id: str,
    request: ApplicationUpdateRequest,
    agent: MemoryAgent = Depends(get_memory_agent),
):
    app = agent.update_application(app_id, request.dict(exclude_unset=True))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.delete("/applications/{app_id}")
async def delete_application(
    app_id: str,
    agent: MemoryAgent = Depends(get_memory_agent),
):
    if not agent.delete_application(app_id):
        raise HTTPException(status_code=404, detail="Application not found")
    return {"deleted": True}
