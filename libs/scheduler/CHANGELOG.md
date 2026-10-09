# @cleverbrush/scheduler

## 5.0.0

### Major Changes

- 30f83aa: Redesign the scheduler for versioned immediate, delayed and recurring jobs,
  typed separate handlers, durable ordered progress and fenced worker leases.
  Add an independently installed PostgreSQL adapter using Framework ORM and
  knex-schema, explicit migrations, transactional enqueue and restart recovery.
  
  Retries are opt-in and rerun whole handlers. Calendar triggers use explicit UTC
  or IANA zones with persisted cursors and missed/overlap policies. See the
  scheduler v4.x-to-v5 migration guide for the breaking API and rollout steps.
  The adapter joins the fixed Framework release group.
  
  Retain schema-driven minute/day/week/month/year definitions and their
  discriminated Schedule type, exposing individual schemas and the Schemas facade.
  Normalize recurrence defaults, dates and weekday order before fingerprinting;
  unchanged registrations retain their cursor and start anchor. Preserve the
  one-based calculator index and accept the deprecated maxOccurences spelling
  while rejecting ambiguous dual spelling. Name the explicit persistence option
  storageRepository. Derive PostgreSQL row and entity types from schema definitions
  without parallel hand-written row types.
  
  Use native Date/Intl calendar calculations without an additional date-time
  runtime dependency. Preserve DST-gap skipping and earlier-fold selection,
  including non-hour transitions and skipped calendar dates, independently of
  the host time zone. Bound minute schedules to the representable Date range.
- d916566: Make Framework query builders immutable and infer row schemas automatically.
  
  Retain returned query builders, return synchronous builders from scopes and grouped predicates, and supply an explicit Framework object output schema for opaque raw SELECTs. Ordinary, aliased, polymorphic and ORM queries expose their row schemas directly. Projections replace scalar selections, and projected/aggregate/raw queries cannot perform entity writes. Reads and write-returning rows consistently preserve exact decimal/bigint strings, Date objects and SQL nulls.
  
  All published Framework packages advance together to the next major version. Tracked entity objects remain mutable.
  
  ### Migrating from v4.x to v5
  
  Remove `withRowSchema()` calls and retain each configured query instead of relying on mutation. Replace raw base-query overloads with explicit output contracts. See `libs/knex-schema/MIGRATION-v5.md` for the complete migration guide.
- c5b4dbc: Require Node.js 24+ consistently across all published packages. Correct the root and all published-package license files to BSD-3-Clause, matching package metadata and documentation, and verify license consistency in source and npm tarballs. See docs/MIGRATION-v5.md for migration guidance.
  
  Harden JWT key/algorithm and claim validation, cookie parsing/serialization, and request-body lifecycle handling. Require explicit authorization scope for bounded server idempotency; coalesce concurrent retries and capture full response bodies. Bound response caching and bypass private, no-store and cookie-setting responses.
  
  Preserve DI scope validation through factories and propagate registered optional-service failures. Fix batch response status/header capture, timeout abort-listener cleanup, concurrent deduplication response cloning, CLI database cleanup on validation/production-guard failures, and the missing client idempotency JavaScript export. Update security-sensitive dependencies and ensure OpenTelemetry disable flags override SDK defaults.
  
  Add regression tests, package-consumer smoke checks, package-level unit coverage floors, migration/security documentation and release validation gates.

### Patch Changes

- Updated dependencies [d916566]
- Updated dependencies [a90a491]
- Updated dependencies [f9b1f56]
- Updated dependencies [c5b4dbc]
- Updated dependencies [47133eb]
  - @cleverbrush/schema@5.0.0

## 4.5.0

### Patch Changes

- @cleverbrush/schema@4.5.0

## 4.4.3

### Patch Changes

- @cleverbrush/schema@4.4.3

## 4.4.2

### Patch Changes

- @cleverbrush/schema@4.4.2

## 4.4.1

### Patch Changes

- @cleverbrush/schema@4.4.1

## 4.4.0

### Patch Changes

- @cleverbrush/schema@4.4.0

## 4.3.2

### Patch Changes

- 1556ad1: Prepare a patch release with website SEO, AI-readiness, accessibility, and
  privacy compliance updates.
- Updated dependencies [1556ad1]
  - @cleverbrush/schema@4.3.2

## 4.3.1

### Patch Changes

- @cleverbrush/schema@4.3.1

## 4.3.0

### Patch Changes

- @cleverbrush/schema@4.3.0

## 4.2.0

### Patch Changes

- @cleverbrush/schema@4.2.0

## 4.1.0

### Patch Changes

- Updated dependencies [9e9bb4c]
- Updated dependencies [733b6f4]
  - @cleverbrush/schema@4.1.0

## 4.0.0

### Patch Changes

- Updated dependencies [3bfc1e1]
- Updated dependencies [cbdfa69]
  - @cleverbrush/schema@4.0.0

## 3.1.0

### Patch Changes

- @cleverbrush/schema@3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/schema@3.0.1

## 3.0.0

### Patch Changes

- Updated dependencies [60efc99]
- Updated dependencies [2f06dc4]
- Updated dependencies [f0f93ba]
- Updated dependencies [0df3d59]
- Updated dependencies [0cc7cbe]
- Updated dependencies [181f89e]
- Updated dependencies [8979127]
- Updated dependencies [b8f1285]
- Updated dependencies [3473d7e]
- Updated dependencies [308c9ea]
- Updated dependencies [26a7d85]
  - @cleverbrush/schema@3.0.0

## 2.0.0

### Major Changes

- 13ce119: # Release 2.0.0

  ## @cleverbrush/scheduler

  ### Build & Tooling

  - Migrated to `tsup` for bundling with sourcemap generation.
  - Added `exports` field in `package.json`.
  - Migrated tests from Jest to Vitest.
  - Updated `@cleverbrush/schema` dependency to `^2.0.0`.
  - Added `@types/node@^25.4.0` as dev dependency.

  ***
