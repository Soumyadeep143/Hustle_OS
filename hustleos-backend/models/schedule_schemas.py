from typing import Optional

from pydantic import BaseModel

from .home_schemas import ItemType, Priority


class ScheduleParseRequest(BaseModel):
    text: str
    timezone: str = "UTC"


class ScheduleDraftDto(BaseModel):
    item_type: ItemType = "task"
    title: str = ""
    priority: Priority = "none"
    date: Optional[str] = None
    date_phrase: Optional[str] = None
    time_specified: bool = False
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    all_day: bool = False
    duration_minutes: Optional[int] = None
    reminder_minutes_before: Optional[int] = None
    original_phrase: str = ""
    ambiguous: bool = False
    ambiguity_reason: Optional[str] = None
    confidence: str = "high"


class CalendarSyncResponse(BaseModel):
    synced: bool
    message: str
