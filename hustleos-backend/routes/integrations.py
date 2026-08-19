from typing import List

from fastapi import APIRouter, Depends, HTTPException

from agents import IntegrationStore
from models import Integration, IntegrationConnectResponse

router = APIRouter()


def get_store() -> IntegrationStore:
    return IntegrationStore()


@router.get("/", response_model=List[Integration])
async def list_integrations(store: IntegrationStore = Depends(get_store)):
    return store.list_integrations()


@router.post("/{key}/connect", response_model=IntegrationConnectResponse)
async def connect_integration(key: str, store: IntegrationStore = Depends(get_store)):
    integration = store.connect(key)
    if not integration:
        raise HTTPException(status_code=404, detail="Unknown integration")
    return IntegrationConnectResponse(
        key=key,
        connected=True,
        note="No OAuth app is configured for this integration yet — connection state is stubbed.",
    )
