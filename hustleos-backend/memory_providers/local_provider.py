import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from .provider import MemoryProvider


class LocalMemoryProvider(MemoryProvider):
    """JSON-file backed memory store, keyed by entity id. Mirrors
    MemoryAgent's existing _load/_save persistence pattern."""

    def __init__(self, store_file: str = "recall_memory.json"):
        self.store_file = store_file
        self._store: Dict[str, List[Dict]] = self._load()

    def _load(self) -> Dict[str, List[Dict]]:
        if os.path.exists(self.store_file):
            with open(self.store_file, "r") as f:
                return json.load(f)
        return {}

    def _save(self):
        with open(self.store_file, "w") as f:
            json.dump(self._store, f, indent=2)

    def add(self, entity_id: str, text: str, metadata: Optional[Dict] = None) -> Dict:
        entry = {
            "id": f"mem_{uuid.uuid4().hex[:10]}",
            "text": text,
            "metadata": metadata or {},
            "created_at": datetime.now().isoformat(),
        }
        self._store.setdefault(entity_id, []).append(entry)
        self._save()
        return entry

    def search(self, entity_id: str, query: str, limit: int = 5) -> List[Dict]:
        entries = self._store.get(entity_id, [])
        q = query.lower()
        matches = [e for e in entries if q in e["text"].lower()]
        ranked = matches if matches else entries
        return ranked[-limit:]

    def get(self, entity_id: str) -> List[Dict]:
        return self._store.get(entity_id, [])

    def history(self, entity_id: str) -> List[Dict]:
        return self.get(entity_id)
