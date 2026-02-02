import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Load .env
from dotenv import load_dotenv
load_dotenv("backend/.env")

from app.db.session import SessionLocal
from app.models.video_job import VideoJob
from sqlalchemy import func

def verify():
    db = SessionLocal()
    try:
        # Check if 'error' column exists and query jobs
        count = db.query(VideoJob).count()
        print(f"Total jobs in DB: {count}")
        
        last_job = db.query(VideoJob).order_by(VideoJob.updated_at.desc()).first()
        if last_job:
            print(f"Latest Job ID: {last_job.id}")
            print(f"Status: {last_job.status}")
            print(f"Error field: {last_job.error}")
            
        print("✅ Database connection and schema verification successful.")
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
