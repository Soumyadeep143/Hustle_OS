from pydantic import BaseModel
from typing import Optional, List, Dict


class MemoryFact(BaseModel):
    id: str
    type: str  # "fact" | "inference" | "recommendation" | "action"
    text: str
    source_url: Optional[str] = None
    confidence: Optional[float] = None
    created_at: str


class TimelineEvent(BaseModel):
    id: str
    label: str
    detail: Optional[str] = None
    created_at: str


class NextBestAction(BaseModel):
    action: str
    reason: str
    generated_at: str


class Prospect(BaseModel):
    id: str
    name: str
    role: Optional[str] = None
    company: str
    company_id: Optional[str] = None
    email: Optional[str] = None
    relationship: str = "new"  # new | engaged | high_intent | won | lost
    lead_score: int = 0
    intent: str = "unknown"  # low | medium | high | unknown
    next_best_action: Optional[NextBestAction] = None
    memory: List[MemoryFact] = []
    timeline: List[TimelineEvent] = []
    created_at: str
    updated_at: str
    source_url: Optional[str] = None
    notes: Optional[str] = None


class ProspectCreateRequest(BaseModel):
    name: str
    company: str
    role: Optional[str] = None
    email: Optional[str] = None
    source_url: Optional[str] = None
    notes: Optional[str] = None


class ProspectSummary(BaseModel):
    id: str
    name: str
    company: str
    role: Optional[str] = None
    relationship: str
    lead_score: int
    intent: str
    next_best_action: Optional[str] = None


class RecallDashboardResponse(BaseModel):
    total_prospects: int
    high_intent: int
    followups_today: int
    next_best_actions: List[Dict]
    insights: List[str]


class RecallQueryRequest(BaseModel):
    question: str
    user_id: str = "user_default"


class RecallQueryResponse(BaseModel):
    answer: str
    prospect_id: Optional[str] = None
    grounded: bool = True


class ApproveActionResponse(BaseModel):
    prospect: Prospect
    result: str
    executed_by: str  # "local" | "neevcloud"


class RecallActivityEvent(BaseModel):
    id: str
    agent: str
    label: str
    detail: Optional[str] = None
    prospect_id: str
    prospect_name: str
    created_at: str
