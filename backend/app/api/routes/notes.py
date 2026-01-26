from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_clerk_user_id
from app.db.session import get_db
from app.models.user import User
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteOut
from uuid import UUID
from fastapi import HTTPException


router = APIRouter(prefix="/notes", tags=["notes"])

def get_db_user(db: Session, clerk_user_id: str) -> User:
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if user:
        return user

    user = User(clerk_user_id=clerk_user_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user



@router.post("", response_model=NoteOut)
def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    user = get_db_user(db, clerk_user_id)

    note = Note(
        owner_id=user.id,
        title=payload.title,
        content=payload.content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("", response_model=list[NoteOut])
def list_notes(
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    user = get_db_user(db, clerk_user_id)

    notes = (
        db.query(Note)
        .filter(Note.owner_id == user.id)
        .order_by(Note.created_at.desc())
        .all()
    )
    return notes

@router.put("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: UUID,
    payload: NoteCreate,
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    user = get_db_user(db, clerk_user_id)

    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.owner_id == user.id)
        .first()
    )

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.title = payload.title
    note.content = payload.content
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    user = get_db_user(db, clerk_user_id)

    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.owner_id == user.id)
        .first()
    )

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()
    return {"ok": True}
