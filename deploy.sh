#!/bin/bash
IMAGE_URI="$1"

REGION="${AWS_REGION}"
ACCOUNT="${AWS_ACCOUNT}"

echo "Logging in to ECR"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

echo "Pulling latest image: $IMAGE_URI"
docker pull "$IMAGE_URI"

echo "Stopping old containers..."
docker stop habitapp habitapp-nginx || true

echo "Removing old containers..."
docker rm -f habitapp habitapp-nginx || true

echo "Creating network if it doesn't exist..."
docker network create habitapp-network 2>/dev/null || true

echo "Starting backend container..."
docker run -d --name habitapp \
  -e PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
  -e SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
  --network habitapp-network \
  "$IMAGE_URI"


echo "Verifying nginx.conf exists..."
if [ ! -f "$HOME/nginx.conf" ]; then
  echo "Error: nginx.conf not found at $HOME/nginx.conf"
  exit 1
fi

echo "Starting nginx container..."
docker run -d --name habitapp-nginx \
  -p 80:80 \
  -v $HOME/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  --network habitapp-network \
  nginx:alpine