from datetime import date
from typing import Dict

from fastapi import APIRouter, Depends, File, UploadFile

from agents import HomeStore, MemoryAgent, RecallStore, TaskStore, UserStore, VoiceAgent
from agents.conversation_store import ConversationStateStore
from agents.recall_source import source_display_for
from auth import get_current_user_id
from memory_providers import get_memory_provider
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
        "conv_store": ConversationStateStore(),
    }


@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), agents: Dict = Depends(get_agents)):
    """Transcribe audio using Whisper API."""
    try:
        audio_bytes = await file.read()
        transcript = agents["voice"].speech_to_text(audio_bytes, filename=file.filename or "recording.webm")
        return {"text": transcript, "intent": "message"} if transcript else {"text": "", "intent": "unknown"}
    except Exception as e:
        return {"error": str(e), "text": "", "intent": "unknown"}


@router.post("/command", response_model=VoiceResponse)
async def process_command(request: VoiceCommandRequest, agents: Dict = Depends(get_agents)):
    """Routes a text or voice-transcribed message through the one shared
    assistant brain (VoiceAgent), grounded in the AUTHENTICATED user's real
    tasks/applications/RECALL state.

    tool_ctx carries live store handles AND:
      memory_provider — active Mem0 provider (or LocalMemoryProvider fallback)
                        for search_memory / remember_preference tools.
      conv_store      — ConversationStateStore for save_last_entity() calls
                        inside ai_tools.py after unambiguous tool results.
    """
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
            if i.get("follow_up_at")
            and i["follow_up_at"] <= today
            and i["status"] not in ("completed", "archived")
        ]

        # Fetch the last-referenced entity so voice_agent can inject it into
        # the context snapshot for pronoun resolution ("that", "it", "the job").
        last_entity = agents["conv_store"].get_last_entity(user_id)

        context = {
            "tasks": tasks,
            "applications": applications,
            "recall_items": recall_items,
            "follow_ups_due": follow_ups_due,
            "last_entity": last_entity,  # may be None
        }

        # get_memory_provider() returns Mem0MemoryProvider if MEM0_API_KEY is
        # set (and the API is reachable), else LocalMemoryProvider — the same
        # singleton used by the rest of the app. Never raises; falls back
        # gracefully. search_memory / remember_preference tools check for
        # ctx["memory_provider"] being present before calling it.
        try:
            memory_provider = get_memory_provider()
        except Exception as e:
            print(f"Memory provider unavailable, tools will be skipped: {e}")
            memory_provider = None

        tool_ctx = {
            "home":            agents["home"],
            "recall":          agents["recall"],
            "memory":          agents["memory"],
            "tasks":           agents["tasks"],
            "user_id":         user_id,
            "timezone":        request.timezone,
            "memory_provider": memory_provider,
            "conv_store":      agents["conv_store"],
        }

        result = agents["voice"].process_voice_command(
            request.transcript,
            user_name,
            context,
            timezone=request.timezone,
            tool_ctx=tool_ctx,
            include_audio=request.include_audio,
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
    """Generate speech from text using the active voice provider."""
    try:
        audio_url = agents["voice"].text_to_speech(text)
        return {"audio_url": audio_url}
    except Exception as e:
        return {"error": str(e), "audio_url": None}
