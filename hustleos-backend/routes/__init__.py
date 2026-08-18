from fastapi import APIRouter
from . import voice, opportunities, dashboard, memory

def create_router():
    router = APIRouter()

    router.include_router(voice.router, prefix="/voice", tags=["voice"])
    router.include_router(opportunities.router, prefix="/opportunity", tags=["opportunities"])
    router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
    router.include_router(memory.router, prefix="/memory", tags=["memory"])

    return router
