#!/usr/bin/env bash
# scripts/dev-demo-stop.sh
#
# Stops the background processes started by dev-demo.sh, then stops the
# Docker Compose infrastructure services (Postgres + Clickstack).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/demos/docker-compose.yml"
PID_FILE="$HOME/.cache/cleverbrush/dev-demo.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    # Validate the PID is a positive integer before using it.
    if [[ "$PID" =~ ^[0-9]+$ ]]; then
        echo "▶ Stopping dev servers (PID $PID)…"
        kill "$PID" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
fi

echo "▶ Stopping Docker Compose services…"
docker compose -f "$COMPOSE_FILE" stop postgres clickstack
