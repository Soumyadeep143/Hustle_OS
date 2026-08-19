from typing import Optional

from pydantic import BaseModel


class Task(BaseModel):
    id: str
    title: str
    meta: str
    due_at: Optional[str] = None
    priority: str = "normal"  # "high" | "normal"
    done: bool = False
    created_at: str


class TaskCreateRequest(BaseModel):
    title: str
    due_at: Optional[str] = None
    priority: str = "normal"
    user_id: str = "user_default"


class TaskUpdateRequest(BaseModel):
    done: bool
