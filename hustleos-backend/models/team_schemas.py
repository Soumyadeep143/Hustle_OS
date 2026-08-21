from typing import Dict, List, Optional

from pydantic import BaseModel


# ---- Organization / Department — minimal placeholders, no CRUD API yet.
# Just enough shape that Team/Task can reference them without a later rename,
# per the requirement that Enterprise (Phase 2) needs no destructive migration. ----


class Organization(BaseModel):
    id: str
    name: str
    created_at: str


class Department(BaseModel):
    id: str
    organization_id: str
    name: str
    created_at: str


# ---- Member ----


class WorkingHours(BaseModel):
    days: List[str] = ["mon", "tue", "wed", "thu", "fri"]
    start: str = "09:00"
    end: str = "17:00"
    timezone: str = "UTC"


class WorkingHoursInput(BaseModel):
    days: Optional[List[str]] = None
    start: Optional[str] = None
    end: Optional[str] = None
    timezone: Optional[str] = None


class AvailabilityException(BaseModel):
    id: str
    date: str  # YYYY-MM-DD
    status: str  # pto | away | partially_available | busy
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    note: Optional[str] = None


class TeamMember(BaseModel):
    id: str
    team_id: str
    name: str
    role: str
    email: Optional[str] = None
    skills: List[str] = []
    capacity_hours_per_week: float
    working_hours: WorkingHours
    availability_exceptions: List[AvailabilityException] = []
    created_at: str
    updated_at: str


class MemberCreateRequest(BaseModel):
    name: str
    role: str
    email: Optional[str] = None
    skills: List[str] = []
    capacity_hours_per_week: float = 40.0
    working_hours: Optional[WorkingHoursInput] = None


class MemberUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    skills: Optional[List[str]] = None
    capacity_hours_per_week: Optional[float] = None
    working_hours: Optional[WorkingHoursInput] = None
    availability_exceptions: Optional[List[AvailabilityException]] = None


# ---- Task ----


class TeamTask(BaseModel):
    id: str
    organization_id: str
    team_id: str
    project_id: Optional[str] = None
    feature_id: Optional[str] = None
    sprint_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    required_skills: List[str] = []
    status: str = "todo"  # todo | in_progress | in_review | done — no "blocked" value, computed
    dependencies: List[str] = []
    estimate_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    due_at: Optional[str] = None
    priority: str = "normal"  # normal | urgent
    blocked_reason: Optional[str] = None
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None


class TeamTaskCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    feature_id: Optional[str] = None
    sprint_id: Optional[str] = None
    assignee_id: Optional[str] = None
    required_skills: List[str] = []
    estimate_hours: Optional[float] = None
    due_at: Optional[str] = None
    priority: str = "normal"
    dependencies: List[str] = []


class TeamTaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    required_skills: Optional[List[str]] = None
    dependencies: Optional[List[str]] = None
    estimate_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    due_at: Optional[str] = None
    priority: Optional[str] = None
    blocked_reason: Optional[str] = None
    project_id: Optional[str] = None
    feature_id: Optional[str] = None
    sprint_id: Optional[str] = None


# ---- Feature — first-class entity between Project and Task ----


class TeamFeature(BaseModel):
    id: str
    team_id: str
    project_id: str
    name: str
    description: Optional[str] = None
    status: str = "planned"  # planned | active | completed
    due_at: Optional[str] = None
    created_at: str
    updated_at: str


class FeatureCreateRequest(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    due_at: Optional[str] = None


# ---- Project ----


class TeamProject(BaseModel):
    id: str
    organization_id: str
    team_id: str
    name: str
    description: Optional[str] = None
    status: str = "active"  # active | on_hold | completed
    target_date: Optional[str] = None
    created_at: str
    updated_at: str


class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    target_date: Optional[str] = None


# ---- Sprint — sibling of Project, not nested under it ----


class TeamSprint(BaseModel):
    id: str
    team_id: str
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "planned"  # planned | active | completed
    created_at: str
    updated_at: str


class SprintCreateRequest(BaseModel):
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None


# ---- Recommendation — single slot per team, mirrors prospect.next_best_action ----


class Recommendation(BaseModel):
    id: str
    action_type: str  # reassign_task | unblock_task_priority_bump | no_action
    params: Dict = {}
    summary: str
    reason: str
    generated_at: str


class TeamTimelineEvent(BaseModel):
    id: str
    label: str
    detail: Optional[str] = None
    created_at: str


# ---- Computed / signal-enriched response shapes — these fields are always derived,
# never authored directly by a client. ----


class MemberWithSignals(TeamMember):
    capacity_hours: float
    assigned_hours: float
    remaining_capacity: float
    workload_ratio: float
    workload_state: str  # under | optimal | overloaded
    unestimated_open_task_count: int
    blocked_task_count: int
    current_availability: str  # available | busy | partially_available | pto | away


class TaskWithSignals(TeamTask):
    is_blocked: bool
    blocking_on: List[str] = []
    downstream_impact: List[str] = []


class FeatureWithSignals(TeamFeature):
    percent: float
    done: int
    total: int
    blocked_count: int
    blocking_tasks: List[str] = []
    risk_level: str  # unknown | low | medium | high
    remaining_hours: float
    available_capacity_hours: float
    estimate_confidence: str  # high | medium | low
    basis: str


class ProjectWithSignals(TeamProject):
    percent: float
    done: int
    total: int
    at_risk_feature_count: int
    open_blockers: int
    risk_level: str  # unknown | low | medium | high
    remaining_hours: float
    available_capacity_hours: float
    estimate_confidence: str  # high | medium | low
    basis: str


class SprintWithSignals(TeamSprint):
    percent: float
    done: int
    total: int


class Bottleneck(BaseModel):
    member_id: str
    member_name: str
    kind: str  # overloaded | blocker_owner
    detail: str


class TeamStateResponse(BaseModel):
    team_id: str
    team_name: str
    members: List[MemberWithSignals]
    tasks: List[TaskWithSignals]
    projects: List[ProjectWithSignals]
    features: List[FeatureWithSignals]
    sprints: List[SprintWithSignals]
    bottlenecks: List[Bottleneck]
    current_recommendation: Optional[Recommendation] = None
    timeline: List[TeamTimelineEvent]


class ProjectDetailResponse(ProjectWithSignals):
    features: List[FeatureWithSignals] = []


class FeatureDetailResponse(FeatureWithSignals):
    blocking_task_details: List[TaskWithSignals] = []
    responsible_members: List[MemberWithSignals] = []


class TeamCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str


class Team(BaseModel):
    id: str
    organization_id: str
    name: str
    created_at: str
    updated_at: str
