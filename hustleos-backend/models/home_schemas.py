from typing import Literal, Optional

from pydantic import BaseModel

ItemType = Literal["task", "event", "interview", "follow_up", "reminder", "deadline"]
Priority = Literal["highest", "high", "medium", "low", "none"]
CalendarTarget = Literal["none", "google"]


class TimelineEntry(BaseModel):
    id: str
    user_id: str
    at: str  # server-computed display label — never trust this for scheduling logic
    title: str
    subtitle: Optional[str] = None
    tone: str = "neutral"  # blue | red | yellow | green | neutral — derived from priority
    flag: Optional[str] = None  # derived from priority
    item_type: ItemType = "task"
    priority: Priority = "none"
    scheduled_date: Optional[str] = None  # resolved ISO date; null = unscheduled "Anytime"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    all_day: bool = False
    duration_minutes: Optional[int] = None
    reminder_minutes_before: Optional[int] = None
    timezone: Optional[str] = None
    calendar_target: CalendarTarget = "none"
    calendar_event_id: Optional[str] = None
    calendar_synced_at: Optional[str] = None
    notes: Optional[str] = None
    original_phrase: Optional[str] = None
    completed: bool = False
    completed_at: Optional[str] = None
    created_at: str
    updated_at: str


class TimelineEntryCreateRequest(BaseModel):
    title: str
    subtitle: Optional[str] = None
    item_type: ItemType = "task"
    priority: Priority = "none"
    scheduled_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    all_day: bool = False
    duration_minutes: Optional[int] = None
    reminder_minutes_before: Optional[int] = None
    timezone: Optional[str] = None
    calendar_target: CalendarTarget = "none"
    notes: Optional[str] = None
    original_phrase: Optional[str] = None
    user_id: str = "user_default"


class TimelineEntryUpdateRequest(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    item_type: Optional[ItemType] = None
    priority: Optional[Priority] = None
    scheduled_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    all_day: Optional[bool] = None
    duration_minutes: Optional[int] = None
    reminder_minutes_before: Optional[int] = None
    timezone: Optional[str] = None
    calendar_target: Optional[CalendarTarget] = None
    notes: Optional[str] = None
    completed: Optional[bool] = None

    # Escape hatches for clearing a nullable field back to null (exclude_unset
    # on the base fields above can't distinguish "not sent" from "send null").
    clear_scheduled_date: bool = False
    clear_start_time: bool = False
    clear_end_time: bool = False


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
