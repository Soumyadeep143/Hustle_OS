from fastapi import APIRouter
from . import voice, opportunities, dashboard, memory, recall, tasks, capture, workspaces, integrations, team, home, auth, schedule

def create_router():
    router = APIRouter()

    router.include_router(auth.router, prefix="/auth", tags=["auth"])
    router.include_router(voice.router, prefix="/voice", tags=["voice"])
    router.include_router(opportunities.router, prefix="/opportunity", tags=["opportunities"])
    router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
    router.include_router(memory.router, prefix="/memory", tags=["memory"])
    router.include_router(recall.router, prefix="/recall", tags=["recall"])
    router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
    router.include_router(capture.router, prefix="/capture", tags=["capture"])
    router.include_router(workspaces.router, tags=["workspaces"])
    router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
    router.include_router(team.router, prefix="/team", tags=["team"])
    router.include_router(home.router, prefix="/home", tags=["home"])
    router.include_router(schedule.router, prefix="/schedule", tags=["schedule"])

    return router
