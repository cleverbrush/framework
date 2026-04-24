#!/usr/bin/env bash
# scripts/dev-demo.sh
#
# Local dev orchestrator for the todo demo:
#   1. Brings up the Postgres container from demos/docker-compose.yml (only that service).
#   2. Waits for the Postgres healthcheck.
#   3. Runs pending migrations against the local DB.
#   4. Starts the backend (tsx watch, hot reload) and frontend (vite) in parallel.
#
# Usage:
#   npm run dev:demo
# Press Ctrl-C once to stop both servers; postgres keeps running.
# Stop postgres explicitly with:  npm run dev:demo:stop

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/demos/docker-compose.yml"
BACKEND_ENV_FILE="$ROOT/demos/todo-backend/.env"

cd "$ROOT"

echo "▶ Starting Postgres (docker compose)…"
docker compose -f "$COMPOSE_FILE" up -d postgres

echo "▶ Waiting for Postgres to become healthy…"
for _ in $(seq 1 30); do
    status=$(docker inspect --format='{{.State.Health.Status}}' demos-postgres-1 2>/dev/null || echo "starting")
    if [ "$status" = "healthy" ]; then
        echo "  ✓ Postgres is healthy"
        break
    fi
    sleep 1
done
if [ "$status" != "healthy" ]; then
    echo "  ✗ Postgres did not become healthy in time" >&2
    exit 1
fi

# Load the backend .env so cb-orm migrations connect to the correct host/port.
if [ -f "$BACKEND_ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$BACKEND_ENV_FILE"
    set +a
fi

echo "▶ Running migrations…"
# NOTE: cb-orm doesn't currently call `process.exit(0)` after migrations
# complete, so the process lingers waiting on the knex pool's idle timeout
# (~30s). We wrap it in `timeout` and accept exit code 124 (SIGTERM) as
# success — the migrations themselves are fully applied by the time the
# CLI prints its final line.
(
    cd "$ROOT/demos/todo-backend"
    timeout --preserve-status 20s npm run db:run || rc=$?
    if [ "${rc:-0}" -ne 0 ] && [ "${rc:-0}" -ne 124 ] && [ "${rc:-0}" -ne 143 ]; then
        echo "  ✗ Migrations failed with exit code $rc" >&2
        exit "$rc"
    fi
)

echo "▶ Starting backend + frontend (Ctrl-C to stop)…"
npx --no-install concurrently \
    --names "backend,frontend" \
    --prefix-colors "cyan,magenta" \
    --kill-others-on-fail \
    "npm run dev -w @cleverbrush/todo-backend" \
    "npm run dev -w @cleverbrush/todo-frontend"
