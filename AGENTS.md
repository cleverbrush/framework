# AI Agent Guidelines

This file provides instructions for AI agents (Codex, Copilot, Cursor, etc.)
working in this repository. Read this before making any changes.

## Mandatory Quality Gates

Every task must leave the repository in a passing state. Before considering
work complete, verify all three commands return zero exit codes:

```bash
npm run lint    # Biome — formatting + lint rules
npm run build   # Turborepo — all packages, dependency order
npm run test    # Vitest — unit tests + typecheck
```

To auto-fix lint/formatting issues before the final check:

```bash
npm run lint:fix
```

> Never commit code that breaks any of the three gates above.

---

## Repository Overview

**Monorepo** managed with **npm workspaces** and **Turborepo**.

| Property | Value |
|---|---|
| Package manager | npm (v24+) |
| Build system | Turborepo (`turbo run build`) |
| Language | TypeScript — target ES2022, `moduleResolution: bundler` |
| Lint / Format | [Biome](https://biomejs.dev) (not ESLint or Prettier) |
| Test runner | [Vitest](https://vitest.dev) (with built-in typecheck) |
| Node.js | 20+ (22 recommended — see `.nvmrc`) |
| Module system | ES Modules (`"type": "module"` in root `package.json`) |

### Workspace layout

```
libs/          ← publishable packages  (all @cleverbrush/* scoped)
demos/         ← non-published demo apps (todo-backend, todo-frontend, e2e)
websites/      ← documentation & schema playground sites
scripts/       ← build/release helper scripts
```

---

## Library Packages (`libs/`)

| Package | Description |
|---|---|
| `@cleverbrush/schema` | Schema validation — immutable fluent builders, Standard Schema v1 |
| `@cleverbrush/deep` | Deep equality & deep-extend utilities |
| `@cleverbrush/async` | Async utilities: Collector, debounce, throttle, retry |
| `@cleverbrush/mapper` | Schema-driven object mapper |
| `@cleverbrush/react-form` | React form library powered by schema PropertyDescriptors |
| `@cleverbrush/scheduler` | Cron-like job scheduler with schema-validated config |
| `@cleverbrush/server` | Schema-first HTTP server: DI, auto-validation, RFC 9457 errors |
| `@cleverbrush/server-openapi` | OpenAPI 3.x generation from server endpoints |
| `@cleverbrush/client` | Type-safe HTTP client for `@cleverbrush/server` endpoints |
| `@cleverbrush/di` | Dependency-injection container |
| `@cleverbrush/auth` | Auth / principal utilities |
| `@cleverbrush/orm` | ORM layer (knex-based) |
| `@cleverbrush/orm-cli` | CLI for ORM migrations |
| `@cleverbrush/knex-schema` | Knex + schema extension (`hasColumnName`, `hasTableName`) |
| `@cleverbrush/knex-clickhouse` | Knex dialect for ClickHouse |
| `@cleverbrush/log` | Logging utilities |
| `@cleverbrush/otel` | OpenTelemetry instrumentation |
| `@cleverbrush/env` | Environment-variable parsing with schema validation |
| `@cleverbrush/schema-json` | JSON Schema generation from schema builders |

---

## Key Commands

```bash
# Install dependencies (use ci, not install, to respect lockfile)
npm ci

# Build all packages (skips website builds)
npm run build

# Build everything including website typechecks
npm run lint && npm run build
npm run typecheck:schema-site
npm run typecheck:docs-site

# Run all unit tests + typechecks
npm run test

# Run tests for a single package
npx vitest --run libs/schema

# Lint (Biome check — no writes)
npm run lint

# Lint + auto-fix
npm run lint:fix

# Clean all build artifacts
npm run clean

# Watch mode (TypeScript project references)
npm run watch
```

---

## Code Style Rules (enforced by Biome)

- **Indentation**: 4 spaces
- **Quotes**: single quotes in JS/TS, double quotes in JSX
- **Semicolons**: always
- **Trailing commas**: none
- **Line width**: 80 characters
- **Arrow parens**: only when required
- `noExplicitAny` — **off** (explicit `any` is permitted)
- `noNonNullAssertion` — **off** (`!` is permitted)
- `useNodejsImportProtocol` — **off** (bare `fs`, `path`, etc. are fine)

Scope: Biome checks `libs/**`, `websites/schema/**`, `websites/docs/**`.
The `demos/` directory is linted separately (see `demos/todo-backend/biome.json`).

---

## TypeScript Conventions

- `strictNullChecks: true` — always handle `null | undefined`
- `noImplicitThis: true` (in individual lib configs)
- **No `require()`** — ESM only; use `import`
- Target `ES2022`; use modern syntax freely
- Type assertions with `as` are acceptable (the linter won't block them)

---

## Testing Conventions

- Tests are **co-located** with source files: `src/foo.ts` → `src/foo.test.ts`
- Vitest globals are available (`describe`, `it`, `expect`, etc.) — no explicit
  import needed (configured via `"types": ["vitest/globals"]` in `tsconfig.json`)
- Run with `npm run test` which also performs TypeScript typechecking
- Benchmarks live in `libs/benchmarks/` and run with `npm run bench`
- Server integration tests live in `libs/server-integration-tests/`
- E2E tests live in `demos/e2e/` — require Docker + Postgres + ClickHouse stack

---

## Schema Library (`@cleverbrush/schema`) — Key Patterns

All builders are **immutable** — every method returns a new builder instance:

```ts
// CORRECT — immutable chain
const schema = string().minLength(1).maxLength(100).optional();

// WRONG — mutating a builder does nothing
const s = string();
s.minLength(1); // discarded — returns new instance
```

### Extending schemas

Use the extension system instead of subclassing:

```ts
// 1. Define
const myExt = defineExtension({ ... });

// 2. Apply
const { string, number } = withExtensions(myExt);
```

See `libs/schema/src/extensions/` for examples.

---

## Server Library (`@cleverbrush/server`) — Key Patterns

Endpoints are built with an immutable `EndpointBuilder`:

```ts
export const ListTodosEndpoint = endpoint
    .get('/api/todos')
    .query(TodoListQuerySchema)
    .authorize(PrincipalSchema)
    .inject({ db: BoundQueryToken })
    .responses({ 200: array(TodoResponseSchema) });
```

Export the constant; consumers use `typeof ListTodosEndpoint` for type sharing:

```ts
const handler: Handler<typeof ListTodosEndpoint> = async ({ query }) => { ... };
```

---

## Adding / Modifying Packages

### New source files

1. Add tests in a co-located `*.test.ts` file.
2. Export new public symbols via the package's `src/index.ts`.
3. Check that `npm run build` still succeeds (Turbo handles dep ordering).

### New library package

Each `libs/<name>/` must have:
- `package.json` with `"name": "@cleverbrush/<name>"` and `"sideEffects": false`
- `tsconfig.build.json` extending the root config
- `tsup.config.ts` (or equivalent) for building to `dist/`
- `src/index.ts` as the main entry point
- Tests co-located with source

### Adding a schema extension

1. Create `libs/schema/src/extensions/<myExtension>.ts`
2. Export it from `libs/schema/src/extensions/index.ts`
3. Add tests in a co-located `*.test.ts` file

---

## Changeset Requirement

Every PR that changes published-package behaviour **must** include a changeset:

```bash
npx changeset
```

Bump type guide:
- **patch** — bug fixes, internal refactors with no API change
- **minor** — new features, new exports, new builders/extensions
- **major** — breaking API changes

All packages are versioned together (fixed release group).

---

## Demo Application

The `demos/todo-backend` + `demos/todo-frontend` pair demonstrates the full
framework stack. For local development:

```bash
npm run dev:demo        # starts Postgres (Docker), runs migrations, starts servers
npm run dev:demo:stop   # stops Postgres container
```

Ports: backend `:3000`, frontend `:5173`, Postgres `:5445`.

> `libs/*/dist` must be built before running the backend dev server, because
> workspace dependencies resolve to the `dist/` directories.

---

## What NOT to Do

- Do **not** use `require()` — this is an ESM-only codebase.
- Do **not** run `npm install` — use `npm ci` to respect the lockfile.
- Do **not** modify `package-lock.json` manually.
- Do **not** use ESLint or Prettier — Biome is the sole formatter/linter.
- Do **not** bypass the Biome check with `// biome-ignore` unless absolutely
  necessary, and always add an explanation comment.
- Do **not** mutate schema builder instances — all builder methods are immutable.
- Do **not** add `console.log` debug statements to committed code.
- Do **not** skip adding a changeset when modifying a published package.
- Do **not** push directly to `master` — all changes go via PRs.
