from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Dict
from datetime import datetime

class DriverEventCreate(BaseModel):
    session_id: UUID
    event_type: str
    event_subtype: Optional[str] = None
    duration_ms: Optional[int] = None
    confidence: Optional[float] = None
    event_metadata: Optional[Dict] = None

class DriverEventOut(DriverEventCreate):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
