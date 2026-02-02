#!/bin/bash
set -e

# Configuration
PROJECT_ID="cloud-notes-dlsa-01"
REGION="us-central1"
REPO_NAME="notes-app"
TAG=$(date +%Y%m%d%H%M%S)
IMAGE="gcr.io/$PROJECT_ID/$REPO_NAME:$TAG"

# Add local GCloud SDK to PATH if it exists
if [ -d "$HOME/google-cloud-sdk/bin" ]; then
  export PATH="$HOME/google-cloud-sdk/bin:$PATH"
fi

# Load environment variables if .env exists
if [ -f backend/.env ]; then
  echo "📄 Loading environment variables from backend/.env"
  export $(grep -v '^#' backend/.env | xargs)
fi

echo "🗄️ Running database migrations..."
cd backend
./venv/bin/python3 -m alembic upgrade head
cd ..

echo "🚀 Building and pushing image: $IMAGE"
cd backend
gcloud builds submit --tag $IMAGE

echo "🛠️ Deploying notes-api..."
gcloud run deploy notes-api \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 5 \
  --service-account github-actions-deployer@cloud-notes-dlsa-01.iam.gserviceaccount.com

echo "🛠️ Deploying notes-worker..."
gcloud run deploy notes-worker \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --no-allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --no-cpu-throttling \
  --min-instances 1 \
  --max-instances 1 \
  --timeout 3600s \
  --command python \
  --args="-m,app.worker" \
  --service-account github-actions-deployer@cloud-notes-dlsa-01.iam.gserviceaccount.com

echo "✅ Deployment complete with tag: $TAG"
