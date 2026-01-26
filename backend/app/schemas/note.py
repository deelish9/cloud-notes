from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class NoteCreate(BaseModel):
    title: str
    content: str


class NoteOut(BaseModel):
    id: UUID
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
