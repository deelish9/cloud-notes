from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_clerk_user_id
from app.db.session import get_db
from app.models.user import User
from app.models.video_job import VideoJob
from app.models.note import Note
from app.services.gcs import upload_video_to_gcs, generate_signed_url, generate_upload_signed_url, delete_file_from_gcs

from rq import Queue
import redis
from app.jobs.video_summary import generate_video_summary


# --------------------
# Queue setup
# --------------------
from app.core.config import settings
REDIS_URL = settings.REDIS_URL
redis_conn = redis.from_url(REDIS_URL)
queue = Queue("video-jobs", connection=redis_conn)

router = APIRouter(prefix="/video-jobs", tags=["video-jobs"])


# --------------------
# Helpers
# --------------------
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

class UploadUrlIn(BaseModel):
    content_type: str

class CreateJobIn(BaseModel):
    filename: str
    blob_name: str


# --------------------
# Routes
# --------------------
@router.post("/signed-url")
def get_upload_url(
    payload: UploadUrlIn,
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    """
    Step 1: Get a signed URL to upload the video directly to GCS.
    """
    return generate_upload_signed_url(payload.content_type)


@router.post("")
def create_video_job_from_blob(
    payload: CreateJobIn,
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    """
    Step 2: After client uploads to GCS, create the job record.
    """
    user = get_db_user(db, clerk_user_id)
    
    # We trust the client has uploaded the file to payload.blob_name
    # (In a real app, we might verify existence via GCS client)
    
    job = VideoJob(
        owner_id=user.id,
        filename=payload.filename,
        video_url=payload.blob_name,
        status="queued",
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    # Queue the job
    queue.enqueue(generate_video_summary, job.id, job_timeout='3600s')

    return job

@router.post("/upload")
def upload_video_job(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    clerk_user_id: str = Depends(get_current_clerk_user_id),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    user = get_db_user(db, clerk_user_id)

    try:
        video_url = upload_video_to_gcs(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    job = VideoJob(
        owner_id=user.id,
        filename=file.filename,
        video_url=video_url,
        status="queued",
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    # Automatically queue the video processing job
    # Use string path for RQ to import in worker context
    queue.enqueue(generate_video_summary, job.id, job_timeout='3600s')


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

    # Enrich with signed URLs
    results = []
    for job in jobs:
        # Convert to dict-like object to append extra field not in DB
        # We use explicit mapping to ensure Pydantic validation works downstream if needed
        # or just return the modified object if using ORM mode
        
        # Simple trick: Attach attribute dynamically if not exist, 
        # but SQLAlchemy models are strict. Better to return list of dicts.
        job_dict = job.__dict__.copy()
        
        if job.video_url:
            try:
                # job.video_url is the blob_name (e.g. videos/uuid.mp4)
                signed = generate_signed_url(job.video_url)
                job_dict["signed_url"] = signed
            except Exception:
                job_dict["signed_url"] = None
        
        results.append(job_dict)

    return results


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

    if not payload.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")

    job.transcript = payload.transcript
    job.status = "ready"
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

    # Allow re-processing even if transcript exists
    job.status = "queued"
    db.commit()

    queue.enqueue(generate_video_summary, job.id)

    return {"status": "queued", "job_id": job.id}


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

    if not job.summary:
        raise HTTPException(
            status_code=400,
            detail="This job has no summary yet",
        )

    note = Note(
        owner_id=user.id,
        title=f"Video Notes: {job.filename}",
        content=job.summary,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {"note_id": str(note.id), "title": note.title}


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

    if job.video_url:
        delete_file_from_gcs(job.video_url)
    
    if job.audio_url:
        delete_file_from_gcs(job.audio_url)

    db.delete(job)
    db.commit()

    return {"deleted": True, "job_id": job_id}
