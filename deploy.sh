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

# Debug: Check environment and file location
echo "Debug info:"
echo "  Current user: $(whoami)"
echo "  HOME: $HOME"
echo "  PWD: $(pwd)"
echo "  Files in home:"
ls -la $HOME/ | grep nginx || echo "  (nginx.conf not found in listing)"

# Try multiple possible paths
NGINX_CONF=""
if [ -f "$HOME/nginx.conf" ]; then
  NGINX_CONF="$HOME/nginx.conf"
elif [ -f "/home/$(whoami)/nginx.conf" ]; then
  NGINX_CONF="/home/$(whoami)/nginx.conf"
elif [ -f "~/nginx.conf" ]; then
  NGINX_CONF="~/nginx.conf"
else
  echo "Error: nginx.conf not found in any expected location"
  echo "Searching for nginx.conf..."
  find /home -name "nginx.conf" 2>/dev/null || echo "Not found in /home"
  exit 1
fi

echo "Using nginx.conf at: $NGINX_CONF"
echo "File details:"
ls -lh "$NGINX_CONF"

echo "Starting nginx container..."
docker run -d --name habitapp-nginx \
  -p 80:80 \
  -v "$NGINX_CONF:/etc/nginx/conf.d/default.conf:ro" \
  --network habitapp-network \
  nginx:alpine