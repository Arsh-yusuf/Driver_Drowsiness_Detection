from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.session import DrivingSession
from app.schemas.session import SessionResponse
from app.utils.auth_dep import get_current_user_id

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.get("/", response_model=List[SessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    sessions = db.query(DrivingSession).filter_by(user_id=user_id).order_by(DrivingSession.start_time.desc()).all()
    return sessions

@router.post("/start")
def start_session(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    session = DrivingSession(user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.post("/end/{session_id}")
def end_session(
    session_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    session = db.query(DrivingSession).filter_by(id=session_id, user_id=user_id).first()
    session.end_time = func.now()
    db.commit()
    return {"status": "session ended"}
