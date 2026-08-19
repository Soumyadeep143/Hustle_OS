import asyncio
import json
from typing import Callable, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from agents import CapacityAgent, RecommendationAgent, TeamActionAgent, get_team_repository
from models import (
    Bottleneck,
    FeatureCreateRequest,
    FeatureDetailResponse,
    FeatureWithSignals,
    MemberCreateRequest,
    MemberUpdateRequest,
    MemberWithSignals,
    ProjectCreateRequest,
    ProjectDetailResponse,
    ProjectWithSignals,
    Recommendation,
    SprintCreateRequest,
    SprintWithSignals,
    Team,
    TeamCreateRequest,
    TeamStateResponse,
    TeamTimelineEvent,
    TeamTaskCreateRequest,
    TeamTaskUpdateRequest,
    TaskWithSignals,
)

router = APIRouter()

DEFAULT_TEAM_ID = "default"


def get_deps() -> Dict:
    return {
        "store": get_team_repository(),
        "capacity": CapacityAgent(),
        "recommendation": RecommendationAgent(),
        "action": TeamActionAgent(),
    }


def _build_team_state(team: Dict, capacity: CapacityAgent) -> TeamStateResponse:
    signals = capacity.compute_team_signals(team)
    return TeamStateResponse(
        team_id=team["id"],
        team_name=team["name"],
        members=[MemberWithSignals(**m) for m in signals["members"]],
        tasks=[TaskWithSignals(**t) for t in signals["tasks"]],
        projects=[ProjectWithSignals(**p) for p in signals["projects"]],
        features=[FeatureWithSignals(**f) for f in signals["features"]],
        sprints=[SprintWithSignals(**s) for s in signals["sprints"]],
        bottlenecks=[Bottleneck(**b) for b in signals["bottlenecks"]],
        current_recommendation=Recommendation(**team["current_recommendation"])
        if team.get("current_recommendation")
        else None,
        timeline=[TeamTimelineEvent(**e) for e in team["timeline"]],
    )


# ---- Team ----


