# Cleverbrush Framework

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](./LICENSE)
[![Standard Schema v1](https://img.shields.io/badge/Standard%20Schema-v1-blue)](https://standardschema.dev/)
<!-- coverage-badge-start -->
![Coverage](https://img.shields.io/badge/coverage-86.6%25-green)
<!-- coverage-badge-end -->

Cleverbrush is a schema-first TypeScript framework monorepo. It provides the
building blocks for contract-driven web applications: validation, object
mapping, React forms, typed HTTP clients, server endpoint contracts, OpenAPI,
dependency injection, environment parsing, persistence helpers, logging, and
OpenTelemetry.

`@cleverbrush/schema` is the foundation. A single schema definition can drive
runtime validation, TypeScript inference, property descriptors, forms, mappers,
JSON Schema, API contracts, and Standard Schema integrations.

## Packages

| Package | Description |
| --- | --- |
| [`@cleverbrush/schema`](./libs/schema) | Immutable fluent schemas with runtime validation, type inference, property descriptors, extensions, and Standard Schema v1 support. |
| [`@cleverbrush/server`](./libs/server) | Schema-first HTTP endpoint contracts, validation, authorization, dependency injection, and RFC 9457 errors. |
| [`@cleverbrush/client`](./libs/client) | Type-safe HTTP client for `@cleverbrush/server` contracts, with optional batching, retries, dedupe, cache tags, offline queue, and React integration. |
| [`@cleverbrush/server-openapi`](./libs/server-openapi) | OpenAPI 3.x generation from server endpoint metadata. |
| [`@cleverbrush/mapper`](./libs/mapper) | Schema-driven object mapping with compile-time completeness checks and type-safe property selectors. |
| [`@cleverbrush/react-form`](./libs/react-form) | Headless React form primitives powered by schema property descriptors. |
| [`@cleverbrush/schema-json`](./libs/schema-json) | JSON Schema generation and JSON Schema to Cleverbrush schema conversion. |
| [`@cleverbrush/di`](./libs/di) | Small dependency-injection container used by server and application code. |
| [`@cleverbrush/auth`](./libs/auth) | Principal and authorization utility types. |
| [`@cleverbrush/env`](./libs/env) | Environment-variable parsing and validation with schema builders. |
| [`@cleverbrush/orm`](./libs/orm) | Knex-backed ORM layer with typed entity maps and query helpers. |
| [`@cleverbrush/orm-cli`](./libs/orm-cli) | CLI tooling for ORM migrations. |
| [`@cleverbrush/knex-schema`](./libs/knex-schema) | Knex schema helpers that connect database names to schema metadata. |
| [`@cleverbrush/knex-clickhouse`](./libs/knex-clickhouse) | ClickHouse dialect support for Knex. |
| [`@cleverbrush/log`](./libs/log) | Structured logging pipeline, sinks, batching, redaction, and context helpers. |
| [`@cleverbrush/otel`](./libs/otel) | OpenTelemetry setup and instrumentation helpers for apps and clients. |
| [`@cleverbrush/async`](./libs/async) | Async utilities including collector, debounce, throttle, and retry. |
| [`@cleverbrush/deep`](./libs/deep) | Deep equality, deep extension, flattening, and object utilities. |
| [`@cleverbrush/scheduler`](./libs/scheduler) | Cron-like job scheduler with schema-validated job configuration. |

## How The Pieces Fit

```ts
import { object, string, number, type InferType } from '@cleverbrush/schema';
import { endpoint } from '@cleverbrush/server/contract';

const UserSchema = object({
    id: number().int().min(1),
    email: string().email(),
    displayName: string().minLength(2)
});

type User = InferType<typeof UserSchema>;

const GetUserEndpoint = endpoint
    .get('/api/users/:id')
    .params(object({ id: number().int().min(1) }))
    .responses({ 200: UserSchema });
```

That same schema can be reused across the stack:

- Runtime validation through `.validate()` and `.validateAsync()`.
- Type inference through `InferType`.
- API input and response contracts in `@cleverbrush/server`.
- Typed clients through `@cleverbrush/client`.
- OpenAPI documents through `@cleverbrush/server-openapi`.
- Type-safe object mapping through `@cleverbrush/mapper`.
- React form fields through `@cleverbrush/react-form`.
- JSON Schema interop through `@cleverbrush/schema-json`.
- Standard Schema compatible integrations such as TanStack Form and T3 Env.

## Repository Layout

```text
libs/          publishable @cleverbrush/* packages
demos/         demo applications and e2e setup
websites/      docs, schema site, playground, and shared website UI
scripts/       build, release, docs, and website helper scripts
```

The repository uses npm workspaces, Turborepo, TypeScript, Biome, Vitest, and
ES modules.

## Development

Use Node.js 20 or newer. Node.js 22 is recommended.

```bash
npm ci
npm run lint
npm run build
npm run test
```

Useful targeted commands:

```bash
npx vitest --run libs/schema
npm run typecheck:schema-site
npm run typecheck:docs-site
npm run build:schema-site
npm run build:docs-site
```

The demo app can be started with:

```bash
npm run dev:demo
```

This starts the todo backend, frontend, and local database stack used by the
demo workflow.

## Documentation

- Framework docs: https://docs.cleverbrush.com
- Schema docs and playground: https://schema.cleverbrush.com
- Standard Schema: https://standardschema.dev

Each package also has local source, tests, and exports under `libs/`.

## Quality Gates

Every change should leave these commands passing:

```bash
npm run lint
npm run build
npm run test
```

Website changes should also run the relevant site typecheck or build command.
Published package behavior changes require a changeset.

## Release

This repository uses Changesets and fixed-version package releases.

```bash
npm run changeset
npm run version
npm run release
```

For beta releases:

```bash
npm run publish:beta
```

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
