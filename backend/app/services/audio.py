import subprocess
import tempfile
import os

def extract_audio(video_path: str) -> str:
    """
    Extracts audio from video and returns path to .wav file
    """
    fd, audio_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)

    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        audio_path,
    ]

    print(f"Starting ffmpeg extraction: {video_path} -> {audio_path}")
    
    if os.path.exists(video_path):
        print(f"Video file size: {os.path.getsize(video_path)} bytes")
    else:
        print("Video file does not exist!")

    cmd = [
        "ffmpeg",
        "-nostdin",  # Do not expect input
        "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        audio_path,
    ]

    subprocess.run(cmd, check=True, stdin=subprocess.DEVNULL)
    return audio_path
