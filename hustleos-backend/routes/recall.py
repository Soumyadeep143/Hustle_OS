from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException

from agents import MemoryAgent, RecallStore, ResearchAgent, StrategyAgent
from agents.recall_source import detect_source, source_display_for
from auth import get_current_user_id
from models import (
    RecallAnalyzeRequest,
    RecallAnalyzeResponse,
    RecallDashboardResponse,
    RecallFollowUpRequest,
    RecallItem,
    RecallItemCreateRequest,
    RecallItemUpdateRequest,
    RecallRefineNoteRequest,
    RecallRefineNoteResponse,
)

router = APIRouter()


def get_deps(user_id: str = Depends(get_current_user_id)) -> Dict:
    return {
        "store": RecallStore(user_id),
        "memory": MemoryAgent(user_id=user_id),
        "research": ResearchAgent(),
        "strategy": StrategyAgent(),
    }


def _to_item(row: Dict, timeline: Optional[List[Dict]] = None) -> RecallItem:
    return RecallItem(**row, source_display=source_display_for(row["source"]), timeline=timeline or [])


@router.post("/analyze", response_model=RecallAnalyzeResponse)
async def analyze(request: RecallAnalyzeRequest, deps: Dict = Depends(get_deps)):
    """The 'Analyze' step: source detection + AI enrichment, not persisted.
    The user reviews/edits the result before POST /items actually saves it."""
    if not (request.url or "").strip() and not (request.description or "").strip():
        raise HTTPException(status_code=400, detail="Paste a link or add a description first")

    source, source_display = detect_source(request.url)
    enrichment = deps["research"].enrich(source_display, request.url, request.description)
    suggestion = deps["strategy"].suggest(
        enrichment.get("category") or "Other",
        enrichment.get("ai_summary") or request.description,
    )

    return RecallAnalyzeResponse(
        source=source,
        source_display=source_display,
        title=enrichment.get("title") or "Untitled capture",
        category=enrichment.get("category") or "Other",
        subcategory=enrichment.get("subcategory"),
        ai_summary=enrichment.get("ai_summary"),
        company=enrichment.get("company"),
        person=enrichment.get("person"),
        location=enrichment.get("location"),
        event_date=enrichment.get("event_date"),
        opportunity=enrichment.get("opportunity"),
        status_suggestion=suggestion.get("status_suggestion", "saved"),
        priority_suggestion=suggestion.get("priority_suggestion"),
        potential_action=suggestion.get("potential_action"),
        confidence=enrichment.get("confidence", "Medium"),
        extraction_note=enrichment.get("extraction_note"),
        tags=enrichment.get("tags") or [],
    )


@router.post("/refine-note", response_model=RecallRefineNoteResponse)
async def refine_note(request: RecallRefineNoteRequest, deps: Dict = Depends(get_deps)):
    """Cleans up a voice-dictated capture note (filler words, grammar) before
    it lands in the description field — called right after speech-to-text,
    separately from /analyze's URL+description understanding pass."""
    cleaned = deps["research"].refine_dictation(request.text)
    return RecallRefineNoteResponse(text=cleaned)


@router.post("/items", response_model=RecallItem)
async def create_item(request: RecallItemCreateRequest, deps: Dict = Depends(get_deps)):
    store: RecallStore = deps["store"]
    source, source_display = detect_source(request.url)

    fields = request.dict()
    fields["source"] = source
    item = store.create_item(fields)

    store.add_timeline_event(item["id"], "CAPTURED", f"Captured from {source_display}", request.url)
    store.add_timeline_event(item["id"], "CATEGORIZED", f"Categorized as {item['category']}", item.get("subcategory"))

    return _to_item(item, store.list_timeline(item["id"]))


@router.get("/items", response_model=List[RecallItem])
async def list_items(
    status: Optional[str] = None,
    category: Optional[str] = None,
    source: Optional[str] = None,
    deps: Dict = Depends(get_deps),
):
    store: RecallStore = deps["store"]
    items = store.list_items(status=status, category=category, source=source)
    return [_to_item(i) for i in items]


@router.get("/items/{item_id}", response_model=RecallItem)
async def get_item(item_id: str, deps: Dict = Depends(get_deps)):
    store: RecallStore = deps["store"]
    item = store.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return _to_item(item, store.list_timeline(item_id))


