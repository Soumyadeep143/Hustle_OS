from typing import List, Optional

from pydantic import BaseModel


class OrgHealthRow(BaseModel):
    label: str
    value: str
    tone: Optional[str] = None  # red | yellow | blue | None


class OrgInsightLine(BaseModel):
    text: str
    tone: Optional[str] = None


class OrgHealthResponse(BaseModel):
    execution_health: int
    delta: str
    rows: List[OrgHealthRow]
    insight_lines: List[OrgInsightLine]
