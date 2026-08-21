import os
from typing import Optional

from .provider import MemoryProvider
from .local_provider import LocalMemoryProvider

_provider_instance: Optional[MemoryProvider] = None
_provider_name = "local"


def get_memory_provider() -> MemoryProvider:
    """Returns the active memory provider. Uses Mem0 if MEM0_API_KEY is set
    and mem0ai is installed, otherwise falls back to the local JSON store."""
    global _provider_instance, _provider_name

    if _provider_instance is not None:
        return _provider_instance

    if os.getenv("MEM0_API_KEY"):
        try:
            from .mem0_provider import Mem0MemoryProvider
            _provider_instance = Mem0MemoryProvider()
            _provider_name = "mem0"
            return _provider_instance
        except Exception as e:
            print(f"Mem0 memory provider unavailable, falling back to local: {e}")

    _provider_instance = LocalMemoryProvider()
    _provider_name = "local"
    return _provider_instance


def get_provider_name() -> str:
    get_memory_provider()
    return _provider_name


__all__ = ["MemoryProvider", "LocalMemoryProvider", "get_memory_provider", "get_provider_name"]
