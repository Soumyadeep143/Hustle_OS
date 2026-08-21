from abc import ABC, abstractmethod
from typing import Optional


class VoiceProvider(ABC):
    """Text-to-speech abstraction. VoiceAgent depends on this, never on a
    specific vendor SDK, so the backend can be swapped via env var alone."""

    name: str = "base"

    @abstractmethod
    def synthesize(self, text: str, voice: Optional[str] = None) -> str:
        """Returns a data: URI (e.g. "data:audio/mpeg;base64,...") that a
        browser <audio> element can play directly. Raises on failure —
        callers decide whether to fall back or surface the error."""
        ...
