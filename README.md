# Cloud Notes - AI-Powered Video Intelligence ☁️📝

**Cloud Notes** is a state-of-the-art SaaS platform that transforms raw video footage into structured, searchable, and actionable notes. Leveraging multimodal AI (Google Gemini 2.0), it handles the heavy lifting of audio extraction, transcription, and intelligent summarization, giving users a "second brain" for their video content.

## CloudNotes in Action 🚀

https://github.com/user-attachments/assets/dd1184e6-e8b4-43eb-b8d8-aa8ce39da12d

---

## 🎯 The Problem
*   **Information Overload**: hour-long lectures, meetings, and tutorials are hard to reference.
*   **Lost Context**: Text-only transcripts miss visual details (slides, code snippets).
*   **Inaccessible Archives**: "Videos sitting in a folder" are dead data—unsearchable and unusable.

## ✨ Our Solution
Cloud Notes provides a unified **Video Studio** and **Notebook** interface. Upload any video, and our pipeline automatically:
1.  **Extracts Audio** using high-performance FFmpeg processing.
2.  **Analyzes Multimodally**: Uses Gemini to "watch" the video and "listen" to the audio simultaneously.
3.  **Generates Notes**: Produces structured summaries, key takeaways, and action items.
4.  **Secures Content**: Private video playback via signed URLs.

---

## 🏗️ Architecture Overview

### 🔧 Core Components
*   **Frontend**: Next.js 15 (App Router) with React 18 & Clerk Auth.
*   **Backend**: FastAPI (Python 3.11) with async job queues.
*   **AI Engine**: Google Gemini 2.0 Flash/Pro (Multimodal).
*   **Processing**: RQ (Redis Queue) + FFmpeg for media pipelines.
*   **Storage**: Google Cloud Storage (GCS) for media assets.
*   **Database**: PostgreSQL + SQLAlchemy (Async).

### 💡 Key Features
*   **🤖 Multimodal AI Analysis**: Doesn't just read transcripts—it *sees* code on screen and diagrams in slides.
*   **🔎 Instant Search**: Full-text search across all generated notes and properties.
*   **📺 Secure Video Player**: Private, signed-url based playback for uploaded assets.
*   **⚡ Real-time Processing**: WebSocket/Polling based status updates (Queued -> Processing -> Ready).
*   **🌗 Modern UX**: Beautiful "Zinc" dark mode, drag-and-drop uploads, and responsive grid layouts.

---

## 🛠️ Tech Stack

### Frontend
| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 15 (Turbopack) |
| **Language** | TypeScript |
| **Styling** | Vanilla CSS ("Zinc" minimalist theme) |
| **Auth** | Clerk (Next.js SDK) |

### Backend
| Component | Technology |
|-----------|------------|
| **Framework** | FastAPI |
| **Language** | Python 3.11 |
| **Database** | PostgreSQL (AsyncPG) |
| **ORM** | SQLAlchemy 2.0 |
| **Queue** | Redis + RQ |
| **Storage** | Google Cloud Storage |
| **AI** | Google GenAI SDK (Gemini) |

---

## 📊 Project Structure

```bash
cloud-notes/
├── backend/                 # Python FastAPI Microservice
│   ├── app/
│   │   ├── api/            # REST endpoints
│   │   ├── jobs/           # Background workers (Video processing)
│   │   ├── models/         # SQLAlchemy DB models
│   │   ├── services/       # GCS, Audio, Gemini logic
│   │   └── worker.py       # Worker entrypoint
│   ├── alembic/            # DB Migrations
│   └── Dockerfile
├── frontend/                # Next.js Client
│   ├── src/app/
│   │   ├── dashboard/      # Main application logic
│   │   └── page.tsx        # Landing page
│   └── public/
└── docker-compose.yml       # Local development orchestration
```

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   Python 3.11+
*   Redis (Local or Docker)
*   PostgreSQL
*   Google Cloud Service Account (GCS + VertexAI/Gemini permissions)

### specific Setup
1.  **Clone the repository**
2.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
3.  **Backend Setup**:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    
    # Start API
    uvicorn app.main:app --reload
    
    # Start Worker (in separate terminal)
    python -m app.worker
    ```

---
*Built with ❤️ for efficiency.*
