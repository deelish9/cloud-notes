from __future__ import annotations

from typing import Optional
from app.core.config import settings

def summarize_transcript(transcript: str) -> str:
    """
    Returns a real summary (not just reformatting).
    Uses Gemini via google-genai (Gemini API).
    """
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing. Add it to your backend .env")

    # Import inside function so the app can boot even if you haven't installed it yet.
    from google import genai  # type: ignore

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    prompt = f"""
You are an expert note-taker.

TASK:
Summarize the transcript below into:
1) A 5-8 sentence paragraph summary (high level).
2) 6-12 bullet key takeaways (non-redundant, meaningful).
3) 3 actionable "Next steps" if any are implied.

RULES:
- Do NOT copy the transcript.
- Combine repeated ideas.
- Keep it concise and readable.
- If the transcript is low-quality, still produce best-effort summary.

TRANSCRIPT:
{transcript}
""".strip()

    resp = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
    )

    # google-genai returns a structured response; text is typically in resp.text
    text = getattr(resp, "text", None)
    if not text:
        raise RuntimeError("Gemini returned no text.")
    return text.strip()
