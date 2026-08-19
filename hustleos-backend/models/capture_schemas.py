from typing import List, Optional

from pydantic import BaseModel


class CaptureParseRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None


class CaptureParseResponse(BaseModel):
    kind: str  # job | event | repo | article | prospect | note | task
    title: str
    org: str
    location: str = ""
    deadline: str = ""
    category: str = ""
    confidence: str = "Medium"  # High | Medium | Low
    fields: List[str] = []
    source_url: str = ""


class CaptureCommitRequest(BaseModel):
    kind: str
    title: str
    org: str = ""
    location: str = ""
    deadline: str = ""
    category: str = ""
    source_url: str = ""
    user_id: str = "user_default"


class CaptureCommitResponse(BaseModel):
    kind: str
    id: str
    title: str
