import base64
import os
from typing import Optional

import httpx

from .provider import VoiceProvider

SARVAM_BASE_URL = "https://api.sarvam.ai"
DEFAULT_SPEAKER = "shubh"
DEFAULT_LANGUAGE = "en-IN"


class SarvamProvider(VoiceProvider):
    """Talks to the Sarvam AI REST API directly over httpx (already a
    project dependency) rather than the `sarvamai` SDK — consistent with
    how memory_providers/mem0_provider.py avoids the mem0ai SDK. Unlike
    mem0ai, the sarvamai SDK is actually pydantic-1.x compatible so there
    was no hard blocker either way; REST keeps every provider in this repo
    on the same minimal-footprint pattern.

    Chosen because, as of this integration, the configured ElevenLabs key
    is billing-blocked on the Free tier for API text-to-speech, while
    Sarvam's free credit tier works for API calls.
    """

    name = "sarvam"

    def __init__(self):
        api_key = os.getenv("SARVAM_API_KEY")
        if not api_key:
            raise RuntimeError("SARVAM_API_KEY is not set.")

        self._client = httpx.Client(
            base_url=SARVAM_BASE_URL,
            headers={
                "api-subscription-key": api_key,
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    def synthesize(self, text: str, voice: Optional[str] = None) -> str:
        resp = self._client.post(
            "/text-to-speech",
            json={
                "text": text[:2500],  # bulbul:v3 request limit
                "language_code": DEFAULT_LANGUAGE,
                "speaker": voice or DEFAULT_SPEAKER,
                "model": "bulbul:v3",
                "output_audio_codec": "mp3",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        audios = data.get("audios") or []
        if not audios:
            raise RuntimeError("Sarvam TTS returned no audio")

        # Sarvam already returns base64 — just wrap it as a playable data URI.
        return f"data:audio/mpeg;base64,{audios[0]}"
