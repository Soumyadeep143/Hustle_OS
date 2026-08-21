from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from agents import MemoryAgent, UserStore
from auth import create_token, get_current_user_id, hash_password, verify_password
from models import AuthResponse, AuthUser, LoginRequest, SignupRequest

router = APIRouter()


def get_user_store() -> UserStore:
    return UserStore()


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup(request: SignupRequest, store: UserStore = Depends(get_user_store)):
    if store.get_by_email(request.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = store.create(request.name, request.email, hash_password(request.password))
    MemoryAgent(user_id=user["id"]).update_profile({"name": request.name, "email": request.email})

    token = create_token(user["id"], user["email"])
    return AuthResponse(token=token, user=AuthUser(id=user["id"], name=user["name"], email=user["email"]))


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, store: UserStore = Depends(get_user_store)):
    user = store.get_by_email(request.email)
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"])
    return AuthResponse(token=token, user=AuthUser(id=user["id"], name=user["name"], email=user["email"]))


@router.get("/me", response_model=AuthUser)
async def me(user_id: str = Depends(get_current_user_id), store: UserStore = Depends(get_user_store)):
    user = store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    return AuthUser(id=user["id"], name=user["name"], email=user["email"])
