"""Real Google Calendar OAuth + event creation over Google's REST API via
httpx (already a project dependency — no google-auth/google-api-python-client
needed). Inert until GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are set in .env:
callers must check is_configured() and report an honest "not connected"
state rather than faking a sync, per product spec."""

import os
import time
from typing import Dict, Optional
from urllib.parse import urlencode

import httpx

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
SCOPE = "https://www.googleapis.com/auth/calendar.events"


def is_configured() -> bool:
    return bool(os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"))


def build_auth_url(state: str) -> str:
    params = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI", ""),
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str) -> Dict:
    """Returns {access_token, refresh_token, expires_at (unix ts), scope}."""
    resp = httpx.post(
        TOKEN_URL,
        data={
            "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI", ""),
        },
        timeout=15.0,
    )
    resp.raise_for_status()
    data = resp.json()
    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token", ""),
        "expires_at": time.time() + data.get("expires_in", 3600),
        "scope": data.get("scope", SCOPE),
    }


def refresh_access_token(refresh_token: str) -> Dict:
    """Returns {access_token, expires_at (unix ts)}."""
    resp = httpx.post(
        TOKEN_URL,
        data={
            "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=15.0,
    )
    resp.raise_for_status()
    data = resp.json()
    return {"access_token": data["access_token"], "expires_at": time.time() + data.get("expires_in", 3600)}


def create_event(
    access_token: str,
    title: str,
    timezone: str,
    date_iso: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    all_day: bool = False,
    notes: Optional[str] = None,
) -> Dict:
    """Creates an event on the user's primary calendar. Raises on failure —
    callers must not report a sync as successful unless this returns."""
    if all_day or not start_time:
        start = {"date": date_iso}
        end = {"date": date_iso}
    else:
        end_t = end_time or start_time
        start = {"dateTime": f"{date_iso}T{start_time}:00", "timeZone": timezone}
        end = {"dateTime": f"{date_iso}T{end_t}:00", "timeZone": timezone}

    body = {"summary": title, "description": notes or "", "start": start, "end": end}
    resp = httpx.post(
        EVENTS_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        json=body,
        timeout=15.0,
    )
    resp.raise_for_status()
    return resp.json()
