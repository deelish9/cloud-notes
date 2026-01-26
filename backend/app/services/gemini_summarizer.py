from __future__ import annotations

from typing import Optional
from app.core.config import settings

def summarize_transcript(transcript: str, gemini_file=None) -> str:
    """
    Returns a real summary (not just reformatting).
    Uses Gemini via google-genai (Gemini API).
    Can optionally include a processed video file for multimodal understanding.
    """
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing. Add it to your backend .env")

    # Import inside function so the app can boot even if you haven't installed it yet.
    from google import genai  # type: ignore

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    prompt_text = f"""
You are an expert note-taker.

TASK:
Summarize the content below into:
1) **SUMMARY**: A 5-8 sentence paragraph summary (high level). Use both audio and visual context (if available).
2) **KEY TAKEAWAYS**: 6-12 bullet key takeaways (non-redundant, meaningful).
3) **NEXT STEPS**: 3 actionable steps if any are implied.

RULES:
- Do NOT copy the transcript directly.
- Combine repeated ideas.
- Keep it concise and readable.
- If a video is provided, use visual context (slides, code, diagrams) to ENHANCE the summary, but do not list "visual observations" separately.
- The transcript is accurate for speech, but trust the video for visual details (code snippets, charts).

TRANSCRIPT:
{transcript if transcript.strip() else "(No speech detected in this video. Please rely entirely on VISUAL OBSERVATIONS.)"}
""".strip()

    contents = [prompt_text]
    if gemini_file:
        contents.append(gemini_file)

    resp = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=contents,
    )

    # google-genai returns a structured response; text is typically in resp.text
    text = getattr(resp, "text", None)
    if not text:
        raise RuntimeError("Gemini returned no text.")
    return text.strip()
