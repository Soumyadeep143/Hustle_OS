from typing import Optional

from pydantic import BaseModel


class TimelineEntry(BaseModel):
    id: str
    user_id: str
    at: str  # display label, e.g. "Now", "+1h", "Today" — free text, user-editable
    title: str
    subtitle: Optional[str] = None
    tone: str = "neutral"  # blue | red | neutral
    flag: Optional[str] = None
    created_at: str
    updated_at: str


class TimelineEntryCreateRequest(BaseModel):
    at: str = "Today"
    title: str
    subtitle: Optional[str] = None
    tone: str = "neutral"
    flag: Optional[str] = None
    user_id: str = "user_default"


class TimelineEntryUpdateRequest(BaseModel):
    at: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    tone: Optional[str] = None
    flag: Optional[str] = None


class Signal(BaseModel):
    id: str
    user_id: str
    text: str
    tag: str = "RECOMMENDATION"  # OPPORTUNITY | RECOMMENDATION | free text
    tone: str = "yellow"
    created_at: str
    updated_at: str


class SignalCreateRequest(BaseModel):
    text: str
    tag: str = "RECOMMENDATION"
    tone: str = "yellow"
    user_id: str = "user_default"


class SignalUpdateRequest(BaseModel):
    text: Optional[str] = None
    tag: Optional[str] = None
    tone: Optional[str] = None


class Brief(BaseModel):
    user_id: str
    headline: str
    updated_at: str


class BriefUpdateRequest(BaseModel):
    headline: str
