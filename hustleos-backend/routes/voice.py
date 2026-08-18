from fastapi import APIRouter, UploadFile, File, Depends
from models import VoiceCommandRequest, VoiceResponse
from agents import VoiceAgent, MemoryAgent, OpportunityAgent, DocumentationAgent, PlannerAgent
from typing import Dict

router = APIRouter()

def get_agents() -> Dict:
    return {
        "voice": VoiceAgent(),
        "memory": MemoryAgent(),
        "opportunity": OpportunityAgent(),
        "documentation": DocumentationAgent(),
        "planner": PlannerAgent(),
    }

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...), agents: Dict = Depends(get_agents)):
    """Transcribe audio using Whisper API"""
    try:
        audio_bytes = await file.read()
        voice_agent = agents["voice"]
        transcript = voice_agent.speech_to_text(audio_bytes)

        if not transcript:
            return {"text": "", "intent": "unknown"}

        intent = voice_agent.detect_intent(transcript)
        return {"text": transcript, "intent": intent}
    except Exception as e:
        return {"error": str(e), "text": "", "intent": "unknown"}

@router.post("/command", response_model=VoiceResponse)
async def process_command(request: VoiceCommandRequest, agents: Dict = Depends(get_agents)):
    """Process voice command and route to appropriate agent"""
    try:
        voice_agent = agents["voice"]
        result = voice_agent.process_voice_command(
            request.transcript,
            request.user_id,
            agents,
        )
        return VoiceResponse(
            response=result["response"],
            audio_url=result.get("audio_url"),
        )
    except Exception as e:
        return VoiceResponse(response=f"Error processing command: {str(e)}")

@router.post("/tts")
async def text_to_speech(text: str, agents: Dict = Depends(get_agents)):
    """Generate speech from text using ElevenLabs"""
    try:
        voice_agent = agents["voice"]
        audio_url = voice_agent.text_to_speech(text)
        return {"audio_url": audio_url}
    except Exception as e:
        return {"error": str(e), "audio_url": None}
