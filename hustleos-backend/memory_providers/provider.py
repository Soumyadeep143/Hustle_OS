from abc import ABC, abstractmethod
from typing import Dict, List, Optional


class MemoryProvider(ABC):
    """Contextual memory abstraction. Agents depend on this, never on a
    specific backend, so the provider can be swapped without touching
    agent code."""

    @abstractmethod
    def add(self, entity_id: str, text: str, metadata: Optional[Dict] = None) -> Dict:
        ...

    @abstractmethod
    def search(self, entity_id: str, query: str, limit: int = 5) -> List[Dict]:
        ...

    @abstractmethod
    def get(self, entity_id: str) -> List[Dict]:
        ...

    @abstractmethod
    def history(self, entity_id: str) -> List[Dict]:
        ...
