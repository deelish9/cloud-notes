from google.cloud import storage
import os
from datetime import timedelta
import uuid
from app.core.config import settings

# 1. Get bucket name from environment variable
# Make sure GCS_BUCKET_NAME is set in your docker-compose.yml
# GCS_BUCKET_NAME is now loaded in settings



# 2. Initialize client
if settings.GCS_KEY_PATH and os.path.exists(settings.GCS_KEY_PATH):
    client = storage.Client.from_service_account_json(settings.GCS_KEY_PATH)
else:
    # Fallback to default credentials (Cloud Run, etc.)
    client = storage.Client()

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

from google.cloud import iam_credentials_v1
import google.auth
import time

def get_service_account_email():
    """
    Helper to get the current service account email from default credentials.
    """
    try:
        credentials, _ = google.auth.default()
        if hasattr(credentials, "service_account_email"):
            return credentials.service_account_email
        # If running locally with gcloud auth application-default login, likely user email or None
        # But in Cloud Run, it should be the service account email.
        # Fallback: make a lighter call or assume from env?
        # Actually Google Auth libraries often lazy load.
        # Let's try to refresh to ensure email is present
        from google.auth.transport.requests import Request
        credentials.refresh(Request())
        return credentials.service_account_email
    except Exception as e:
        print(f"Warning: Could not determine service account email: {e}")
        return None

def generate_signed_url(object_name: str, minutes: int = 60) -> str:
    """
    Generates a temporary signed URL for viewing the video.
    Falls back to IAM signing if local key is missing.
    """
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    blob = bucket.blob(object_name)

    try:
        # Try standard signing (works locally with key file)
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=minutes),
            method="GET",
        )
    except Exception:
        # If it fails (likely due to missing private key in Cloud Run ADC),
        # use the IAM API method.
        # Note: This requires the Service Account to have "Service Account Token Creator" role on itself.
        
        sa_email = get_service_account_email()
        if not sa_email:
             raise ValueError("Cannot sign URL: No private key and cannot determine Service Account Email.")

        # Explicitly use the IAM credentials logic (mimicking client behavior)
        # However, generate_signed_url allows passing 'service_account_email' and 'access_token'
        # But for V4 signing without a key, we need to sign the bytes via IAM API.
        
        # Proper way: Use the `virtual` signing capability of storage client is NOT simple in python lib yet.
        # We will use the 'bucket.generate_signed_url' with 'service_account_email' 
        # combined with a custom access token? No, that's V2.
        
        # Use the explicit manual signing approach with IAM:
        # 1. Provide the Service Account Email
        # 2. Provide the Access Token (for the IAM API call itself)
        
        # Actually, the Python Storage library allows us to pass a 'credentials' object
        # that implements 'sign_bytes'. We can wrap the IAM client.
        # OR simpler: use blob.generate_signed_url with `service_account_email` 
        # AND `access_token` - valid for simple cases, but specific to V2?
        
        # Let's use the robust manual IAM SignBlob approach documentation:
        # https://cloud.google.com/iam/docs/creating-short-lived-service-account-credentials#sa-credentials-python
        
        # Simplified: Use the 'service_account_email' param which triggers the remote signing?
        # It does ONLY if you provide 'access_token' as well.
        
        credentials, _ = google.auth.default()
        from google.auth.transport.requests import Request
        credentials.refresh(Request())
        
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=minutes),
            method="GET",
            service_account_email=sa_email,
            access_token=credentials.token, 
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

    try:
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=minutes),
            method="PUT",
            content_type=content_type,
        )
    except Exception:
        # Fallback to IAM signing
        try:
            sa_email = get_service_account_email()
            if not sa_email:
                raise ValueError("No Service Account Email found for IAM signing")
                
            credentials, _ = google.auth.default()
            from google.auth.transport.requests import Request
            if not credentials.token:
                credentials.refresh(Request())
            
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=minutes),
                method="PUT",
                content_type=content_type,
                service_account_email=sa_email,
                access_token=credentials.token,
            )
        except Exception as e:
            print(f"IAM Signing failed: {e}")
            raise ValueError(f"Failed to generate signed URL via IAM: {e}")

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