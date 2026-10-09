# @cleverbrush/knex-clickhouse

## 5.0.0

### Major Changes

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

- Updated dependencies [6d7e982]
- Updated dependencies [d916566]
- Updated dependencies [efe2f2f]
- Updated dependencies [c5b4dbc]
  - @cleverbrush/deep@5.0.0
  - @cleverbrush/async@5.0.0

## 4.5.0

### Patch Changes

- Updated dependencies [f7c65ae]
  - @cleverbrush/deep@4.5.0
  - @cleverbrush/async@4.5.0

## 4.4.3

### Patch Changes

- Updated dependencies [442c699]
  - @cleverbrush/deep@4.4.3
  - @cleverbrush/async@4.4.3

## 4.4.2

### Patch Changes

- @cleverbrush/deep@4.4.2
- @cleverbrush/async@4.4.2

## 4.4.1

### Patch Changes

- Updated dependencies [ef39f76]
  - @cleverbrush/deep@4.4.1
  - @cleverbrush/async@4.4.1

## 4.4.0

### Patch Changes

- @cleverbrush/deep@4.4.0
- @cleverbrush/async@4.4.0

## 4.3.2

### Patch Changes

- 1556ad1: Prepare a patch release with website SEO, AI-readiness, accessibility, and
  privacy compliance updates.
- Updated dependencies [1556ad1]
  - @cleverbrush/deep@4.3.2
  - @cleverbrush/async@4.3.2

## 4.3.1

### Patch Changes

- @cleverbrush/deep@4.3.1
- @cleverbrush/async@4.3.1

## 4.3.0

### Patch Changes

- @cleverbrush/deep@4.3.0
- @cleverbrush/async@4.3.0

## 4.2.0

### Patch Changes

- @cleverbrush/deep@4.2.0
- @cleverbrush/async@4.2.0

## 4.1.0

### Patch Changes

- @cleverbrush/deep@4.1.0
- @cleverbrush/async@4.1.0

## 4.0.0

### Patch Changes

- @cleverbrush/deep@4.0.0
- @cleverbrush/async@4.0.0

## 3.1.0

### Patch Changes

- @cleverbrush/deep@3.1.0
- @cleverbrush/async@3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/async@3.0.1
  - @cleverbrush/deep@3.0.1

## 3.0.0

### Patch Changes

- Updated dependencies [4ee352a]
  - @cleverbrush/async@3.0.0
  - @cleverbrush/deep@3.0.0

## 2.0.0

### Major Changes

- 13ce119: # Release 2.0.0

  ## @cleverbrush/knex-clickhouse

  ### Breaking Changes

  - **Removed `preQueryCallback` parameter** from `getClickhouseConnection()` — the third parameter for pre-query callbacks is no longer supported. If you relied on this to wake idle servers before queries, implement that logic externally.
  - **Removed `ClickHouseClient` re-export** — import `ClickHouseClient` directly from `@clickhouse/client` instead.

  ### Changes

  - Updated `@clickhouse/client` dependency from `^1.7.0` to `^1.18.2`.
  - Cleaned up internal type casts (`as any` removals).
  - Changed `null` return to `undefined` for absent retry options.

  ### Build & Tooling

  - Migrated to `tsup` for bundling with sourcemap generation.
  - Added `exports` field in `package.json`.

  ***
