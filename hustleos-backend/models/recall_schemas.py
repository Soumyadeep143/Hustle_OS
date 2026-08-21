from typing import List, Literal, Optional

from pydantic import BaseModel

RecallSource = Literal["linkedin", "x", "instagram", "reddit", "other"]
RecallStatus = Literal[
    "saved", "interested", "applied", "following_up", "interview",
    "responded", "opportunity", "completed", "archived",
]
RecallPriority = Literal["low", "medium", "high"]


class RecallTimelineEvent(BaseModel):
    id: str
    event_type: str
    label: str
    detail: Optional[str] = None
    created_at: str


class RecallItem(BaseModel):
    id: str
    user_id: str
    url: Optional[str] = None
    source: RecallSource
    source_display: str

    title: str
    description: str = ""
    notes: str = ""
    ai_summary: Optional[str] = None

    category: str = "Other"
    subcategory: Optional[str] = None
    tags: List[str] = []

    status: RecallStatus = "saved"
    priority: Optional[RecallPriority] = None

    company: Optional[str] = None
    person: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[str] = None

    follow_up_at: Optional[str] = None
    follow_up_note: Optional[str] = None

    related_application_id: Optional[str] = None

    created_at: str
    updated_at: str
    timeline: List[RecallTimelineEvent] = []


class RecallItemCreateRequest(BaseModel):
    url: Optional[str] = None
    title: str
    description: str = ""
    notes: str = ""
    ai_summary: Optional[str] = None
    category: str = "Other"
    subcategory: Optional[str] = None
    tags: List[str] = []
    status: RecallStatus = "saved"
    priority: Optional[RecallPriority] = None
    company: Optional[str] = None
    person: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[str] = None
    follow_up_at: Optional[str] = None
    follow_up_note: Optional[str] = None


class RecallItemUpdateRequest(BaseModel):
    source: Optional[RecallSource] = None
    title: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    ai_summary: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[RecallStatus] = None
    priority: Optional[RecallPriority] = None
    company: Optional[str] = None
    person: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[str] = None
    url: Optional[str] = None


class RecallFollowUpRequest(BaseModel):
    follow_up_at: Optional[str] = None
    follow_up_note: Optional[str] = None


class RecallAnalyzeRequest(BaseModel):
    url: Optional[str] = None
    description: str = ""


class RecallAnalyzeResponse(BaseModel):
    source: RecallSource
    source_display: str
    title: str
    category: str
    subcategory: Optional[str] = None
    ai_summary: Optional[str] = None
    company: Optional[str] = None
    person: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[str] = None
    opportunity: Optional[str] = None
    status_suggestion: RecallStatus = "saved"
    priority_suggestion: Optional[RecallPriority] = None
    potential_action: Optional[str] = None
    confidence: Literal["High", "Medium", "Low"] = "Medium"
    extraction_note: Optional[str] = None


class RecallRefineNoteRequest(BaseModel):
    text: str


class RecallRefineNoteResponse(BaseModel):
    text: str


class RecallDashboardResponse(BaseModel):
    saved: int
    applications: int
    follow_ups: int
    interviews: int
    opportunities: int
    total: int
    has_data: bool
