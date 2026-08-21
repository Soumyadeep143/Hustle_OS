from datetime import date
from typing import Dict

from fastapi import APIRouter, Depends, File, UploadFile

from agents import HomeStore, MemoryAgent, RecallStore, TaskStore, UserStore, VoiceAgent
from agents.recall_source import source_display_for
from auth import get_current_user_id
from models import ScheduleDraftDto, VoiceCommandRequest, VoiceResponse

router = APIRouter()


def get_agents(user_id: str = Depends(get_current_user_id)) -> Dict:
    return {
        "user_id": user_id,
        "voice": VoiceAgent(),
        "memory": MemoryAgent(user_id=user_id),
        "recall": RecallStore(user_id),
        "tasks": TaskStore(),
        "users": UserStore(),
        "home": HomeStore(),
    }


@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), agents: Dict = Depends(get_agents)):
    """Transcribe audio using Whisper API"""
    try:
        audio_bytes = await file.read()
        transcript = agents["voice"].speech_to_text(audio_bytes)
        return {"text": transcript, "intent": "message"} if transcript else {"text": "", "intent": "unknown"}
    except Exception as e:
        return {"error": str(e), "text": "", "intent": "unknown"}


@router.post("/command", response_model=VoiceResponse)
async def process_command(request: VoiceCommandRequest, agents: Dict = Depends(get_agents)):
    """Routes a text or voice-transcribed message through the one shared
    assistant brain (VoiceAgent), grounded in the AUTHENTICATED user's real
    tasks/applications/RECALL state — the request body's own user_id field
    is never trusted, since it's client-supplied. Both the AI chat screen
    and the voice overlay call this same endpoint, so they share identical
    context and personality (see spec: text and voice must not diverge)."""
    try:
        user_id = agents["user_id"]
        user = agents["users"].get_by_id(user_id)
        user_name = (user or {}).get("name", "").split(" ")[0] if user else ""

        tasks = agents["tasks"].list_tasks(user_id)
        applications = agents["memory"].get_applications()
        raw_recall_items = agents["recall"].list_items()
        recall_items = [
            {**i, "source_display": source_display_for(i["source"])} for i in raw_recall_items
        ]

        today = date.today().isoformat()
        follow_ups_due = [
            i for i in recall_items
            if i.get("follow_up_at") and i["follow_up_at"] <= today and i["status"] not in ("completed", "archived")
        ]

        context = {
            "tasks": tasks,
            "applications": applications,
            "recall_items": recall_items,
            "follow_ups_due": follow_ups_due,
        }

        tool_ctx = {
            "home": agents["home"],
            "recall": agents["recall"],
            "memory": agents["memory"],
            "tasks": agents["tasks"],
            "user_id": user_id,
            "timezone": request.timezone,
        }
        result = agents["voice"].process_voice_command(
            request.transcript, user_name, context, timezone=request.timezone, tool_ctx=tool_ctx
        )
        schedule_draft = result.get("schedule_draft")
        return VoiceResponse(
            response=result["response"],
            audio_url=result.get("audio_url"),
            schedule_draft=ScheduleDraftDto(**schedule_draft.__dict__) if schedule_draft else None,
        )
    except Exception as e:
        return VoiceResponse(response=f"Something went wrong on my end: {str(e)}")


@router.post("/tts")
async def text_to_speech(text: str, agents: Dict = Depends(get_agents)):
    """Generate speech from text using the active voice provider"""
    try:
        audio_url = agents["voice"].text_to_speech(text)
        return {"audio_url": audio_url}
    except Exception as e:
        return {"error": str(e), "audio_url": None}
