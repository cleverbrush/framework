# Claude Instructions — cleverbrush/framework

Instructions for Claude agents working in this repository.

## Mandatory Quality Gates

Before considering any task complete, all three commands **must** pass with
zero errors:

```bash
npm run lint    # Biome — formatting and lint rules
npm run build   # Turborepo — all packages in dependency order
npm run test    # Vitest — unit tests + TypeScript typecheck
```

Auto-fix formatting/lint before the final check:

```bash
npm run lint:fix
```

> Never leave the repository in a state where any of the three commands above
> fail. This is a hard requirement.

---

## Repository At a Glance

| Property | Value |
|---|---|
| Package manager | npm (v24+) — always use `npm ci`, never `npm install` |
| Build orchestration | Turborepo (`turbo run build`) |
| Language | TypeScript — `target: ES2022`, `moduleResolution: bundler` |
| Linter / Formatter | **Biome** — not ESLint, not Prettier |
| Test runner | **Vitest** — unit tests co-located with source; typecheck included |
| Module system | ESM only (`"type": "module"`); no `require()` |
| Node.js | 20+ (22 recommended) |

### Directory structure

```
libs/          ← publishable @cleverbrush/* packages
demos/         ← demo applications (todo-backend, todo-frontend, e2e)
websites/      ← docs and schema playground sites
scripts/       ← build/release helper scripts
.github/       ← CI workflows (lint → build → test on every PR)
```

---

## Key Scripts

```bash
npm run build             # build all libs (skips website packages)
npm run test              # vitest --run --typecheck (unit tests + types)
npm run lint              # biome check (read-only)
npm run lint:fix          # biome check --write (auto-fix)
npm run clean             # remove all dist/ and .turbo/ artifacts
npm run typecheck:schema-site   # tsc for websites/schema
npm run typecheck:docs-site     # tsc for websites/docs

# Single-package test run
npx vitest --run libs/<package-name>

# Demo app (requires Docker for Postgres)
npm run dev:demo          # postgres + migrations + backend + frontend
npm run dev:demo:stop     # stop postgres container
```

---

## Code Style (Biome-enforced)

- 4-space indentation
- Single quotes (`'`) in TypeScript/JavaScript; double quotes (`"`) in JSX
- Semicolons — always
- No trailing commas
- 80-character line width
- Arrow function parens only when required

The following rules are **disabled** — do not add workarounds for them:
- `noExplicitAny` — `any` is allowed
- `noNonNullAssertion` — `!` postfix is allowed
- `useNodejsImportProtocol` — bare `fs`, `path`, etc. are fine

Biome covers `libs/**` and `websites/**`. The `demos/` directory has its own
Biome config at `demos/todo-backend/biome.json`.

---

## TypeScript Rules

- `strictNullChecks: true` — handle `null | undefined` explicitly
- No `require()` — use `import` statements
- Type assertions (`as`) are acceptable
- Generics are used extensively — preserve type safety when extending

---

## Testing Rules

- Tests are **co-located** with source files: `src/foo.ts` → `src/foo.test.ts`
- Vitest globals (`describe`, `it`, `expect`, `beforeEach`, etc.) are available
  without imports — configured via `"types": ["vitest/globals"]`
- Every new public behaviour must have tests
- Run `npm run test` to validate (runs vitest + typecheck together)

---

## Schema Library Patterns

### Immutability (critical)

All schema builders are **immutable**. Every method returns a **new** instance:

```typescript
// Correct
const schema = string().minLength(1).optional();

// Wrong — the intermediate result is discarded
const s = string();
s.minLength(1); // no-op, returns new instance that is thrown away
```

### Extension system

Use `defineExtension` + `withExtensions` to add methods to builders:

```typescript
import { defineExtension, withExtensions } from '@cleverbrush/schema/extension';

const myExt = defineExtension({ /* ... */ });
const { string, number } = withExtensions(myExt);
```

Do not subclass builders directly.

### Standard Schema interop

Use `extern(zodSchema)` or `extern(valibotSchema)` to wrap any Standard
Schema v1-compatible library inside the `@cleverbrush/schema` ecosystem.

---

## Server Library Patterns

### Endpoint builder

```typescript
export const MyEndpoint = endpoint
    .post('/api/resource')
    .body(RequestBodySchema)
    .authorize(PrincipalSchema)
    .inject({ db: DbToken })
    .responses({ 200: ResponseSchema, 422: ErrorSchema });
```

### Type sharing between packages

Export the **endpoint constant**, not derived types:

```typescript
// shared package
export const MyEndpoint = endpoint.get('/api/foo').responses({ 200: FooSchema });

// consumer
import { MyEndpoint } from '@myapp/shared';
const handler: Handler<typeof MyEndpoint> = async ({ context }) => { ... };
```

---

## Adding / Changing Code

### Modifying a library

1. Edit source under `libs/<package>/src/`.
2. Add or update co-located `*.test.ts` tests.
3. Export new public symbols from `src/index.ts`.
4. Run `npm run build` — Turbo rebuilds in correct dependency order.
5. Run `npm run test` — confirm all tests pass.
6. Run `npm run lint` — confirm no lint errors.

### Creating a new library package

Each `libs/<name>/` needs:
- `package.json` — `"name": "@cleverbrush/<name>"`, `"sideEffects": false`
- `tsconfig.build.json` — extends root, sets `rootDir: ./src`, `outDir: ./dist`
- `tsup.config.ts` — build entry points
- `src/index.ts` — public exports
- Co-located tests

### Adding a schema extension

1. Create `libs/schema/src/extensions/<name>.ts`
2. Re-export from `libs/schema/src/extensions/index.ts`
3. Add tests in `libs/schema/src/extensions/<name>.test.ts`

---

## Changeset Requirement

Every change to a published package (`libs/**`) **must** include a changeset:

```bash
npx changeset   # interactive — select packages + bump type + description
```

| Bump | When |
|---|---|
| `patch` | Bug fixes, internal refactors with no API change |
| `minor` | New features, new exports, new builders/extensions |
| `major` | Breaking API changes |

All packages share a fixed release group and are versioned together.

---

## Demo App Notes

- Backend depends on built `libs/*/dist` — always run `npm run build` first.
- Backend: `http://localhost:3000` (health: `/health`, OpenAPI: `/openapi.json`)
- Frontend: `http://localhost:5173`
- Postgres: `localhost:5445` (db `todo_db`, user `todo_user`, pw `todo_secret`)

---

## Things to Avoid

| Action | Reason |
|---|---|
| Using `require()` | ESM-only codebase |
| Running `npm install` | Use `npm ci` to respect the lockfile |
| Using ESLint or Prettier | Biome is the sole linter/formatter |
| Mutating builder instances | All builders are immutable |
| Skipping tests for new behaviour | Every new path needs a test |
| Leaving `console.log` in committed code | Use the `@cleverbrush/log` library |
| Skipping the changeset for a published-package change | Required for releases |
| Adding `// biome-ignore` without explanation | Always add a justification |
| Pushing directly to `master` | Use feature branches and PRs |
