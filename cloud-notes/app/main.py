from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.auth import get_current_clerk_user_id

from app.api.routes import notes
from app.api.routes import video_jobs


app = FastAPI(title="Cloud Notes API", version="1.0.0")

# Allow the Next.js frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://localhost:3000",      
        "http://127.0.0.1:3000",      
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(notes.router)
app.include_router(video_jobs.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/me")
def me(clerk_user_id: str = Depends(get_current_clerk_user_id)):
    return {"clerk_user_id": clerk_user_id}
