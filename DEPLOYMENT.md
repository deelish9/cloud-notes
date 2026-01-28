# Cloud Notes Deployment Guide

This guide details how to verify and redeploy the Cloud Notes application.

## Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated.
- Supabase account (Database).
- Upstash account (Redis).
- Clerk account (Auth).
- Gemini API Key.

## 1. Backend (Google Cloud Run)

The backend consists of two services running from the same Docker image.

### Build Container Image
First, build the image and push it to Google Container Registry (GCR).

```bash
cd backend
gcloud builds submit --tag gcr.io/cloud-notes-dlsa-01/notes-app
```

### Deploy API Service (`notes-api`)
The API handles HTTP requests from the frontend.

```bash
gcloud run deploy notes-api \
  --image gcr.io/cloud-notes-dlsa-01/notes-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 5 \
  --set-env-vars "DATABASE_URL=postgresql://...,REDIS_URL=rediss://...,GEMINI_API_KEY=...,GEMINI_MODEL=gemini-2.0-flash,GCS_BUCKET_NAME=cloud-notes-videos,FRONTEND_ORIGIN=https://cloud-notes-alpha.vercel.app,CLERK_ISSUER=...,CLERK_JWKS_URL=..."
```

**Key Environment Variables:**
- `DATABASE_URL`: Connection string from Supabase (Transaction Pooler).
- `REDIS_URL`: Connection string from Upstash.
- `GEMINI_API_KEY`: Google AI Studio Key.
- `GCS_BUCKET_NAME`: Google Cloud Storage bucket name.
- `FRONTEND_ORIGIN`: Your Vercel app URL (for CORS).

### Deploy Worker Service (`notes-worker`)
The Worker processes video files in the background (Audio Extraction -> Transcription -> Summarization).

**Critical Configuration:**
- **No CPU Throttling**: Ensures CPU is available even when not processing HTTP requests.
- **Timeout**: Set to **3600s (1 hour)** to allow processing of large videos.
- **Instances**: `min-instances=1` to ensure at least one worker is always ready (optional, but good for latency), `max-instances=1` to process serially.

```bash
gcloud run deploy notes-worker \
  --image gcr.io/cloud-notes-dlsa-01/notes-app \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --no-cpu-throttling \
  --min-instances 1 \
  --max-instances 1 \
  --timeout 3600s \
  --command python \
  --args="-m,app.worker" \
  --set-env-vars "DATABASE_URL=postgresql://...,REDIS_URL=rediss://...,GEMINI_API_KEY=...,GEMINI_MODEL=gemini-2.0-flash,GCS_BUCKET_NAME=cloud-notes-videos,OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES,CLERK_ISSUER=...,CLERK_JWKS_URL=..."
```

## 2. Frontend (Vercel)

The frontend is deployed on Vercel.

### Vercel Configuration (`vercel.json`)
The `vercel.json` file handles routing API requests to the Cloud Run backend.

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://notes-api-30096187962.us-central1.run.app/:path*"
    }
  ]
}
```

### Environment Variables (Vercel)
Set these in the Vercel Project Settings:
- `NEXT_PUBLIC_API_URL`: `https://cloud-notes-alpha.vercel.app/api` (Points to itself, rewritten to Cloud Run)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: From Clerk Dashboard.

## 3. Verification

1.  **Check API Health**: Visit `https://notes-api-30096187962.us-central1.run.app/` (Should show 404 or docs if configured).
2.  **Check Worker Logs**:
    ```bash
    gcloud beta run services logs read notes-worker --region us-central1
    ```
