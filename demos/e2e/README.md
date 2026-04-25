# `@cleverbrush/demo-e2e`

End-to-end test suite for the todo demo. Brings up the full stack
(Postgres + ClickStack + backend + frontend) with Docker Compose, runs
fresh migrations, and exercises the system through both REST/WebSocket
APIs (Vitest) and the React UI (Playwright + Chromium).

## Quick start

From the repo root:

```bash
npm run test:e2e            # full suite (api + ui)
npm run test:e2e:api        # api project only
npm run test:e2e:ui         # ui project only (requires chromium installed)
npm run test:e2e:reset      # wipes Postgres volume first, then runs full suite
```

From this package:

```bash
npx vitest --run                              # full suite
npx vitest --run --project api                # API tests only
npx vitest --run --project ui                 # UI tests only
npx vitest --run src/api/todos.api.test.ts    # single file
```

### One-time browser install

The UI project requires Chromium. After `npm install`, run:

```bash
cd demos/e2e && npx playwright install chromium
```

## Environment variables

| Variable                  | Default                  | Notes                                                                                  |
| ------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `KEEP_STACK`              | `1` (locally) / `0` (CI) | If `1`, do not stop containers in teardown. Lets you re-run quickly during development.|
| `RESET`                   | `0`                      | If `1`, run `docker compose down -v` before bringing the stack up (wipes Postgres).    |
| `CI`                      | unset                    | Setting `CI=true` flips `KEEP_STACK` default to `0` and forces full teardown.          |
| `HEADED`                  | `0`                      | If `1`, launch Chromium headed so you can watch UI tests run.                          |
| `SLOWMO`                  | `0`                      | Slow-motion delay (ms) for Playwright actions — useful with `HEADED=1`.                |
| `E2E_API_URL`             | `http://localhost:3000`  | Backend HTTP base URL.                                                                 |
| `E2E_WS_URL`              | `ws://localhost:3000`    | Backend WebSocket base URL.                                                            |
| `E2E_FRONTEND_URL`        | `http://localhost:5173`  | Vite dev server URL (used by Playwright).                                              |
| `E2E_CLICKHOUSE_URL`      | `http://localhost:8123`  | ClickHouse HTTP API.                                                                   |
| `E2E_CLICKHOUSE_USER`     | `api`                    | ClickHouse user (read-only `api` user is created in the docker-compose stack).         |
| `E2E_CLICKHOUSE_PASSWORD` | `api`                    | ClickHouse password.                                                                   |
| `E2E_PG_HOST`             | `localhost`              | Postgres host.                                                                         |
| `E2E_PG_PORT`             | `5445`                   | Postgres port (matches `demos/docker-compose.yml`).                                    |
| `E2E_PG_DB`               | `todos`                  | Postgres database.                                                                     |
| `E2E_PG_USER`             | `postgres`               | Postgres user.                                                                         |
| `E2E_PG_PASSWORD`         | `postgres`               | Postgres password.                                                                     |

## Stack lifecycle

`src/setup/global-setup.ts` runs once per `vitest` invocation:

1. **Smart detection** — if backend (`/health`) and frontend root are
   already serving on their expected ports, skips starting those Compose
   services. This means you can run the suite on top of a long-running
   `npm run dev:demo` without conflicts.
2. **Infrastructure** — always brings up `postgres` and `clickstack`
   (re-using existing containers).
3. **Health waits** — polls each service for up to 60 s.
4. **Migrations** — `npm run db:run -w @cleverbrush/todo-backend`,
   wrapped in `timeout 60s` because the cb-orm CLI keeps the pg pool
   alive after `Already up to date.` (~30 s before it would exit).
5. **Teardown** — `docker compose stop` (preserves volumes for
   inspection) unless `CI=true` or `RESET=1`.

## Test isolation

There is no per-test truncate. Every test that needs data creates its
own user via `createUser({ suite })`, which:

- registers a unique email `e2e-${suite}-${uuid}@test.local`
- logs in to obtain a JWT
- optionally promotes the user to `admin` via direct SQL (for admin
  endpoint tests)

