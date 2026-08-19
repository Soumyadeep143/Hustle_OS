from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query

from agents import HomeStore, MemoryAgent, PlannerAgent
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


def get_deps() -> Dict:
    return {"store": HomeStore(), "memory": MemoryAgent(), "planner": PlannerAgent()}


def _seed_timeline_entries(priorities: List[str], applications: List[Dict]) -> List[Dict]:
    """Matches the shape src/lib/adapters.ts::timelineFromDashboard used to synthesize
    client-side on every load — used once, server-side, to seed a new user's timeline so
    it isn't empty on first visit. After this, the timeline is real, editable state."""
    entries = []
    for i, p in enumerate(priorities[:4]):
        entries.append(
            {
                "title": p,
                "at": "Now" if i == 0 else f"+{i}h",
                "subtitle": "Highest priority" if i == 0 else "Follow up",
                "tone": "blue" if i == 0 else "neutral",
                "flag": "HIGHEST PRIORITY" if i == 0 else None,
            }
        )
    stale = [a for a in applications if a["status"] != "interview"][:2]
    for app in stale:
        entries.append(
            {
                "title": f"Follow up · {app['company']}",
                "at": "Today",
                "subtitle": app["role"],
                "tone": "red",
                "flag": "OVERDUE",
            }
        )
    return entries


@router.get("/timeline", response_model=List[TimelineEntry])
async def list_timeline(user_id: str = Query("user_default"), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    if not store.has_timeline(user_id):
        user_context = deps["memory"].get_user_context()
        priorities = deps["planner"].generate_daily_plan(user_context)
        return store.seed_timeline(user_id, _seed_timeline_entries(priorities, user_context["applications"]))
    return store.list_timeline(user_id)


@router.post("/timeline", response_model=TimelineEntry)
async def create_timeline_entry(request: TimelineEntryCreateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    return store.add_timeline_entry(
        request.user_id, request.title, at=request.at, subtitle=request.subtitle, tone=request.tone, flag=request.flag
    )


@router.patch("/timeline/{entry_id}", response_model=TimelineEntry)
async def update_timeline_entry(
    entry_id: str, request: TimelineEntryUpdateRequest, user_id: str = Query("user_default"), deps: Dict = Depends(get_deps)
):
    store = deps["store"]
    entry = store.update_timeline_entry(user_id, entry_id, request.dict(exclude_unset=True))
    if not entry:
        raise HTTPException(status_code=404, detail="Timeline entry not found")
    return entry


@router.delete("/timeline/{entry_id}")
async def delete_timeline_entry(entry_id: str, user_id: str = Query("user_default"), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    if not store.delete_timeline_entry(user_id, entry_id):
        raise HTTPException(status_code=404, detail="Timeline entry not found")
    return {"deleted": True}


@router.get("/signals", response_model=List[Signal])
async def list_signals(user_id: str = Query("user_default"), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    if not store.has_signals(user_id):
        insights = deps["memory"].detect_insights()
        seed = [{"text": text, "tag": "OPPORTUNITY" if i == 0 else "RECOMMENDATION"} for i, text in enumerate(insights[:2])]
        return store.seed_signals(user_id, seed)
    return store.list_signals(user_id)


@router.post("/signals", response_model=Signal)
async def create_signal(request: SignalCreateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    return store.add_signal(request.user_id, request.text, tag=request.tag, tone=request.tone)


@router.patch("/signals/{signal_id}", response_model=Signal)
async def update_signal(
    signal_id: str, request: SignalUpdateRequest, user_id: str = Query("user_default"), deps: Dict = Depends(get_deps)
):
    store = deps["store"]
    signal = store.update_signal(user_id, signal_id, request.dict(exclude_unset=True))
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    return signal


@router.delete("/signals/{signal_id}")
async def delete_signal(signal_id: str, user_id: str = Query("user_default"), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    if not store.delete_signal(user_id, signal_id):
        raise HTTPException(status_code=404, detail="Signal not found")
    return {"deleted": True}


@router.get("/brief", response_model=Brief)
async def get_brief(user_id: str = Query("user_default"), deps: Dict = Depends(get_deps)):
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
async def update_brief(request: BriefUpdateRequest, user_id: str = Query("user_default"), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    return store.set_brief(user_id, request.headline)
