#!/bin/bash
IMAGE_URI="$1"

REGION="${AWS_REGION}"
ACCOUNT="${AWS_ACCOUNT}"

echo "Logging in to ECR"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

echo "Pulling latest image: $IMAGE_URI"
docker pull "$IMAGE_URI"

echo "Stopping old container..."
docker stop habitapp || true
docker rm habitapp || true

echo "Starting new container..."
docker run -d --name habitapp -p 80:3000 \
  -e PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
  -e SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
  "$IMAGE_URI"