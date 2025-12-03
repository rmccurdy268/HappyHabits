#!/bin/bash
IMAGE_URI="$1"

echo "Pulling latest image: $IMAGE_URI"
docker pull $IMAGE_URI

echo "Stopping old container..."
docker stop habitapp || true
docker rm habitapp || true

echo "Starting new container..."
docker run -d --name habitapp -p 80:3000 $IMAGE_URI
