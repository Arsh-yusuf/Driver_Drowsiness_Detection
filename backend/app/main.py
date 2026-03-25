from fastapi import FastAPI
from app.database import Base, engine
from app.routes import auth,sessions,events
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*" # Allow all origins for production (Vercel, Render)
]

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Driver Monitoring Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(events.router)
app.include_router(auth.router)

@app.get("/")
def health():
    return {"status": "Backend running"}
