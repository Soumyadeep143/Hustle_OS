import os
from typing import Dict, List, Optional

import httpx

from .provider import MemoryProvider

MEM0_BASE_URL = "https://api.mem0.ai"


class Mem0MemoryProvider(MemoryProvider):
    """Talks to the Mem0 REST API directly over httpx instead of the `mem0ai`
    SDK. The SDK requires pydantic>=2, which conflicts with this project's
    pydantic==1.10.13 pin (needed for elevenlabs==0.2.24). httpx is already
    a project dependency, so this integration adds zero new packages and
    sidesteps the conflict entirely rather than working around it.

    Uses infer=false on add: RECALL's ResearchAgent already extracts
    discrete facts before calling memory.add(), so those facts should be
    stored verbatim. infer=false also makes the Mem0 add call synchronous
    (the default infer=true mode is async and returns only an event_id to
    poll), which this synchronous provider interface requires.
    """

    def __init__(self):
        api_key = os.getenv("MEM0_API_KEY")
        if not api_key:
            raise RuntimeError("MEM0_API_KEY is not set.")

        self._client = httpx.Client(
            base_url=MEM0_BASE_URL,
            headers={
                "Authorization": f"Token {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            # search() now runs proactively on every voice/chat turn (see
            # VoiceAgent._respond), not just explicit searches — keep this
            # short so a slow/unreachable Mem0 doesn't stall every reply.
            timeout=5.0,
        )
        # Fail fast here (at provider construction) rather than on the first
        # real call, so the factory's try/except can fall back to
        # LocalMemoryProvider immediately on a bad key or unreachable API.
        resp = self._client.post(
            "/v3/memories/",
            json={"filters": {"user_id": "__hustleos_recall_healthcheck__"}},
        )
        resp.raise_for_status()

    def add(self, entity_id: str, text: str, metadata: Optional[Dict] = None) -> Dict:
        resp = self._client.post(
            "/v3/memories/add/",
            json={
                "messages": [{"role": "user", "content": text}],
                "user_id": entity_id,
                "infer": False,
                "metadata": metadata or {},
            },
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results") or []
        mem_id = results[0]["id"] if results else None
        return {"id": mem_id, "text": text, "metadata": metadata or {}, "raw": data}

    def search(self, entity_id: str, query: str, limit: int = 5) -> List[Dict]:
        resp = self._client.post(
            "/v3/memories/search/",
            json={"query": query, "filters": {"user_id": entity_id}, "top_k": limit},
        )
        resp.raise_for_status()
        return self._normalize(resp.json())

    def get(self, entity_id: str) -> List[Dict]:
        resp = self._client.post(
            "/v3/memories/",
            json={"filters": {"user_id": entity_id}},
        )
        resp.raise_for_status()
        return self._normalize(resp.json())

    def history(self, entity_id: str) -> List[Dict]:
        return self.get(entity_id)

    @staticmethod
    def _normalize(payload: Dict) -> List[Dict]:
        items = payload.get("results") or []
        normalized = []
        for item in items:
            normalized.append(
                {
                    "id": item.get("id"),
                    "text": item.get("memory", ""),
                    "metadata": item.get("metadata") or {},
                    "created_at": item.get("created_at", ""),
                }
            )
        return normalized
