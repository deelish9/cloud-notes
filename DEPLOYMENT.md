# ☁️ Cloud Notes Deployment Guide

This guide follows the "Serverless Sidecar" blueprint to deploy your application for ~$0 cost.

## 🗺️ Prerequisites

1.  **Google Cloud SDK**: Ensure `gcloud` is installed and logged in.
    ```bash
    gcloud auth login
    gcloud config set project [YOUR_PROJECT_ID]
    ```
2.  **Supabase**: Create a project and copy the Transaction Pooler Connection String (Port 6543) or Session Pooler (Port 5432).
3.  **Upstash**: Create a Redis database and copy the `rediss://` URL.

## 🛠️ Step 1: Backend Deployment (Cloud Run)

### 1. Build the Container Image
We will use a single image for both the API and the Worker.

```bash
cd backend
# Enable Cloud Build API if needed
gcloud services enable cloudbuild.googleapis.com

# Submit the build
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/notes-app
```

### 2. Deploy the API Service
Deploy the FastAPI backend.

```bash
gcloud run deploy notes-api \
  --image gcr.io/$(gcloud config get-value project)/notes-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 5 \
  --set-env-vars "DATABASE_URL=[YOUR_SUPABASE_URL]" \
  --set-env-vars "REDIS_URL=[YOUR_UPSTASH_URL]" \
  --set-env-vars "GEMINI_API_KEY=[YOUR_GEMINI_KEY]" \
  --set-env-vars "GEMINI_MODEL=gemini-2.0-flash" \
  --set-env-vars "GCS_BUCKET_NAME=[YOUR_BUCKET_NAME]" \
  --set-env-vars "FRONTEND_ORIGIN=https://[YOUR_VERCEL_DOMAIN]"
  # Note: You also need to Mount your GCS Key or pass it as a Base64 env var. 
  # For simplicity, if you must use a file, you can mount it as a secret in Cloud Run UI later.
```

### 3. Deploy the Worker Service
Deploy the RQ Worker (Sidecar). This needs a different entrypoint.

```bash
gcloud run deploy notes-worker \
  --image gcr.io/$(gcloud config get-value project)/notes-app \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 1 \
  --timeout 300s \
  --command "python" \
  --args "-m,app.worker" \
  --set-env-vars "DATABASE_URL=[YOUR_SUPABASE_URL]" \
  --set-env-vars "REDIS_URL=[YOUR_UPSTASH_URL]" \
  --set-env-vars "GEMINI_API_KEY=[YOUR_GEMINI_KEY]" \
  --set-env-vars "GEMINI_MODEL=gemini-2.0-flash" \
  --set-env-vars "GCS_BUCKET_NAME=[YOUR_BUCKET_NAME]" \
  --set-env-vars "OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES"
```
> **Note**: `min-instances 1` keeps the worker alive to listen to Redis. This may cost a small amount (estimated <$5/mo).

## 🚀 Step 2: Frontend Deployment (Vercel)

1.  **Push your code** to GitHub.
2.  Import the `frontend` folder into Vercel.
3.  **Environment Variables**:
    *   `NEXT_PUBLIC_API_URL`: Set this to `/api` (This triggers the rewrite rule in `vercel.json`).
    *   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: From your Clerk dashboard.
4. **Deploy**!

## 🔗 Step 3: Final Wiring

1.  Copy your Vercel Domain (e.g., `https://cloud-notes.vercel.app`).
2.  Update the `notes-api` Cloud Run service environment variable `FRONTEND_ORIGIN` to match this domain (to fix CORS).
3.  Update your Clerk "Allowed Origins" to include your Vercel domain.

## ✅ Verification
1.  Open your Vercel app.
2.  Upload a video.
3.  Check the "Recent Jobs" list. It should go from `queued` -> `processing` -> `ready`.