@router.post("", response_model=Team)
async def create_team(request: TeamCreateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    return store.create_team(name=request.name, team_id=request.id)


@router.get("/{team_id}", response_model=TeamStateResponse)
async def get_team_state(team_id: str, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    team = store.get_or_create_team(team_id)
    return _build_team_state(team, deps["capacity"])


# ---- Members ----


@router.post("/{team_id}/members", response_model=MemberWithSignals)
async def add_member(team_id: str, request: MemberCreateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    working_hours = request.working_hours.dict(exclude_none=True) if request.working_hours else None
    member = store.add_member(
        team_id,
        request.name,
        request.role,
        email=request.email,
        skills=request.skills,
        capacity_hours_per_week=request.capacity_hours_per_week,
        working_hours=working_hours,
    )
    team = store.get_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    enriched = next(m for m in signals["members"] if m["id"] == member["id"])
    return MemberWithSignals(**enriched)


@router.get("/{team_id}/members", response_model=List[MemberWithSignals])
async def list_members(team_id: str, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    team = store.get_or_create_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    return [MemberWithSignals(**m) for m in signals["members"]]


@router.patch("/{team_id}/members/{member_id}", response_model=MemberWithSignals)
async def update_member(team_id: str, member_id: str, request: MemberUpdateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    updates = request.dict(exclude_unset=True)
    if "working_hours" in updates and updates["working_hours"] is not None:
        updates["working_hours"] = {k: v for k, v in updates["working_hours"].items() if v is not None}
    if "availability_exceptions" in updates and updates["availability_exceptions"] is not None:
        updates["availability_exceptions"] = [dict(e) for e in updates["availability_exceptions"]]
    member = store.update_member(team_id, member_id, updates)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    team = store.get_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    enriched = next(m for m in signals["members"] if m["id"] == member_id)
    return MemberWithSignals(**enriched)


# ---- Tasks ----


@router.post("/{team_id}/tasks", response_model=TaskWithSignals)
async def add_task(team_id: str, request: TeamTaskCreateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    task = store.add_task(team_id, request.title, **request.dict(exclude={"title"}))
    team = store.get_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    enriched = next(t for t in signals["tasks"] if t["id"] == task["id"])
    return TaskWithSignals(**enriched)


@router.get("/{team_id}/tasks", response_model=List[TaskWithSignals])
async def list_tasks(
    team_id: str,
    status: str = None,
    assignee_id: str = None,
    project_id: str = None,
    sprint_id: str = None,
    deps: Dict = Depends(get_deps),
):
    store = deps["store"]
    team = store.get_or_create_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    tasks = signals["tasks"]
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    if assignee_id:
        tasks = [t for t in tasks if t.get("assignee_id") == assignee_id]
    if project_id:
        tasks = [t for t in tasks if t.get("project_id") == project_id]
    if sprint_id:
        tasks = [t for t in tasks if t.get("sprint_id") == sprint_id]
    return [TaskWithSignals(**t) for t in tasks]


@router.patch("/{team_id}/tasks/{task_id}", response_model=TaskWithSignals)
async def update_task(team_id: str, task_id: str, request: TeamTaskUpdateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    updates = request.dict(exclude_unset=True)
    task = store.update_task(team_id, task_id, updates)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    team = store.get_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    enriched = next(t for t in signals["tasks"] if t["id"] == task_id)
    return TaskWithSignals(**enriched)


# ---- Features ----


@router.post("/{team_id}/features", response_model=FeatureWithSignals)
async def add_feature(team_id: str, request: FeatureCreateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    feature = store.add_feature(team_id, request.project_id, request.name, request.description, request.due_at)
    team = store.get_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    enriched = next(f for f in signals["features"] if f["id"] == feature["id"])
    return FeatureWithSignals(**enriched)


@router.get("/{team_id}/features", response_model=List[FeatureWithSignals])
async def list_features(team_id: str, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    team = store.get_or_create_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    return [FeatureWithSignals(**f) for f in signals["features"]]


@router.get("/{team_id}/features/{feature_id}", response_model=FeatureDetailResponse)
async def get_feature(team_id: str, feature_id: str, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    team = store.get_team(team_id)
    if not team or feature_id not in team["features"]:
        raise HTTPException(status_code=404, detail="Feature not found")
    signals = deps["capacity"].compute_team_signals(team)
    feature = next(f for f in signals["features"] if f["id"] == feature_id)
    blocking_tasks = [t for t in signals["tasks"] if t["id"] in feature["blocking_tasks"]]
    feature_tasks = [t for t in signals["tasks"] if t.get("feature_id") == feature_id]
    responsible_ids = {t["assignee_id"] for t in feature_tasks if t.get("assignee_id")}
    responsible_members = [m for m in signals["members"] if m["id"] in responsible_ids]
    return FeatureDetailResponse(
        **feature,
        blocking_task_details=[TaskWithSignals(**t) for t in blocking_tasks],
        responsible_members=[MemberWithSignals(**m) for m in responsible_members],
    )


# ---- Projects ----


@router.post("/{team_id}/projects", response_model=ProjectWithSignals)
async def add_project(team_id: str, request: ProjectCreateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    project = store.add_project(team_id, request.name, request.description, request.target_date)
    team = store.get_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    enriched = next(p for p in signals["projects"] if p["id"] == project["id"])
    return ProjectWithSignals(**enriched)


@router.get("/{team_id}/projects", response_model=List[ProjectWithSignals])
async def list_projects(team_id: str, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    team = store.get_or_create_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    return [ProjectWithSignals(**p) for p in signals["projects"]]


@router.get("/{team_id}/projects/{project_id}", response_model=ProjectDetailResponse)
async def get_project(team_id: str, project_id: str, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    team = store.get_team(team_id)
    if not team or project_id not in team["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    signals = deps["capacity"].compute_team_signals(team)
    project = next(p for p in signals["projects"] if p["id"] == project_id)
    features = [f for f in signals["features"] if f.get("project_id") == project_id]
    return ProjectDetailResponse(**project, features=[FeatureWithSignals(**f) for f in features])


# ---- Sprints ----


@router.post("/{team_id}/sprints", response_model=SprintWithSignals)
async def add_sprint(team_id: str, request: SprintCreateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    sprint = store.add_sprint(team_id, request.name, request.start_date, request.end_date)
    team = store.get_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    enriched = next(s for s in signals["sprints"] if s["id"] == sprint["id"])
    return SprintWithSignals(**enriched)


@router.get("/{team_id}/sprints", response_model=List[SprintWithSignals])
async def list_sprints(team_id: str, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    team = store.get_or_create_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    return [SprintWithSignals(**s) for s in signals["sprints"]]


# ---- Recommendation ----


@router.post("/{team_id}/recommendation/generate", response_model=Recommendation)
async def generate_recommendation(team_id: str, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    team = store.get_or_create_team(team_id)
    signals = deps["capacity"].compute_team_signals(team)
    rec = deps["recommendation"].recommend(team, signals)
    store.set_recommendation(team_id, rec)
    store.add_timeline_event(team_id, "Recommendation generated", rec["summary"])
    return Recommendation(**rec)


def _handle_reassign_task(store, team: Dict, params: Dict) -> Dict:
    team_id = team["id"]
    from_name = team["members"].get(params["from_member_id"], {}).get("name", params["from_member_id"])
    to_name = team["members"].get(params["to_member_id"], {}).get("name", params["to_member_id"])
    title = team["tasks"].get(params["task_id"], {}).get("title", params["task_id"])
    task = store.reassign_task(team_id, params["task_id"], params["to_member_id"])
    store.add_timeline_event(team_id, "Task reassigned", f"{title}: {from_name} -> {to_name}")
    return {"task_id": task["id"], "detail": f"reassigned to {to_name}"}


def _handle_priority_bump(store, team: Dict, params: Dict) -> Dict:
    team_id = team["id"]
    title = team["tasks"].get(params["task_id"], {}).get("title", params["task_id"])
    task = store.bump_task_priority(team_id, params["task_id"])
    store.add_timeline_event(team_id, "Priority bumped", title)
    return {"task_id": task["id"], "detail": "priority set to urgent"}


ACTION_HANDLERS: Dict[str, Callable[[object, Dict, Dict], Dict]] = {
    "reassign_task": _handle_reassign_task,
    "unblock_task_priority_bump": _handle_priority_bump,
}


@router.post("/{team_id}/recommendation/execute")
async def execute_recommendation(team_id: str, deps: Dict = Depends(get_deps)):
    """SSE, same framing as routes/recall.py's execute_action: validate -> action -> signals ->
    final result event with the full recomputed team state."""
    store = deps["store"]
    action_agent: TeamActionAgent = deps["action"]
    capacity: CapacityAgent = deps["capacity"]

    team = store.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    rec = team.get("current_recommendation")
    if not rec:
        raise HTTPException(status_code=400, detail="No recommendation to execute")

    action_type = rec["action_type"]
    params = rec["params"]

    async def gen():
        def sse(payload: Dict) -> str:
            return f"data: {json.dumps(payload)}\n\n"

        yield sse({"agent": "validate", "status": "running"})
        try:
            await asyncio.to_thread(action_agent.validate, action_type, params, team)
        except ValueError as e:
            yield sse({"agent": "validate", "status": "error", "detail": str(e)})
            return
        yield sse({"agent": "validate", "status": "done", "detail": "action is valid against current state"})

        yield sse({"agent": "action", "status": "running"})
        handler = ACTION_HANDLERS.get(action_type)
        result = await asyncio.to_thread(handler, store, team, params)
        store.clear_recommendation(team_id)
        yield sse({"agent": "action", "status": "done", "detail": result["detail"]})

        yield sse({"agent": "signals", "status": "running"})
        updated_team = store.get_team(team_id)
        state = await asyncio.to_thread(_build_team_state, updated_team, capacity)
        yield sse({"agent": "signals", "status": "done", "detail": "recomputed"})

        yield sse({"agent": "result", "status": "done", "team": json.loads(state.json())})

    return StreamingResponse(gen(), media_type="text/event-stream")
