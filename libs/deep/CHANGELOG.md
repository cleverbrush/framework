# @cleverbrush/deep

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

- 6d7e982: Prevent circular object references from overflowing the stack during internal object hashing while preserving acyclic hash results.
- efe2f2f: Preserve original property declarations and JSDoc through derived types so
  editors can navigate to definitions and show property documentation. This covers
  query selectors, rows, projections and write payloads; declared relation includes;
  mapper targets; JSON Schema inferred values; composed API groups and injected
  services; and merged object properties. Runtime behavior is unchanged.

## 4.5.0

### Minor Changes

- f7c65ae: Use one browser-safe, deterministic `ct2:` cache key encoder across server and client helpers, response caches, and external invalidation. Selected properties and plain-object keys are sorted, values retain their types, and dates retain millisecond precision. Unsupported values fail explicitly. **Breaking:** every computed key changes, including property-free tags. Upgrade external cache writers and invalidators together, and flush or expire previous entries; literal base invalidation names and TTL settings remain unchanged. Successful mutations invalidate cached aliases and prevent older in-flight reads from refilling them; failed writes preserve entries.

  Synchronize mounted schema-form fields with form/field setters and reset baselines, using descriptor identities and stable external-store subscriptions. Discard obsolete async validation after value changes or reset. Add `handleSubmit`, reactive `submitting`/`error`, duplicate-submit protection, explicit success/failure results and opt-in error translation. Add `defineFieldRenderer` and `createFormSystem` for typed renderer values, variants, props and composable registries while retaining existing form APIs. See the cache/form migration guide for semantics and examples.

  Add reusable `deepClone` for plain objects, arrays and Dates with cycle/shared-reference preservation, sparse-array lengths, null prototypes and safe enumerable own string/symbol properties. React forms now use `deepClone` and `deepEqual` from `@cleverbrush/deep` for snapshots and dirty checks. **Breaking:** correct existing `deepEqual` semantics for null/type mismatches, equivalent cycles and shared references, signed zero, invalid Dates, symbol keys and sparse arrays. Opaque values such as Files, Maps, Sets and custom instances compare only by identity and remain references when cloned. Unordered arrays preserve duplicate/hole counts without hash-based matching or input mutation. Review consumers relying on the old outcomes; `deepExtend`, `HashObject` and `Transaction` are unchanged.

## 4.4.3

### Patch Changes

- 442c699: Prevent `deepExtend()` from retaining prototype-polluting keys in newly
  created nested branches.

## 4.4.2

## 4.4.1

### Patch Changes

- ef39f76: Prevent `deepExtend()` from merging prototype-polluting keys.

## 4.4.0

## 4.3.2

### Patch Changes

- 1556ad1: Prepare a patch release with website SEO, AI-readiness, accessibility, and
  privacy compliance updates.

## 4.3.1

## 4.3.0

## 4.2.0

## 4.1.0

## 4.0.0

## 3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.

## 3.0.0

## 2.0.0

### Major Changes

- 13ce119: # Release 2.0.0

  ## @cleverbrush/deep

  ### Breaking Changes

  - **Removed default export** — only named exports (`deepEqual`, `deepExtend`, `deepFlatten`, `Merge`) are available. Update `import deep from '@cleverbrush/deep'` to `import { deepEqual, deepExtend, deepFlatten } from '@cleverbrush/deep'`.

  ### Build & Tooling

  - Migrated to `tsup` for bundling with sourcemap generation.
  - Added `exports` field in `package.json`.
  - Migrated tests from Jest to Vitest.

  ***
