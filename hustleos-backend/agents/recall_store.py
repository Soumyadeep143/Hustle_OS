import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional


class RecallStore:
    """Deterministic structured state for RECALL: prospects, companies,
    scores, and timeline. Mirrors MemoryAgent's JSON-file persistence
    pattern — contextual facts live in a MemoryProvider instead, kept
    separate per the fact-vs-memory split the RECALL design calls for."""

    def __init__(self, store_file: str = "recall_state.json"):
        self.store_file = store_file
        self.state = self._load()

    def _load(self) -> Dict:
        if os.path.exists(self.store_file):
            with open(self.store_file, "r") as f:
                return json.load(f)
        return {"prospects": {}, "companies": {}}

    def _save(self):
        with open(self.store_file, "w") as f:
            json.dump(self.state, f, indent=2)

    def _now(self) -> str:
        return datetime.now().isoformat()

    def upsert_company(self, name: str, source_url: Optional[str] = None) -> Dict:
        for company in self.state["companies"].values():
            if company["name"].lower() == name.lower():
                return company
        company_id = f"company_{uuid.uuid4().hex[:8]}"
        company = {"id": company_id, "name": name, "source_url": source_url}
        self.state["companies"][company_id] = company
        self._save()
        return company

    def create_prospect(
        self,
        name: str,
        company: str,
        role: Optional[str] = None,
        email: Optional[str] = None,
        source_url: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict:
        company_obj = self.upsert_company(company, source_url)
        prospect_id = f"prospect_{uuid.uuid4().hex[:8]}"
        now = self._now()
        prospect = {
            "id": prospect_id,
            "name": name,
            "role": role,
            "company": company_obj["name"],
            "company_id": company_obj["id"],
            "email": email,
            "relationship": "new",
            "lead_score": 0,
            "intent": "unknown",
            "next_best_action": None,
            "timeline": [
                {
                    "id": f"evt_{uuid.uuid4().hex[:8]}",
                    "label": "Prospect added",
                    "detail": source_url,
                    "created_at": now,
                }
            ],
            "created_at": now,
            "updated_at": now,
            "source_url": source_url,
            "notes": notes,
        }
        self.state["prospects"][prospect_id] = prospect
        self._save()
        return prospect

    def get_prospect(self, prospect_id: str) -> Optional[Dict]:
        return self.state["prospects"].get(prospect_id)

    def list_prospects(self) -> List[Dict]:
        return sorted(
            self.state["prospects"].values(),
            key=lambda p: p["lead_score"],
            reverse=True,
        )

    def add_timeline_event(self, prospect_id: str, label: str, detail: Optional[str] = None) -> Optional[Dict]:
        prospect = self.get_prospect(prospect_id)
        if not prospect:
            return None
        event = {
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "label": label,
            "detail": detail,
            "created_at": self._now(),
        }
        prospect["timeline"].append(event)
        prospect["updated_at"] = self._now()
        self._save()
        return event

    def update_scores(
        self,
        prospect_id: str,
        lead_score: int,
        intent: str,
        relationship: Optional[str] = None,
    ) -> Optional[Dict]:
        prospect = self.get_prospect(prospect_id)
        if not prospect:
            return None
        prospect["lead_score"] = lead_score
        prospect["intent"] = intent
        if relationship:
            prospect["relationship"] = relationship
        prospect["updated_at"] = self._now()
        self._save()
        return prospect

    def set_next_best_action(self, prospect_id: str, action: str, reason: str) -> Optional[Dict]:
        prospect = self.get_prospect(prospect_id)
        if not prospect:
            return None
        prospect["next_best_action"] = {
            "action": action,
            "reason": reason,
            "generated_at": self._now(),
        }
        prospect["updated_at"] = self._now()
        self._save()
        return prospect

    def clear_next_best_action(self, prospect_id: str):
        prospect = self.get_prospect(prospect_id)
        if prospect:
            prospect["next_best_action"] = None
            self._save()
