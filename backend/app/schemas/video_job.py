from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class VideoJobOut(BaseModel):
    id: UUID
    filename: str
    status: str
    transcript: str | None = None
    summary: str | None = None
    signed_url: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
