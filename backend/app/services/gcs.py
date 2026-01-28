from google.cloud import storage
import os
from datetime import timedelta
import uuid
from app.core.config import settings

# 1. Get bucket name from environment variable
# Make sure GCS_BUCKET_NAME is set in your docker-compose.yml
# GCS_BUCKET_NAME is now loaded in settings



# 2. Initialize client once
client = storage.Client.from_service_account_json(settings.GCS_KEY_PATH)

def upload_video_to_gcs(file) -> str:
    """
    Uploads a file to the bucket defined in environment variables.
    """
    if not settings.GCS_BUCKET_NAME:
        raise ValueError("GCS_BUCKET_NAME environment variable is not set")

    # Get the bucket instance
    bucket = client.bucket(settings.GCS_BUCKET_NAME)

    # Generate safe unique filename
    ext = file.filename.split(".")[-1]
    blob_name = f"videos/{uuid.uuid4()}.{ext}"

    blob = bucket.blob(blob_name)

    # Reset file pointer
    file.file.seek(0)

    blob.upload_from_file(
        file.file,
        content_type=file.content_type,
        rewind=True
    )

    # Return the blob name (needed for generating signed URLs later)
    # or return blob_name if your DB stores the path
    return blob_name 

def generate_signed_url(object_name: str, minutes: int = 60) -> str:
    """
    Generates a temporary signed URL for viewing the video.
    """
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    blob = bucket.blob(object_name)


    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=minutes),
        method="GET",
    )

def generate_upload_signed_url(content_type: str, minutes: int = 15) -> dict:
    """
    Generates a temporary signed URL for uploading a video directly to GCS.
    """
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    
    # Generate unique filename on server side
    ext = "mp4" # Default, or could extract from content_type
    if "quicktime" in content_type: ext = "mov"
    elif "webm" in content_type: ext = "webm"
    
    blob_name = f"videos/{uuid.uuid4()}.{ext}"
    blob = bucket.blob(blob_name)

    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=minutes),
        method="PUT",
        content_type=content_type,
    )
    
    return {"url": url, "blob_name": blob_name}

def download_video_from_gcs(blob_name: str) -> str:
    """
    Downloads a video from GCS to a temporary local file.
    Returns the local file path.
    """
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    blob = bucket.blob(blob_name)
    
    # Create temp file path
    local_path = f"/tmp/{uuid.uuid4()}.mp4"
    blob.download_to_filename(local_path)
    
    return local_path

def upload_audio_to_gcs(file_path: str) -> str:
    """
    Uploads an audio file to GCS.
    Returns the blob name.
    """
    if not settings.GCS_BUCKET_NAME:
        raise ValueError("GCS_BUCKET_NAME environment variable is not set")
    
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    
    # Generate unique blob name
    blob_name = f"audio/{uuid.uuid4()}.mp3"
    blob = bucket.blob(blob_name)
    
    blob.upload_from_filename(file_path)
    
    return blob_name

def delete_file_from_gcs(blob_name: str):
    """
    Deletes a file from GCS.
    """
    if not settings.GCS_BUCKET_NAME:
        # If no bucket configured (e.g. dev), just ignore
        return

    try:
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(blob_name)
        blob.delete()
        print(f"Deleted {blob_name} from GCS")
    except Exception as e:
        # Log error but don't crash
        print(f"Failed to delete {blob_name} from GCS: {e}")