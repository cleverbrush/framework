# Contributing to @cleverbrush/framework

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- **Node.js** 24 or later (see `.nvmrc`)
- **npm** 11 (see the root `packageManager` field)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/cleverbrush/framework.git
cd framework

# Install dependencies
npm ci

# Build all packages
npm run build

# Run tests & typechecks
npm run test
```

The root build also refreshes workspace CLI links. On a fresh checkout npm cannot
link `cb-orm` until its generated `dist/bin.js` exists; the postbuild step makes
demo migration commands work without a second dependency installation.

## Release verification

In addition to lint, build and unit/type tests, CI runs:

```bash
npm run test:coverage
npm run test:packages
npm audit --audit-level=high
npm run typecheck:schema-site
npm run typecheck:docs-site
npm run build:schema-site
npm run build:docs-site
```

`coverage-thresholds.json` sets per-package statement, branch, function and line
floors for **unit** coverage. New published packages need explicit floors; do not
lower existing floors to hide regressions. Refresh README badges explicitly with
`npm run coverage:badges` after a successful coverage run. Badges do not include
the dedicated database or S3 integration suites. Query, ORM and PostgreSQL
scheduler unit tests use the real Knex compiler with a simulated driver boundary
to check SQL, bindings, row decoding and failure paths. These do not prove database
locking, concurrent claims, lease recovery or transactional behavior: the real
PostgreSQL suites remain mandatory even when unit coverage reaches 100%.

The package smoke test packs every published workspace, installs the tarballs
and peer dependencies in a disposable consumer, checks every export and TypeScript
declaration, and bundles browser entry points without Node polyfills. It requires
registry access and deletes only its own temporary directory on completion.

CI runs the query and durable scheduler integration suites against disposable
PostgreSQL in UTC and America/Los_Angeles, and the storage suite against Garage.
Locally, provide isolated `QUERY_TEST_DATABASE_URL` and
`SCHEDULER_TEST_DATABASE_URL` values, then run `npm run test:queries:integration`
and `npm run test:scheduler:integration`. `npm run test:storage:integration`
creates and cleans up its own Docker service. Never point tests at production.
The full demo API/browser/telemetry E2E stack and API-reference generation also
run in CI. Both beta and stable publication wait for this reusable validation
workflow. TypeDoc's non-exported internal-type warnings remain visible; they are
not suppressed by the documentation build.

## Monorepo Structure

This project uses **npm workspaces** with **Turborepo** for orchestration. All packages live under `libs/`:

| Package | Description |
| --- | --- |
| `@cleverbrush/schema` | Type-safe schema validation with immutable builders |
| `@cleverbrush/deep` | Deep equality & deep extend utilities |
| `@cleverbrush/async` | Async utilities (Collector, debounce, throttle, retry) |
| `@cleverbrush/mapper` | Schema-driven object mapping |
| `@cleverbrush/react-form` | React form library powered by schema PropertyDescriptors |
| `@cleverbrush/scheduler` | Typed durable jobs, recurring schedules and progress |
| `@cleverbrush/knex-clickhouse` | Knex dialect for ClickHouse |

This table highlights foundational packages. The [root package inventory](README.md#packages)
lists all published packages, including HTTP, persistence, storage and telemetry.

## Development Workflow

### Code Style

[Biome](https://biomejs.dev) handles both formatting and linting:

```bash
# Check for lint/format issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Testing

Tests use [Vitest](https://vitest.dev) and are co-located with source files (`*.test.ts`):

```bash
# Run all tests with typechecking
npm run test

# Run tests for a specific package
npx vitest --run libs/schema
```

### Building

```bash
# Build all packages (respects dependency order via Turbo)
npm run build

# Clean all build artifacts
npm run clean
```

## Adding a Schema Extension

The extension system is the primary way to add new validators. See `libs/schema/src/extensions/` for examples.

1. Create your extension file (e.g. `libs/schema/src/extensions/myExtension.ts`)
2. Define methods with `defineExtension()` and return the new immutable builder
3. Add tests in a co-located `*.test.ts` file
4. Re-export from `libs/schema/src/extensions/index.ts`

See the schema README's extension-system examples for `defineExtension()` and
`withExtensions()`. Do not discard the builder returned by an extension method.

## Adding a New Builder

Builders live in `libs/schema/src/builders/`. Each builder extends the base `SchemaBuilder` class.

1. Create your builder file in `libs/schema/src/builders/`
2. Extend `SchemaBuilder` with appropriate type parameters
3. Add a factory function (e.g. `myType()`) and export it
4. Add comprehensive tests in a co-located `*.test.ts` file
5. Export from `libs/schema/src/index.ts`

## Pull Request Process

1. Create a feature branch from `development` and target `development` in the PR
2. Make your changes with tests
3. **Add a changeset** — every PR that changes package behavior needs one:
   ```bash
   npx changeset
   ```
   Follow the prompts to select affected packages and describe the change.
4. Ensure all checks pass:
   ```bash
   npm run lint
   npm run build
   npm run test
   ```
5. Open a PR against `master`

### Changeset Guidelines

- **patch** — bug fixes, internal refactors with no API change
- **minor** — new features, new extensions, new builders
- **major** — breaking API changes

All packages are versioned together (fixed release group), so a single changeset covers all packages.

## Questions?

Open a [GitHub issue](https://github.com/cleverbrush/framework/issues) — we're happy to help.
