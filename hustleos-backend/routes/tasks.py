from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from agents import MemoryAgent, PlannerAgent, TaskStore
from auth import get_current_user_id
from models import Task, TaskCreateRequest, TaskUpdateRequest

router = APIRouter()


def get_deps(user_id: str = Depends(get_current_user_id)) -> Dict:
    return {"store": TaskStore(), "memory": MemoryAgent(user_id=user_id), "planner": PlannerAgent()}


@router.get("/", response_model=list[Task])
async def list_tasks(user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    if not store.has_tasks(user_id):
        user_context = deps["memory"].get_user_context()
        priorities = deps["planner"].generate_daily_plan(user_context)
        return store.seed_tasks(user_id, priorities)
    return store.list_tasks(user_id)


@router.post("/", response_model=Task)
async def create_task(
    request: TaskCreateRequest, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)
):
    store = deps["store"]
    return store.create_task(user_id, request.title, request.due_at, request.priority)


@router.patch("/{task_id}", response_model=Task)
async def update_task(
    task_id: str, request: TaskUpdateRequest, user_id: str = Depends(get_current_user_id), deps: Dict = Depends(get_deps)
):
    store = deps["store"]
    task = store.set_done(task_id, user_id, request.done)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
