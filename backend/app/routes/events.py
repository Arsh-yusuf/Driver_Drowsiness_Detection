from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.driver_event import DriverEvent
from app.schemas.driver_event import DriverEventCreate, DriverEventOut
from app.utils.auth_dep import get_current_user_id
from typing import List
import httpx
import json
import cohere
import os

router = APIRouter(prefix="/events", tags=["Driver Events"])

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3" # Note: Can be changed to mistral, phi3, etc.

co_client = None
co_api_key = os.getenv("COHERE_API_KEY")
if co_api_key:
    co_client = cohere.Client(co_api_key)

@router.post("/")
def log_driver_event(
    event: DriverEventCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    new_event = DriverEvent(
        user_id=user_id,
        session_id=event.session_id,
        event_type=event.event_type,
        event_subtype=event.event_subtype,
        duration_ms=event.duration_ms,
        confidence=event.confidence,
        event_metadata=event.event_metadata
    )

    db.add(new_event)
    db.commit()

    return {"status": "event_logged"}

@router.get("/", response_model=List[DriverEventOut])
def get_events(
    session_id: str | None = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    query = db.query(DriverEvent).filter(DriverEvent.user_id == user_id)
    if session_id:
        query = query.filter(DriverEvent.session_id == session_id)
    events = query.order_by(DriverEvent.created_at.desc()).all()
    return events

@router.get("/suggestions")
async def get_ai_suggestions(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    from datetime import datetime
    today = datetime.utcnow().date()
    
    events = db.query(DriverEvent).filter(
        DriverEvent.user_id == user_id,
        DriverEvent.created_at >= today
    ).order_by(DriverEvent.created_at.desc()).all()
    
    if not events:
        return {"suggestions": ["No events detected today. Drive safely and stay alert!"]}
        
    event_counts = {}
    for e in events:
        event_counts[e.event_type] = event_counts.get(e.event_type, 0) + 1
        
    summary_str = ", ".join([f"{count} {etype}" for etype, count in event_counts.items()])
    
    prompt = f"""
    You are an expert safe driving AI assistant for the DrowsiGuard system.
    A driver has had the following events today: {summary_str}.
    
    Based on these specific events, provide 2 to 4 short, actionable, and personalized safety suggestions.
    - Keep each suggestion strictly under 2 sentences.
    - If there are DROWSINESS or EYES_CLOSED events, include an URGENT warning to pull over.
    - Provide only the suggestions as a bulleted list (start each line with a "- "). Do not include any intro or outro text.
    """
    
    # 1. Try Cohere if API key exists (Cloud Deployments)
    if co_client:
        try:
            response = co_client.chat(
                message=prompt,
                model="command-r-plus"
            )
            raw_text = response.text
            suggestions = [line.strip("- *").strip() for line in raw_text.split("\n") if line.strip("- *").strip()]
            suggestions = [s for s in suggestions if len(s) > 10]
            if suggestions:
                return {"suggestions": suggestions}
        except Exception as e:
            print("Cohere Error:", e)

    # 2. Fallback to Local Ollama
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            
            raw_text = data.get("response", "")
            suggestions = [line.strip("- *").strip() for line in raw_text.split("\n") if line.strip("- *").strip()]
            suggestions = [s for s in suggestions if len(s) > 10]
            
            if not suggestions:
                raise ValueError("No suggestions parsed from model output.")
                
            return {"suggestions": suggestions}
    except Exception as e:
        print("Ollama Error:", e)
        fb = ["Unable to reach local AI. Please review your alerts manually."]
        if "EYES_CLOSED" in event_counts or "DROWSINESS" in event_counts:
            fb.append("URGENT: Critical drowsiness detected. Pull over immediately.")
        else:
            fb.append("Take regular breaks to stay alert.")
        return {"suggestions": fb}
