import os
from typing import Optional

from .provider import VoiceProvider
from .sarvam_provider import SarvamProvider
from .elevenlabs_provider import ElevenLabsProvider

_provider_instance: Optional[VoiceProvider] = None
_provider_name = "none"
_resolved = False


def get_voice_provider() -> Optional[VoiceProvider]:
    """Returns the active voice provider, or None if none is usable.

    Prefers Sarvam over ElevenLabs when both are configured: as of this
    integration, the ElevenLabs key on this account is confirmed
    billing-blocked (Free tier can't call text-to-speech via the API),
    while Sarvam has a genuinely usable free-credit tier. Both are tried
    at construction time so a bad/unusable key falls through automatically
    rather than silently claiming to be active.
    """
    global _provider_instance, _provider_name, _resolved

    if _resolved:
        return _provider_instance

    if os.getenv("SARVAM_API_KEY"):
        try:
            _provider_instance = SarvamProvider()
            _provider_name = "sarvam"
            _resolved = True
            return _provider_instance
        except Exception as e:
            print(f"Sarvam voice provider unavailable: {e}")

    if os.getenv("ELEVENLABS_API_KEY"):
        try:
            _provider_instance = ElevenLabsProvider()
            _provider_name = "elevenlabs"
            _resolved = True
            return _provider_instance
        except Exception as e:
            print(f"ElevenLabs voice provider unavailable: {e}")

    _provider_instance = None
    _provider_name = "none"
    _resolved = True
    return None


def get_voice_provider_name() -> str:
    get_voice_provider()
    return _provider_name


__all__ = ["VoiceProvider", "SarvamProvider", "ElevenLabsProvider", "get_voice_provider", "get_voice_provider_name"]
