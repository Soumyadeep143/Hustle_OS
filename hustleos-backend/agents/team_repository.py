from abc import ABC, abstractmethod
from typing import Dict, List, Optional


class TeamRepository(ABC):
    """Storage contract for Team execution-intelligence state — deterministic operational
    truth (members, tasks, features, projects, sprints, timeline), the same role RecallStore
    plays for RECALL. TeamStore (local JSON) is the only implementation today; a Hydra-backed
    implementation would plug in here once real credentials/schema/SDK exist — see
    get_team_repository() below for why no such stub is speculatively created yet."""

    @abstractmethod
    def get_team(self, team_id: str) -> Optional[Dict]: ...

    @abstractmethod
    def create_team(self, name: str, team_id: Optional[str] = None, organization_id: str = "org_default") -> Dict: ...

    @abstractmethod
    def list_teams(self) -> List[Dict]: ...

    @abstractmethod
    def get_or_create_team(self, team_id: str) -> Dict: ...

    @abstractmethod
    def add_member(
        self,
        team_id: str,
        name: str,
        role: str,
        email: Optional[str] = None,
        skills: Optional[List[str]] = None,
        capacity_hours_per_week: float = 40.0,
        working_hours: Optional[Dict] = None,
    ) -> Dict: ...

    @abstractmethod
    def update_member(self, team_id: str, member_id: str, updates: Dict) -> Optional[Dict]: ...

    @abstractmethod
    def add_task(self, team_id: str, title: str, **kwargs) -> Dict: ...

    @abstractmethod
    def update_task(self, team_id: str, task_id: str, updates: Dict) -> Optional[Dict]: ...

    @abstractmethod
    def add_feature(
        self, team_id: str, project_id: str, name: str, description: Optional[str] = None, due_at: Optional[str] = None
    ) -> Dict: ...

    @abstractmethod
    def add_project(
        self, team_id: str, name: str, description: Optional[str] = None, target_date: Optional[str] = None
    ) -> Dict: ...

    @abstractmethod
    def add_sprint(
        self, team_id: str, name: str, start_date: Optional[str] = None, end_date: Optional[str] = None
    ) -> Dict: ...

    @abstractmethod
    def add_timeline_event(self, team_id: str, label: str, detail: Optional[str] = None) -> Optional[Dict]: ...

    @abstractmethod
    def set_recommendation(self, team_id: str, recommendation: Dict) -> None: ...

    @abstractmethod
    def clear_recommendation(self, team_id: str) -> None: ...

    @abstractmethod
    def reassign_task(self, team_id: str, task_id: str, to_member_id: str) -> Optional[Dict]: ...

    @abstractmethod
    def bump_task_priority(self, team_id: str, task_id: str) -> Optional[Dict]: ...


def get_team_repository() -> TeamRepository:
    """Factory, same shape as memory_providers/execution_providers' provider factories.
    Always returns the local JSON-backed TeamStore today — Hydra is not integrated anywhere
    in this codebase (confirmed via a full-repo grep before this module was written: no SDK,
    no credentials, no schema, no env var convention, nothing). Unlike
    NeevCloudExecutionProvider — which stubs a provider that at least has a real env var name
    and concept from a prior author to anchor against — there is nothing here to anchor a
    HydraTeamRepository stub to, so none is created; that would mean inventing an API surface.
    This function is the one place a real Hydra-backed implementation plugs in later, selected
    by an env var the same way get_memory_provider()/get_execution_provider() already do."""
    from .team_store import TeamStore

    return TeamStore()
