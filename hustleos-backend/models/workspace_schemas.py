from typing import List, Optional

from pydantic import BaseModel


class BlockedTask(BaseModel):
    task: str
    owner: str


class TeamMember(BaseModel):
    name: str
    role: str
    status: str  # Blocked | Available | Busy


class SprintRecommendation(BaseModel):
    text: str
    actions: List[str]


class TeamSprintResponse(BaseModel):
    name: str
    percent: int
    done: int
    total: int
    blocked: List[BlockedTask]
    members: List[TeamMember]
    recommendation: SprintRecommendation


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


class TeamProject(BaseModel):
    id: str
    name: str
    percent: int
    meta: str
    at_risk: bool
