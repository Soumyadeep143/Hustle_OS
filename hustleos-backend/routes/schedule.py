from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from agents import CalendarStore, HomeStore
from agents.calendar_client import create_event, is_configured, refresh_access_token
from agents.schedule_engine import parse_schedule_text
from auth import get_current_user_id
from models import CalendarSyncResponse, ScheduleDraftDto, ScheduleParseRequest

router = APIRouter()


def get_deps() -> Dict:
    return {"home": HomeStore(), "calendar": CalendarStore()}


@router.post("/parse", response_model=ScheduleDraftDto)
async def parse_schedule(request: ScheduleParseRequest):
    """Shared natural-language scheduling entry point — the Quick Add text
    box and the voice pipeline (agents/voice_agent.py) both go through
    agents/schedule_engine.parse_schedule_text, so text and voice never
    diverge."""
    draft = parse_schedule_text(request.text, timezone=request.timezone)
    return ScheduleDraftDto(**draft.__dict__)


@router.post("/{entry_id}/sync-calendar", response_model=CalendarSyncResponse)
async def sync_calendar(entry_id: str, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)):
    """Attempts to create the corresponding Google Calendar event. Never
    claims success unless the Google API call actually succeeded — if the
    user isn't connected (or Google OAuth isn't configured on this server at
    all), reports that honestly instead."""
    home: HomeStore = deps["home"]
    calendar: CalendarStore = deps["calendar"]

    entry = home.get_timeline_entry(user_id, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Timeline entry not found")

    if not is_configured():
        return CalendarSyncResponse(synced=False, message="Saved to HustleOS. Connect Google Calendar to sync it.")

    connection = calendar.get(user_id)
    if not connection:
        return CalendarSyncResponse(synced=False, message="Saved to HustleOS. Connect Google Calendar to sync it.")

    if not entry.get("scheduled_date"):
        return CalendarSyncResponse(synced=False, message="Add a date before syncing to Google Calendar.")

    try:
        import time as _time
        from datetime import datetime, timezone

        access_token = connection["access_token"]
        stored_expiry = datetime.fromisoformat(connection["token_expires_at"])
        if stored_expiry.tzinfo is None:
            stored_expiry = stored_expiry.replace(tzinfo=timezone.utc)
        expires_at = stored_expiry.timestamp()
        if expires_at <= _time.time():
            refreshed = refresh_access_token(connection["refresh_token"])
            access_token = refreshed["access_token"]
            # See the matching note in routes/integrations.py's OAuth
            # callback -- fromtimestamp() needs tz=utc or a server running
            # ahead of UTC stores every refreshed expiry hours too late.
            calendar.update_access_token(
                user_id, access_token, datetime.fromtimestamp(refreshed["expires_at"], tz=timezone.utc).isoformat()
            )

        event = create_event(
            access_token,
            title=entry["title"],
            timezone=entry.get("timezone") or "UTC",
            date_iso=entry["scheduled_date"],
            start_time=entry.get("start_time"),
            end_time=entry.get("end_time"),
            all_day=entry.get("all_day", False),
            notes=entry.get("notes"),
        )
        home.set_calendar_sync(user_id, entry_id, event["id"])
        return CalendarSyncResponse(synced=True, message="Synced to Google Calendar.")
    except Exception:
        return CalendarSyncResponse(
            synced=False, message="Couldn't sync to Google Calendar — saved to HustleOS only."
        )
