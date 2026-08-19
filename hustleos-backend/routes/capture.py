import re
from typing import Dict, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException

from agents import MemoryAgent, TaskStore
from models import CaptureCommitRequest, CaptureCommitResponse, CaptureParseRequest, CaptureParseResponse

router = APIRouter()


def get_deps() -> Dict:
    return {"memory": MemoryAgent(), "tasks": TaskStore()}


_JOB_HOSTS = re.compile(r"indeed\.|greenhouse\.io|lever\.co|myworkdayjobs")
_EVENT_HOSTS = re.compile(r"eventbrite|lu\.ma|meetup\.com|devpost\.com")


def _classify(host: str, path: str, is_url: bool) -> tuple[str, str]:
    if _JOB_HOSTS.search(host) or ("linkedin.com" in host and "/jobs/" in path):
        return "job", "Career -> Internship"
    if "linkedin.com" in host and "/in/" in path:
        return "prospect", "Network"
    if "github.com" in host:
        return "repo", "Engineering"
    if _EVENT_HOSTS.search(host):
        return "event", "Event"
    if is_url:
        return "article", "Knowledge"
    return "note", "General"


@router.post("/parse", response_model=CaptureParseResponse)
async def parse_capture(request: CaptureParseRequest):
    """No real content-extraction pipeline exists (no scraping/browsing tool in
    this backend), so this mirrors src/lib/capture.ts's heuristic server-side —
    it's the authoritative version now instead of a client-only stand-in."""
    input_text = (request.url or request.text or "").strip()
    if not input_text:
        raise HTTPException(status_code=400, detail="Nothing to parse")

    is_url = bool(re.match(r"^https?://", input_text, re.IGNORECASE))
    parsed = urlparse(input_text) if is_url else None
    host = re.sub(r"^www\.", "", parsed.hostname or "") if parsed and parsed.hostname else ""
    path = parsed.path if parsed else ""

    slug = ""
    if parsed and parsed.path:
        segments = [s for s in parsed.path.split("/") if s]
        slug = segments[-1] if segments else ""
    if not slug:
        slug = input_text
    slug = re.sub(r"[-_]+", " ", slug)
    slug = re.sub(r"\.\w+$", "", slug).strip()
    title = re.sub(r"\b\w", lambda m: m.group().upper(), slug) if slug else "Untitled capture"

    kind, category = _classify(host, path, is_url)

    fields = ["title"]
    if host:
        fields.append("org")
    location = ""
    deadline = ""
    if kind == "job":
        location = "Remote · Hybrid"
        deadline = "September 1"
        fields += ["location", "deadline"]

    return CaptureParseResponse(
        kind=kind,
        title=title,
        org=host or "Manual entry",
        location=location,
        deadline=deadline,
        category=category,
        confidence="Medium" if is_url else "Low",
        fields=fields,
        source_url=input_text if is_url else "",
    )


@router.post("/commit", response_model=CaptureCommitResponse)
async def commit_capture(request: CaptureCommitRequest, deps: Dict = Depends(get_deps)):
    """Creates the real entity for every capture kind except 'prospect', which
    already has its own richer pipeline at POST /api/recall/prospects (research
    + scoring) — the client calls that endpoint directly for prospects."""
    memory: MemoryAgent = deps["memory"]
    tasks: TaskStore = deps["tasks"]

    if request.kind == "job":
        created = memory.save_opportunity(
            company=request.org or "Unknown",
            role=request.title,
            status="captured",
            match_score=0,
            description=request.category or "Captured via Quick Capture",
        )
    elif request.kind == "task":
        created = tasks.create_task(request.user_id, request.title, request.deadline or None, "normal")
    elif request.kind in ("event", "article", "repo", "note"):
        created = memory.save_capture(
            request.kind,
            request.title,
            request.org,
            {"location": request.location, "deadline": request.deadline, "category": request.category, "source_url": request.source_url},
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported capture kind: {request.kind}")

    return CaptureCommitResponse(kind=request.kind, id=created["id"], title=created.get("title") or created.get("role", request.title))
