#!/usr/bin/env bash
# scripts/dev-demo.sh
#
# Local dev orchestrator for the todo demo:
#   1. Brings up Postgres and Clickstack containers from demos/docker-compose.yml.
#   2. Waits for the Postgres healthcheck.
#   3. Runs pending migrations against the local DB.
#   4. Starts the backend (tsx watch, hot reload) and frontend (vite) in parallel.
#
# Usage:
#   npm run dev:demo
# Press Ctrl-C once to stop both servers; containers keep running.
# Stop everything with:  npm run dev:demo:stop

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/demos/docker-compose.yml"
BACKEND_ENV_FILE="$ROOT/demos/todo-backend/.env"

cd "$ROOT"

echo "▶ Starting Postgres + Clickstack (docker compose)…"
docker compose -f "$COMPOSE_FILE" up -d postgres clickstack

echo "▶ Waiting for Postgres to become healthy…"
for _ in $(seq 1 30); do
    POSTGRES_CID=$(docker compose -f "$COMPOSE_FILE" ps -q postgres 2>/dev/null || true)
    status=$([ -n "$POSTGRES_CID" ] && docker inspect --format='{{.State.Health.Status}}' "$POSTGRES_CID" 2>/dev/null || echo "starting")
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
# (~30s). We implement a portable timeout via background kill: start the
# migration, record its PID, and send SIGTERM after 20s if still running.
(
    cd "$ROOT/demos/todo-backend"
    npm run db:run &
    MIGRATE_PID=$!
    (sleep 20 && kill -TERM "$MIGRATE_PID" 2>/dev/null) &
    WATCHDOG_PID=$!
    wait "$MIGRATE_PID"
    rc=$?
    kill -0 "$WATCHDOG_PID" 2>/dev/null && kill "$WATCHDOG_PID" 2>/dev/null || true
    wait "$WATCHDOG_PID" 2>/dev/null || true
    # rc=0: clean; rc=143: SIGTERM from watchdog (migrations already done)
    if [ "$rc" -ne 0 ] && [ "$rc" -ne 143 ]; then
        echo "  ✗ Migrations failed with exit code $rc" >&2
        exit "$rc"
    fi
)

PID_DIR="$HOME/.cache/cleverbrush"
PID_FILE="$PID_DIR/dev-demo.pid"

mkdir -p "$PID_DIR"
# Remove any leftover PID file from a previous run.
rm -f "$PID_FILE"

# Trap Ctrl-C / EXIT so we clean up the PID file on normal exit.
_cleanup() {
    rm -f "$PID_FILE"
}
trap _cleanup EXIT INT TERM

echo "▶ Starting backend + frontend (Ctrl-C to stop)…"
npx --no-install concurrently \
    --names "backend,frontend" \
    --prefix-colors "cyan,magenta" \
    --kill-others-on-fail \
    "npm run dev -w @cleverbrush/todo-backend" \
    "npm run dev -w @cleverbrush/todo-frontend" &
CONCURRENTLY_PID=$!
echo "$CONCURRENTLY_PID" > "$PID_FILE"
wait "$CONCURRENTLY_PID"
