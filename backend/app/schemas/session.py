from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class SessionResponse(BaseModel):
    id: UUID
    start_time: datetime
    end_time: datetime | None

    class Config:
        from_attributes = True
