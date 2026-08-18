import os
from openai import OpenAI
from typing import Dict, Optional
import json

from voice_providers import get_voice_provider


class VoiceAgent:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.voice_provider = get_voice_provider()

    def speech_to_text(self, audio_bytes: bytes) -> str:
        """Transcribe audio using Whisper API"""
        try:
            import io
            audio_file = io.BytesIO(audio_bytes)
            transcript = self.openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
            return transcript.text
        except Exception as e:
            print(f"Error in speech-to-text: {e}")
            return ""

    def text_to_speech(self, text: str, voice_id: Optional[str] = None) -> str:
        """Generate speech via the active VoiceProvider (Sarvam or
        ElevenLabs, whichever resolves — see voice_providers/__init__.py).
        Returns a playable data: URI, or "" if no provider is usable."""
        if not self.voice_provider or not text:
            return ""
        try:
            return self.voice_provider.synthesize(text, voice_id)
        except Exception as e:
            print(f"Error in text-to-speech ({self.voice_provider.name}): {e}")
            return ""

    def detect_intent(self, transcript: str) -> str:
        """Detect intent from transcript"""
        transcript_lower = transcript.lower()

        if any(word in transcript_lower for word in ["find", "discover", "jobs", "opportunities"]):
            return "discover_jobs"
        elif any(word in transcript_lower for word in ["status", "applications", "pipeline", "how many"]):
            return "get_status"
        elif any(word in transcript_lower for word in ["plan", "priority", "today", "what's next"]):
            return "generate_plan"
        elif any(word in transcript_lower for word in ["follow", "followup", "contact"]):
            return "get_followups"
        elif any(word in transcript_lower for word in ["apply", "draft", "email"]):
            return "draft_email"
        else:
            return "general_query"

    def process_voice_command(
        self,
        transcript: str,
        user_id: str,
        agents: Dict,
    ) -> Dict:
        """Route command to appropriate agent and return response"""
        intent = self.detect_intent(transcript)

        memory_agent = agents.get("memory")
        opportunity_agent = agents.get("opportunity")
        documentation_agent = agents.get("documentation")
        planner_agent = agents.get("planner")

        user_context = memory_agent.get_user_context() if memory_agent else {}

        response_text = ""

        if intent == "discover_jobs":
            if opportunity_agent:
                jobs = opportunity_agent.discover_jobs("AI Engineer", "Bengaluru")
                ranked = opportunity_agent.rank_opportunities(jobs, user_context)
                top_jobs = ranked[:3]
                response_text = f"Found {len(jobs)} opportunities. Top matches: {', '.join([j['company'] for j in top_jobs])}"
            else:
                response_text = "Unable to discover jobs at this time"

        elif intent == "get_status":
            if memory_agent:
                apps = memory_agent.get_applications()
                by_status = {}
                for app in apps:
                    status = app["status"]
                    by_status[status] = by_status.get(status, 0) + 1
                response_text = f"Status: {json.dumps(by_status)}. Total: {len(apps)} applications"
            else:
                response_text = "Unable to retrieve status"

        elif intent == "generate_plan":
            if planner_agent:
                plan = planner_agent.generate_daily_plan(user_context)
                response_text = "Today's priorities: " + ". ".join(plan)
            else:
                response_text = "Unable to generate plan"

        elif intent == "get_followups":
            if memory_agent:
                insights = memory_agent.detect_insights()
                response_text = "Insights: " + ". ".join(insights)
            else:
                response_text = "No follow-ups needed"

        elif intent == "draft_email":
            response_text = "Ready to draft email. Which opportunity?"

        else:
            response_text = f"I understood: {transcript}. How can I help you with your job search?"

        return {
            "response": response_text,
            "intent": intent,
            "audio_url": self.text_to_speech(response_text) or None,
        }
