from typing import Dict, Optional

from execution_providers import ExecutionProvider, get_execution_provider


class ExecutionAgent:
    """Turns an approved recommendation into a real artifact via the
    active ExecutionProvider. Never runs without prior user approval —
    routes only call this after an explicit /execute request."""

    def __init__(self, provider: Optional[ExecutionProvider] = None):
        self.provider = provider or get_execution_provider()

    def execute(self, action: str, reason: str, prospect: Dict, memory_summary: str) -> Dict:
        context = {
            "prospect": prospect,
            "reason": reason,
            "memory_summary": memory_summary,
        }
        return self.provider.execute(action, context)
