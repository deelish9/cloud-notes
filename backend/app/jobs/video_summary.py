from app.services.audio import extract_audio
from app.services.gcs import download_video_from_gcs, upload_audio_to_gcs
from app.db.session import SessionLocal
from app.models.video_job import VideoJob
from app.services.speech import transcribe_audio
from app.services.gemini_summarizer import summarize_transcript
from app.services.gemini_files import upload_file_to_gemini, delete_file_from_gemini
import os


import logging
logger = logging.getLogger(__name__)

def generate_video_summary(job_id: str):
    logger.info(f"Starting job {job_id}")
    db = SessionLocal()
    try:
        job = db.query(VideoJob).get(job_id)

        if not job:
            logger.warning(f"Job {job_id} not found in database")
            return

        logger.info(f"Processing job {job_id} for file {job.filename}")

        video_path = None
        gemini_file = None
        audio_path = None

        try:
            # 1️⃣ Transcribe if needed
            if not job.transcript:
                job.status = "processing"
                db.commit()

                video_path = download_video_from_gcs(job.video_url)
                audio_path = extract_audio(video_path)
                audio_url = upload_audio_to_gcs(audio_path)

                job.audio_url = audio_url
                job.status = "transcribing"
                db.commit()

                job.transcript = transcribe_audio(audio_path)
                job.status = "transcribed"
                db.commit()
            
            # 2️⃣ Generate Summary
            job.status = "summarizing"
            db.commit()

            if not video_path:
                video_path = download_video_from_gcs(job.video_url)

            try:
                gemini_file = upload_file_to_gemini(video_path)
            except Exception as e:
                logger.warning(f"Failed to upload video to Gemini: {e}")
                gemini_file = None

            job.summary = summarize_transcript(job.transcript, gemini_file)
            job.status = "done"
            db.commit()

        except Exception as e:
            logger.error(f"Error in job {job_id}: {e}")
            job.status = "failed"
            job.error = str(e)
            db.commit()
            raise
        
        finally:
            # Cleanup Gemini file
            if gemini_file:
                delete_file_from_gemini(gemini_file.name)
            
            # Cleanup local video file if it exists
            if video_path and os.path.exists(video_path):
                try:
                    os.remove(video_path)
                except:
                    pass
            
            # Cleanup extracted audio if it exists
            if audio_path and os.path.exists(audio_path):
                try:
                    # Check if it's a file or directory (based on how extract_audio works)
                    if os.path.isdir(audio_path):
                        import shutil
                        shutil.rmtree(audio_path)
                    else:
                        os.remove(audio_path)
                except:
                    pass
    finally:
        db.close()