This makes failures easy to debug because rows survive between runs and
suites cannot interfere with each other.

## Project layout

```
src/
  setup/
    global-setup.ts        # docker compose orchestration + health waits
  support/
    auth.ts                # createUser(), authedRequest()
    clickhouse.ts          # waitForRows(), pingClickhouse()
    db.ts                  # pg pool + getUserByEmail / getTodoById / promoteToAdmin
    env.ts                 # config object reading E2E_* vars
    http.ts                # request() / streamRequest() / json()
    ids.ts                 # uniqueEmail(), uniqueTitle(), shortId()
    playwright.ts          # withPage(fn) — isolated browser context per test
    ws.ts                  # connectWs(path, {token}) — WebSocket client wrapper
  api/                     # Vitest project: parallel; ~46 tests, ~70 s
    *.api.test.ts          # REST + import/export + admin + activity + telemetry
    *.ws.test.ts           # WebSocket subscriptions
  ui/                      # Vitest project: serial (singleFork); ~4 tests, ~25 s
    *.ui.test.ts           # Playwright UI smoke flows
```

## What's covered

### REST / WebSocket (`api/`)

- **Auth** — register / login / `me`, password not leaked, duplicate email,
  bad password, short password, unauthenticated 401.
- **Todos** — full CRUD, list pagination, `getWithAuthor`, polymorphic
  events (`assigned` / `commented` / `completed`), optimistic concurrency
  on `complete` (200 / 409 with `If-Match`), cross-user 403, attachment
  download, `legacyReplace` redirect.
- **Import / Export** — 207 small batch, 202 large batch, idempotency
  header (contract-level), CSV export with quoting + content headers.
- **Users (admin)** — list (admin only), delete user, self-delete blocked,
  cross-user 403.
- **Webhooks** — subscribe with valid / invalid event types.
- **Admin activity** — NDJSON stream parses cleanly; non-admin gets 403.
- **Live (WS)** — `/ws/todos` server push, `/ws/chat` 2-client broadcast,
  `/ws/activity` REST→WS bridge.
- **Demo resilience** — `slow`, `flaky` (multi-attempt with unique key),
  `echo`, `crash-sql`, `crash-runtime`.
- **Activity** — polymorphic listAll + delete.
- **Telemetry smoke** — injects a known traceparent and asserts matching
  rows appear in `default.otel_logs` and `default.otel_traces`.

### UI (`ui/`)

- **auth** — register → autoredirect to `/todos`, sidebar shows email;
  logout → relogin.
- **todo-crud** — create via form, appears in list, DB row asserted,
  delete via row action + confirm dialog, row gone + DB row gone.
- **live** — Live page connects, badge becomes "connected", at least
  one server-push event renders within 8 s.

## Adding a new test

1. Pick a project — `src/api/foo.api.test.ts` for fast parallel API
   coverage, or `src/ui/foo.ui.test.ts` for browser-driven flows.
2. For data, call `createUser({ suite: 'foo' })` to get a scoped user.
3. For requests, use `authedRequest(token)('METHOD', '/path', {...})`
   which returns `{status, headers, body}` and never throws on 4xx/5xx.
4. For DB assertions, use the helpers in `support/db.ts`.
5. Avoid hard-coded titles or emails — always go through `uniqueTitle()`
   / `uniqueEmail()` so re-runs and parallel suites don't collide.

## Troubleshooting

- **"Executable doesn't exist at chrome-headless-shell"** — run
  `npx playwright install chromium` once.
- **`/health` 60 s timeout in setup** — the backend is probably crashing
  on startup. Check `docker logs demos-backend-1` (or just run
  `npm run dev:demo` to see logs in your terminal).
- **`Migrations` step times out** — the migration command exits with
  124 after `timeout 60s`, which the harness treats as success because
  the `cb-orm migrate run` command keeps the pool alive (~30 s) after
  printing "Already up to date.". This is expected.
- **Ports already in use** — the harness detects that backend/frontend
  are already serving and skips starting them. To force the harness to
  manage them, stop your local `npm run dev:demo` first.
