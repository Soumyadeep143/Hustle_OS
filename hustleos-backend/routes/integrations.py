import os
from datetime import datetime
from typing import Dict, List

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse

from agents import CalendarStore, IntegrationStore
from agents.calendar_client import build_auth_url, exchange_code, is_configured
from auth import create_token, decode_token, get_current_user_id
from models import Integration, IntegrationConnectResponse

router = APIRouter()


def get_store() -> IntegrationStore:
    return IntegrationStore()


def get_deps() -> Dict:
    return {"integrations": IntegrationStore(), "calendar": CalendarStore()}


@router.get("/", response_model=List[Integration])
async def list_integrations(user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)):
    integrations = deps["integrations"].list_integrations()
    connection = deps["calendar"].get(user_id)
    return [
        {**i, "connected": bool(connection)} if i["key"] == "calendar" else i
        for i in integrations
    ]


@router.post("/{key}/connect", response_model=IntegrationConnectResponse)
async def connect_integration(key: str, store: IntegrationStore = Depends(get_store)):
    if key == "calendar":
        raise HTTPException(
            status_code=400, detail="Calendar connects via OAuth — use GET /integrations/calendar/auth-url"
        )
    integration = store.connect(key)
    if not integration:
        raise HTTPException(status_code=404, detail="Unknown integration")
    return IntegrationConnectResponse(
        key=key,
        connected=True,
        note="No OAuth app is configured for this integration yet — connection state is stubbed.",
    )


@router.get("/calendar/auth-url")
async def calendar_auth_url(user_id: str = Depends(get_current_user_id)):
    """Returns the real Google OAuth consent URL, or configured=false if no
    GOOGLE_CLIENT_ID/SECRET is set on this server — the frontend must show
    an honest 'not configured' state rather than pretending to connect."""
    if not is_configured():
        return {"configured": False, "url": None}
    state = create_token(user_id, "")
    return {"configured": True, "url": build_auth_url(state)}


@router.get("/calendar/callback")
async def calendar_callback(code: str = "", state: str = "", error: str = ""):
    """Google redirects the raw browser here (no Authorization header), so
    the user is identified from the signed `state` token minted by
    /calendar/auth-url instead of the normal auth dependency."""
    # The frontend is a HashRouter SPA (routes live after `#`, e.g.
    # /#/profile) — a plain path redirect like /profile would either 404 or
    # silently land on `/` with the query string unreachable from React
    # Router, so every redirect here must go through the hash route.
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    if error or not code or not state:
        return RedirectResponse(f"{frontend_url}/#/profile?calendar=error")
    try:
        payload = decode_token(state)
        user_id = payload["sub"]
    except jwt.InvalidTokenError:
        return RedirectResponse(f"{frontend_url}/#/profile?calendar=error")

    try:
        tokens = exchange_code(code)
        CalendarStore().upsert(
            user_id,
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_expires_at=datetime.fromtimestamp(tokens["expires_at"]).isoformat(),
            scope=tokens["scope"],
        )
        return RedirectResponse(f"{frontend_url}/#/profile?calendar=connected")
    except Exception:
        return RedirectResponse(f"{frontend_url}/#/profile?calendar=error")


@router.post("/calendar/disconnect")
async def calendar_disconnect(user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)):
    deps["calendar"].disconnect(user_id)
    return {"connected": False}
