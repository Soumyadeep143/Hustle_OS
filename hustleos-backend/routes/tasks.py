from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from agents import MemoryAgent, PlannerAgent, TaskStore
from models import Task, TaskCreateRequest, TaskUpdateRequest

router = APIRouter()


def get_deps() -> Dict:
    return {"store": TaskStore(), "memory": MemoryAgent(), "planner": PlannerAgent()}


@router.get("/", response_model=list[Task])
async def list_tasks(user_id: str = Query("user_default"), deps: Dict = Depends(get_deps)):
    store = deps["store"]
    if not store.has_tasks(user_id):
        user_context = deps["memory"].get_user_context()
        priorities = deps["planner"].generate_daily_plan(user_context)
        return store.seed_tasks(user_id, priorities)
    return store.list_tasks(user_id)


@router.post("/", response_model=Task)
async def create_task(request: TaskCreateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    return store.create_task(request.user_id, request.title, request.due_at, request.priority)


@router.patch("/{task_id}", response_model=Task)
async def update_task(task_id: str, request: TaskUpdateRequest, deps: Dict = Depends(get_deps)):
    store = deps["store"]
    task = store.set_done(task_id, request.done)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
