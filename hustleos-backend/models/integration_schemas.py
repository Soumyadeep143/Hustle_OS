from typing import Optional

from pydantic import BaseModel


class Integration(BaseModel):
    key: str
    name: str
    connected: bool
    last_sync: Optional[str] = None


class IntegrationConnectResponse(BaseModel):
    key: str
    connected: bool
    note: str
