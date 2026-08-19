from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class VoiceTranscribeRequest(BaseModel):
    audio: bytes


class VoiceCommandRequest(BaseModel):
    transcript: str
    user_id: str = "user_default"


class VoiceResponse(BaseModel):
    response: str
    audio_url: Optional[str] = None


class Opportunity(BaseModel):
    id: str
    company: str
    role: str
    description: str
    salary: Optional[str] = None
    location: Optional[str] = None
    score: Optional[int] = None


class OpportunityDiscoverRequest(BaseModel):
    role: str
    location: str


class OpportunityApplyRequest(BaseModel):
    opportunity_id: str
    user_id: str = "user_default"


class Application(BaseModel):
    id: str
    company: str
    role: str
    applied_at: str
    status: str  # "applied", "reviewing", "interview"
    match_score: int
    description: str
    last_followup: Optional[str] = None
    notes: Optional[str] = None


class ApplicationCreateRequest(BaseModel):
    company: str
    role: str
    status: str = "applied"
    match_score: int = 0
    description: str = ""
    applied_at: Optional[str] = None
    last_followup: Optional[str] = None
    notes: Optional[str] = None


class ApplicationUpdateRequest(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    match_score: Optional[int] = None
    description: Optional[str] = None
    applied_at: Optional[str] = None
    last_followup: Optional[str] = None
    notes: Optional[str] = None


class UserProfile(BaseModel):
    name: str
    email: str
    target_role: str
    target_location: str
    skills: List[str]
    bio: Optional[str] = None


class MemoryResponse(BaseModel):
    user_profile: UserProfile
    applications: List[Application]
    insights: List[str]


class DashboardResponse(BaseModel):
    total_applications: int
    followups_due: int
    execution_score: int
    priorities: List[str]
    metrics: Dict[str, float]


class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "default"
