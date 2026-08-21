from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException

from agents import HomeStore, MemoryAgent, PlannerAgent
from auth import get_current_user_id
from models import (
    Brief,
    BriefUpdateRequest,
    Signal,
    SignalCreateRequest,
    SignalUpdateRequest,
    TimelineEntry,
    TimelineEntryCreateRequest,
    TimelineEntryUpdateRequest,
)

router = APIRouter()


def get_deps(user_id: str = Depends(get_current_user_id)) -> Dict:
    return {"store": HomeStore(), "memory": MemoryAgent(user_id=user_id), "planner": PlannerAgent()}


def _seed_timeline_entries(priorities: List[str], applications: List[Dict]) -> List[Dict]:
    """Matches the shape src/lib/adapters.ts::timelineFromDashboard used to synthesize
    client-side on every load — used once, server-side, to seed a new user's timeline so
    it isn't empty on first visit. After this, the timeline is real, editable state.
    Priority is a real structured field now (see home_store._derive_display) — no
    hardcoded 'HIGHEST PRIORITY' flag text here, it's derived from `priority`."""
    entries = []
    for i, p in enumerate(priorities[:4]):
        entries.append(
            {
                "title": p,
                "subtitle": "Highest priority" if i == 0 else "Follow up",
                "priority": "highest" if i == 0 else "none",
                "item_type": "task",
            }
        )
    stale = [a for a in applications if a["status"] != "interview"][:2]
    for app in stale:
        entries.append(
            {
                "title": f"Follow up · {app['company']}",
                "subtitle": app["role"],
                "priority": "high",
                "item_type": "follow_up",
            }
        )
    return entries


@router.get("/timeline", response_model=List[TimelineEntry])
async def list_timeline(
    date: Optional[str] = None, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)
):
    """`date` is the caller's local today (ISO, e.g. 2026-08-21) — only the
    browser knows the user's real "today". Returns that day's scheduled
    items plus every unscheduled ("Anytime") item. Omit `date` to get every
    entry regardless of date (used nowhere in the UI today, kept for
    completeness/back-compat)."""
    store = deps["store"]
    if not store.has_timeline(user_id):
        user_context = deps["memory"].get_user_context()
        priorities = deps["planner"].generate_daily_plan(user_context)
        seeded = store.seed_timeline(user_id, _seed_timeline_entries(priorities, user_context["applications"]))
        if date:
            return [e for e in seeded if e["scheduled_date"] == date or e["scheduled_date"] is None]
        return seeded
    return store.list_timeline(user_id, on_date=date)


@router.post("/timeline", response_model=TimelineEntry)
async def create_timeline_entry(
    request: TimelineEntryCreateRequest, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)
):
    store = deps["store"]
    return store.add_timeline_entry(
        user_id,
        request.title,
        subtitle=request.subtitle,
        item_type=request.item_type,
        priority=request.priority,
        scheduled_date=request.scheduled_date,
        start_time=request.start_time,
        end_time=request.end_time,
        all_day=request.all_day,
        duration_minutes=request.duration_minutes,
        reminder_minutes_before=request.reminder_minutes_before,
        timezone=request.timezone,
        calendar_target=request.calendar_target,
        notes=request.notes,
        original_phrase=request.original_phrase,
    )


@router.patch("/timeline/{entry_id}", response_model=TimelineEntry)
async def update_timeline_entry(
    entry_id: str, request: TimelineEntryUpdateRequest, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)
):
    store = deps["store"]
    entry = store.update_timeline_entry(user_id, entry_id, request.dict(exclude_unset=True))
    if not entry:
        raise HTTPException(status_code=404, detail="Timeline entry not found")
    return entry


@router.delete("/timeline/{entry_id}")
async def delete_timeline_entry(entry_id: str, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    if not store.delete_timeline_entry(user_id, entry_id):
        raise HTTPException(status_code=404, detail="Timeline entry not found")
    return {"deleted": True}


@router.get("/signals", response_model=List[Signal])
async def list_signals(user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    if not store.has_signals(user_id):
        insights = deps["memory"].detect_insights()
        seed = [{"text": text, "tag": "OPPORTUNITY" if i == 0 else "RECOMMENDATION"} for i, text in enumerate(insights[:2])]
        return store.seed_signals(user_id, seed)
    return store.list_signals(user_id)


@router.post("/signals", response_model=Signal)
async def create_signal(
    request: SignalCreateRequest, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)
):
    store = deps["store"]
    return store.add_signal(user_id, request.text, tag=request.tag, tone=request.tone)


@router.patch("/signals/{signal_id}", response_model=Signal)
async def update_signal(
    signal_id: str, request: SignalUpdateRequest, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)
):
    store = deps["store"]
    signal = store.update_signal(user_id, signal_id, request.dict(exclude_unset=True))
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    return signal


@router.delete("/signals/{signal_id}")
async def delete_signal(signal_id: str, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    if not store.delete_signal(user_id, signal_id):
        raise HTTPException(status_code=404, detail="Signal not found")
    return {"deleted": True}


@router.get("/brief", response_model=Brief)
async def get_brief(user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    brief = store.get_brief(user_id)
    if brief:
        return brief
    user_context = deps["memory"].get_user_context()
    priorities = deps["planner"].generate_daily_plan(user_context)
    action_count = len(priorities)
    headline = f"{action_count} important action{'s' if action_count != 1 else ''}" if action_count else "Nothing urgent right now"
    return store.set_brief(user_id, headline)


@router.patch("/brief", response_model=Brief)
async def update_brief(
    request: BriefUpdateRequest, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)
):
    store = deps["store"]
    return store.set_brief(user_id, request.headline)
