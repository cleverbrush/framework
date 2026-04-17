#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Building and starting containers..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build

echo "==> Done."
echo "    schema-website → http://localhost:3100"
echo "    docs-website   → http://localhost:3101"

echo "==> Done. '$CONTAINER_NAME' is running at http://localhost:$HOST_PORT"
