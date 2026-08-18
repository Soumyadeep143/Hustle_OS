import base64
import os
from typing import Optional

import httpx

from .provider import VoiceProvider

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io"
# "Rachel" — a standard premade voice always present on ElevenLabs accounts.
# The previous code used voice_id="default", which is not a real ElevenLabs
# voice ID and would fail regardless of the model/billing issues below.
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
# eleven_monolingual_v1 (previously hardcoded here) is deprecated and
# rejected by the API; eleven_flash_v2_5 is current and low-latency.
DEFAULT_MODEL = "eleven_flash_v2_5"


class ElevenLabsProvider(VoiceProvider):
    """Talks to the ElevenLabs REST API directly over httpx instead of the
    `elevenlabs` SDK — the SDK's `generate()` call in the previous
    implementation returned a placeholder string even on success and used
    an invalid voice_id, so this bypasses it entirely rather than patching
    around it.

    Note: as of this integration, the configured key is authenticated but
    the account is on ElevenLabs' Free tier, which returns 402
    payment_required for text-to-speech via the API ("Free users cannot
    use library voices via the API"). This will raise until the account is
    upgraded — the factory in __init__.py falls back to Sarvam when that
    happens, since Sarvam's free tier is actually usable for this.
    """

    name = "elevenlabs"

    def __init__(self):
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise RuntimeError("ELEVENLABS_API_KEY is not set.")

        self._client = httpx.Client(
            base_url=ELEVENLABS_BASE_URL,
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            timeout=30.0,
        )

    def synthesize(self, text: str, voice: Optional[str] = None) -> str:
        resp = self._client.post(
            f"/v1/text-to-speech/{voice or DEFAULT_VOICE_ID}",
            json={"text": text, "model_id": DEFAULT_MODEL},
        )
        resp.raise_for_status()
        encoded = base64.b64encode(resp.content).decode("utf-8")
        return f"data:audio/mpeg;base64,{encoded}"
