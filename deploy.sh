#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="cleverbrush-docs-website"
IMAGE_NAME="cleverbrush-docs-website"
HOST_PORT=3100
CONTAINER_PORT=3000

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Building Docker image..."
docker build \
    -f "$SCRIPT_DIR/website/Dockerfile" \
    -t "$IMAGE_NAME" \
    "$SCRIPT_DIR"

echo "==> Checking for existing container..."
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "    Stopping and removing existing container..."
    docker stop "$CONTAINER_NAME"
    docker rm "$CONTAINER_NAME"
fi

echo "==> Starting container on port $HOST_PORT..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "$HOST_PORT:$CONTAINER_PORT" \
    "$IMAGE_NAME"

echo "==> Done. '$CONTAINER_NAME' is running at http://localhost:$HOST_PORT"
