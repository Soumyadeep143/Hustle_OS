from abc import ABC, abstractmethod
from typing import Dict


class ExecutionProvider(ABC):
    """Turns an approved recommendation into a real artifact/result. Agents
    depend on this abstraction, never on a specific execution backend."""

    name: str = "base"

    @abstractmethod
    def execute(self, action: str, context: Dict) -> Dict:
        ...
