# @cleverbrush/mapper

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

### Minor Changes

- a90a491: Add opt-in immutable, detached PostgreSQL reads with projection-aware runtime
  schemas, precise decimal/bigint decoding, nested relation graphs and explicit
  STI/CTI branch schemas. Reuse result schemas directly in separately defined
  application mappings without duplicating projection schemas.
  
  Add `getSyncMapper()` with synchronous eligibility inferred through the existing
  `configure()` API, completeness checks, nested mapping propagation and runtime
  thenable guards. Existing queries and asynchronous mapping behavior are unchanged.
  
  Add application-agnostic typed metadata extension methods that retain metadata
  through immutable chains. Use these in database extensions without modifying
  global schema prototypes.
  
  Preserve typed function-schema compatibility in dependency injection when a
  function declares its return schema.

### Patch Changes

- efe2f2f: Preserve original property declarations and JSDoc through derived types so
  editors can navigate to definitions and show property documentation. This covers
  query selectors, rows, projections and write payloads; declared relation includes;
  mapper targets; JSON Schema inferred values; composed API groups and injected
  services; and merged object properties. Runtime behavior is unchanged.
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

  ## @cleverbrush/mapper

  ### New Package

  A type-safe, declarative object mapper for converting objects between different `@cleverbrush/schema` representations.

  - **Compile-time completeness** — TypeScript produces an error if any target property is not mapped, auto-mapped, or explicitly ignored.
  - **Type-safe selectors** — `.for((t) => t.name).from((s) => s.name)` — fully type-checked, not string-based.
  - **Auto-mapping** — properties with the same name and compatible type are mapped automatically.
  - **Custom transforms** — `.compute((source) => ...)` for arbitrary source-to-target property conversions.
  - **`.ignore()`** — explicitly mark target properties as intentionally unmapped.
  - **Nested schema support** — map deeply nested object and array properties.
  - **Immutable registry** — `configure()` returns a new registry; safe to share and extend.
  - **`mapper()` factory function** — convenient entry point to create and configure mapping registries.
  - **Validation of target schema** — the mapper validates that properties referenced in the target schema actually exist.
  - **Depends on** `@cleverbrush/schema@^2.0.0`.

  ***
