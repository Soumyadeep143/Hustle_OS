from fastapi import APIRouter, Depends

from agents import WorkspaceStore
from models import OrgHealthResponse

router = APIRouter()


def get_store() -> WorkspaceStore:
    return WorkspaceStore()


@router.get("/org/health", response_model=OrgHealthResponse)
async def org_health(store: WorkspaceStore = Depends(get_store)):
    return store.get_org_health()
