import os
from typing import Optional

from .provider import ExecutionProvider
from .local_provider import LocalExecutionProvider

_instance: Optional[ExecutionProvider] = None


def get_execution_provider() -> ExecutionProvider:
    """Returns the active execution provider. Uses NeevCloud if
    NEEVCLOUD_API_KEY is set, otherwise falls back to local generation."""
    global _instance

    if _instance is not None:
        return _instance

    if os.getenv("NEEVCLOUD_API_KEY"):
        try:
            from .neevcloud_provider import NeevCloudExecutionProvider
            _instance = NeevCloudExecutionProvider()
            return _instance
        except Exception as e:
            print(f"NeevCloud execution provider unavailable, falling back to local: {e}")

    _instance = LocalExecutionProvider()
    return _instance


__all__ = ["ExecutionProvider", "LocalExecutionProvider", "get_execution_provider"]
