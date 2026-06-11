# Contributing to @cleverbrush/framework

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- **Node.js** 20 or later (22 recommended — see `.nvmrc`)
- **npm** (ships with Node)

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

## Monorepo Structure

This project uses **npm workspaces** with **Turborepo** for orchestration. All packages live under `libs/`:

| Package | Description |
| --- | --- |
| `@cleverbrush/schema` | Type-safe schema validation with immutable builders |
| `@cleverbrush/deep` | Deep equality & deep extend utilities |
| `@cleverbrush/async` | Async utilities (Collector, debounce, throttle, retry) |
| `@cleverbrush/mapper` | Schema-driven object mapping |
| `@cleverbrush/react-form` | React form library powered by schema PropertyDescriptors |
| `@cleverbrush/scheduler` | Cron-like job scheduler with schema-validated config |
| `@cleverbrush/knex-clickhouse` | Knex dialect for ClickHouse |

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
2. Export extension functions that call the builder's `.extend()` method
3. Add tests in a co-located `*.test.ts` file
4. Re-export from `libs/schema/src/extensions/index.ts`

Look at `libs/schema/src/extensions/string.ts` for a complete example of how extensions add validators like `email()`, `url()`, `uuid()`, etc.

## Adding a New Builder

Builders live in `libs/schema/src/builders/`. Each builder extends the base `SchemaBuilder` class.

1. Create your builder file in `libs/schema/src/builders/`
2. Extend `SchemaBuilder` with appropriate type parameters
3. Add a factory function (e.g. `myType()`) and export it
4. Add comprehensive tests in a co-located `*.test.ts` file
5. Export from `libs/schema/src/index.ts`

## Pull Request Process

1. **Fork** the repo and create a feature branch from `master`
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
