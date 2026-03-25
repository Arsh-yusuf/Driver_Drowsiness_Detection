from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from app.database import Base

class DriverEvent(Base):
    __tablename__ = "driver_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("driving_sessions.id"), nullable=False)

    event_type = Column(String, nullable=False)
    event_subtype = Column(String, nullable=True)

    duration_ms = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=True)

    event_metadata = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