@router.patch("/items/{item_id}", response_model=RecallItem)
async def update_item(item_id: str, request: RecallItemUpdateRequest, deps: Dict = Depends(get_deps)):
    store: RecallStore = deps["store"]
    existing = store.get_item(item_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")

    fields = request.dict(exclude_unset=True)
    if not fields:
        return _to_item(existing, store.list_timeline(item_id))

    updated = store.update_item(item_id, fields)

    if "status" in fields and fields["status"] != existing["status"]:
        store.add_timeline_event(item_id, "STATUS_CHANGED", f"Status changed to {fields['status']}", f"was {existing['status']}")
    if "notes" in fields and fields["notes"] and fields["notes"] != existing.get("notes"):
        store.add_timeline_event(item_id, "NOTE_ADDED", "Note added", fields["notes"][:200])
    other_fields = [k for k in fields if k not in ("status", "notes")]
    if other_fields:
        store.add_timeline_event(item_id, "UPDATED", "Details edited", ", ".join(other_fields))

    return _to_item(updated, store.list_timeline(item_id))


@router.post("/items/{item_id}/follow-up", response_model=RecallItem)
async def set_follow_up(item_id: str, request: RecallFollowUpRequest, deps: Dict = Depends(get_deps)):
    store: RecallStore = deps["store"]
    existing = store.get_item(item_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")

    had_follow_up = bool(existing.get("follow_up_at"))
    updated = store.set_follow_up(item_id, request.follow_up_at, request.follow_up_note)

    if request.follow_up_at:
        store.add_timeline_event(item_id, "FOLLOW_UP_CREATED", f"Follow-up scheduled for {request.follow_up_at}", request.follow_up_note)
    elif had_follow_up:
        store.add_timeline_event(item_id, "FOLLOW_UP_COMPLETED", "Follow-up cleared", request.follow_up_note)

    return _to_item(updated, store.list_timeline(item_id))


@router.post("/items/{item_id}/mark-applied", response_model=RecallItem)
async def mark_applied(item_id: str, deps: Dict = Depends(get_deps)):
    """Connects a RECALL item to the real Applications system instead of
    keeping a second application record — the application created here is
    the same entity Work → Applications reads and edits."""
    store: RecallStore = deps["store"]
    memory: MemoryAgent = deps["memory"]
    item = store.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.get("related_application_id"):
        raise HTTPException(status_code=400, detail="Already linked to an application")

    application = memory.add_application(
        company=item.get("company") or item["title"],
        role=item["title"],
        status="applied",
        description=item.get("ai_summary") or item.get("description") or "",
        applied_at=date.today().isoformat(),
    )
    updated = store.update_item(item_id, {"related_application_id": application["id"], "status": "applied"})
    store.add_timeline_event(item_id, "APPLICATION_CREATED", f"Application created for {application['company']}", application["id"])
    store.add_timeline_event(item_id, "MARKED_APPLIED", "Marked as applied", date.today().isoformat())

    return _to_item(updated, store.list_timeline(item_id))


@router.post("/items/{item_id}/archive", response_model=RecallItem)
async def archive_item(item_id: str, deps: Dict = Depends(get_deps)):
    store: RecallStore = deps["store"]
    existing = store.get_item(item_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    updated = store.update_item(item_id, {"status": "archived"})
    store.add_timeline_event(item_id, "ARCHIVED", "Archived")
    return _to_item(updated, store.list_timeline(item_id))


@router.get("/dashboard", response_model=RecallDashboardResponse)
async def dashboard(deps: Dict = Depends(get_deps)):
    """Every number here is a real count over this user's rows — no
    placeholder metrics. Applications/Interviews come from the real
    Applications table so RECALL and Work never disagree."""
    store: RecallStore = deps["store"]
    memory: MemoryAgent = deps["memory"]

    items = store.list_items()
    applications = memory.get_applications()

    active_items = [i for i in items if i["status"] != "archived"]
    saved = sum(1 for i in items if i["status"] == "saved")
    follow_ups = sum(1 for i in active_items if i.get("follow_up_at"))
    opportunities = sum(
        1 for i in active_items if i["status"] == "opportunity" or i["category"] in ("Business Opportunity", "Startup")
    )
    active_applications = sum(1 for a in applications if a["status"] in ("applied", "reviewing"))
    interviews = sum(1 for a in applications if a["status"] == "interview")

    return RecallDashboardResponse(
        saved=saved,
        applications=active_applications,
        follow_ups=follow_ups,
        interviews=interviews,
        opportunities=opportunities,
        total=len(active_items),
        has_data=len(items) > 0 or len(applications) > 0,
    )
