from fastapi import APIRouter
from . import voice, opportunities, dashboard, memory, outreach, linkedin, assessment

def create_router():
    router = APIRouter()

    router.include_router(voice.router, prefix="/voice", tags=["voice"])
    router.include_router(opportunities.router, prefix="/opportunity", tags=["opportunities"])
    router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
    router.include_router(memory.router, prefix="/memory", tags=["memory"])
    router.include_router(outreach.router, prefix="/outreach", tags=["outreach"])
    router.include_router(linkedin.router, prefix="/linkedin", tags=["linkedin"])
    router.include_router(assessment.router, prefix="/assessment", tags=["assessment"])

    return router
