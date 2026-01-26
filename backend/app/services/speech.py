import whisper

# Load once per worker process
model = whisper.load_model("base")

def transcribe_audio(audio_path: str) -> str:
    """
    Takes a local audio file path and returns transcript text
    """
    result = model.transcribe(audio_path)
    return result["text"]
