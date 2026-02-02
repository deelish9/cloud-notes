import os
import time
from app.core.config import settings
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=4, max=60),
    reraise=True
)
def upload_file_to_gemini(local_path: str, mime_type: str = "video/mp4"):
    """
    Uploads a file to the Gemini File API for temporary storage/processing.
    Returns the file object (which contains .name/uri).
    """
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing.")

    # Import locally
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    file_ref = client.files.upload(
        file=local_path,
        config=types.UploadFileConfig(mime_type=mime_type)
    )
    
    # Wait for processing (videos need to be processed)
    max_retries = 60 # 2 minutes total
    retries = 0
    while retries < max_retries:
        file_ref = client.files.get(name=file_ref.name)
        if file_ref.state.name == "ACTIVE":
            break
        elif file_ref.state.name == "FAILED":
            raise RuntimeError(f"Gemini file upload failed: {file_ref.state.name}")
        
        # logging.info(f"Waiting for video processing... {file_ref.state.name}")

        time.sleep(2)
        retries += 1
    
    if retries >= max_retries:
        raise RuntimeError("Timeout waiting for Gemini file processing.")
        
    return file_ref

def delete_file_from_gemini(file_name: str):
    """
    Deletes the file from Gemini storage.
    """
    if not settings.GEMINI_API_KEY:
        return

    try:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        client.files.delete(name=file_name)
    except Exception as e:
        print(f"Warning: Failed to delete Gemini file {file_name}: {e}")
