from app.services.audio import extract_audio
from app.services.gcs import download_video_from_gcs, upload_audio_to_gcs
from app.db.session import SessionLocal
from app.models.video_job import VideoJob
from app.services.speech import transcribe_audio
from app.services.gemini_summarizer import summarize_transcript
from app.services.gemini_files import upload_file_to_gemini, delete_file_from_gemini
import os


def generate_video_summary(job_id: str):
    db = SessionLocal()
    job = db.query(VideoJob).get(job_id)

    if not job:
        return

    video_path = None
    gemini_file = None

    try:
        # If we don't have a transcript yet, we MUST do the heavy lifting
        if not job.transcript:
            job.status = "processing"
            db.commit()

            # 1️⃣ Download video
            video_path = download_video_from_gcs(job.video_url)

            # 2️⃣ Extract audio
            audio_path = extract_audio(video_path)

            # 3️⃣ Upload audio
            audio_url = upload_audio_to_gcs(audio_path)

            job.audio_url = audio_url
            job.status = "audio_extracted"
            db.commit()

            # 4️⃣ Transcribe audio
            job.status = "transcribing"
            db.commit()

            transcript = transcribe_audio(audio_path)
            
            job.transcript = transcript
            job.status = "transcribed"
            db.commit()
        
        # 5️⃣ Generate Summary (Always do this if we have a transcript)
        if job.transcript:
            job.status = "summarizing"
            db.commit()

            # Ensure we have the video locally for visual analysis
            if not video_path:
                # If we skipped transcription, we need to download the video now
                video_path = download_video_from_gcs(job.video_url)

            # Upload video to Gemini for multimodal analysis
            try:
                gemini_file = upload_file_to_gemini(video_path)
            except Exception as e:
                # logging.warning(f"Failed to upload video to Gemini: {e}")
                gemini_file = None

            summary = summarize_transcript(job.transcript, gemini_file)
            
            job.summary = summary
            job.status = "done"
            db.commit()

    except Exception as e:
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
