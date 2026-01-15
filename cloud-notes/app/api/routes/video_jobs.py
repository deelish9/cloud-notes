from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_clerk_user_id
from app.db.session import get_db
from app.models.user import User
from app.models.video_job import VideoJob
from app.models.note import Note
from app.services.gemini_summarizer import summarize_transcript

router = APIRouter(prefix="/video-jobs", tags=["video-jobs"])


def get_db_user(db: Session, clerk_user_id: str) -> User:
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if user:
        return user
    user = User(clerk_user_id=clerk_user_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TranscriptIn(BaseModel):
    transcript: str


@router.post("/upload")
def upload_video_job(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    user = get_db_user(db, clerk_user_id)

    job = VideoJob(owner_id=user.id, filename=file.filename, status="uploaded")
    db.add(job)
    db.commit()
    db.refresh(job)

    return job


@router.get("")
def list_video_jobs(
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    user = get_db_user(db, clerk_user_id)

    jobs = (
        db.query(VideoJob)
        .filter(VideoJob.owner_id == user.id)
        .order_by(VideoJob.created_at.desc())
        .all()
    )
    return jobs

@router.post("/{job_id}/transcript")
def set_transcript(
    job_id: str,
    payload: TranscriptIn,
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    user = get_db_user(db, clerk_user_id)

    job = (
        db.query(VideoJob)
        .filter(VideoJob.id == job_id, VideoJob.owner_id == user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not payload.transcript or not payload.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")

    job.transcript = payload.transcript
    job.status = "processing"
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/generate")
def generate_summary(
    job_id: str,
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    user = get_db_user(db, clerk_user_id)

    job = (
        db.query(VideoJob)
        .filter(VideoJob.id == job_id, VideoJob.owner_id == user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.transcript or not job.transcript.strip():
        raise HTTPException(status_code=400, detail="No transcript saved for this job")

    # Mark as "processing" while we generate
    job.status = "processing"
    db.commit()

    try:
        summary_text = summarize_transcript(job.transcript)
    except Exception as e:
        job.status = "error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {e}")

    job.summary = summary_text
    job.status = "done"
    db.commit()
    db.refresh(job)
    return job

@router.post("/{job_id}/save-as-note")
def save_job_as_note(
    job_id: str,
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    user = get_db_user(db, clerk_user_id)

    job = (
        db.query(VideoJob)
        .filter(VideoJob.id == job_id, VideoJob.owner_id == user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.summary or not job.summary.strip():
        raise HTTPException(status_code=400, detail="This job has no summary yet. Generate first.")

    # Create a Note from the job summary
    note = Note(
        owner_id=user.id,
        title=f"Video Notes: {job.filename}",
        content=job.summary,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {
        "note_id": str(note.id),
        "title": note.title,
    }

@router.delete("/{job_id}")
def delete_video_job(
    job_id: str,
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    user = get_db_user(db, clerk_user_id)

    job = (
        db.query(VideoJob)
        .filter(VideoJob.id == job_id, VideoJob.owner_id == user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()

    return {"deleted": True, "job_id": job_id}

