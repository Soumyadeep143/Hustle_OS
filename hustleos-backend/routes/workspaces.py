from typing import List

from fastapi import APIRouter, Depends

from agents import WorkspaceStore
from models import OrgHealthResponse, TeamProject, TeamSprintResponse

router = APIRouter()


def get_store() -> WorkspaceStore:
    return WorkspaceStore()


@router.get("/team/{team_id}/sprint", response_model=TeamSprintResponse)
async def team_sprint(team_id: str, store: WorkspaceStore = Depends(get_store)):
    return store.get_sprint(team_id)


@router.get("/team/{team_id}/projects", response_model=List[TeamProject])
async def team_projects(team_id: str, store: WorkspaceStore = Depends(get_store)):
    return store.get_projects(team_id)


@router.get("/org/health", response_model=OrgHealthResponse)
async def org_health(store: WorkspaceStore = Depends(get_store)):
    return store.get_org_health()
