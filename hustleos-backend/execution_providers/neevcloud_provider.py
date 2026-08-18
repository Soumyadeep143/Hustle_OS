import os
from typing import Dict

from .provider import ExecutionProvider


class NeevCloudExecutionProvider(ExecutionProvider):
    """Stub. No NeevCloud SDK, API docs, or credentials were found anywhere
    in this repository (checked env files, requirements.txt, and all
    markdown docs). Wire this in once NEEVCLOUD_API_KEY and the actual SDK
    contract are available — do not fabricate an API surface in the
    meantime. The factory in __init__.py only selects this provider when
    NEEVCLOUD_API_KEY is set, and falls back to LocalExecutionProvider on
    any failure to construct it."""

    name = "neevcloud"

    def __init__(self):
        self.api_key = os.getenv("NEEVCLOUD_API_KEY")
        if not self.api_key:
            raise RuntimeError("NEEVCLOUD_API_KEY is not set — NeevCloud is not configured.")

    def execute(self, action: str, context: Dict) -> Dict:
        raise NotImplementedError(
            "NeevCloud execution is not implemented — no SDK/API contract is available yet."
        )
