# @cleverbrush/env

## 4.4.3

### Patch Changes

- Updated dependencies [442c699]
  - @cleverbrush/deep@4.4.3

## 4.4.2

### Patch Changes

- @cleverbrush/deep@4.4.2

## 4.4.1

### Patch Changes

- Updated dependencies [ef39f76]
  - @cleverbrush/deep@4.4.1

## 4.4.0

### Minor Changes

- c75bff4: Add framework affordances discovered while reviewing Xpenser:

  - `@cleverbrush/env`: add `envBoolean()` for environment-style boolean values
    such as `1`, `0`, `yes`, `no`, `on`, and `off`.
  - `@cleverbrush/server`: parse `application/x-www-form-urlencoded` request
    bodies by default, add `ActionResult.raw()`, and allow ordered
    authentication fallback with `trySchemes`.
  - `@cleverbrush/client`: add `externalCacheTags()` to
    `@cleverbrush/client/cache` for framework-agnostic external cache tag
    invalidation, including Next.js `revalidateTag()` as one supported callback.
  - `@cleverbrush/knex-schema` / `@cleverbrush/orm`: add
    `InferDatabaseRow` / `InferDatabaseValue` row typing helpers and support raw
    update expressions plus conditional `where` callbacks in
    `onConflict().merge()`.
  - `@cleverbrush/orm-cli`: add read-only `cb-orm validate` for live schema drift
    checks.

  Docs and package READMEs were updated; see https://docs.cleverbrush.com.

### Patch Changes

- @cleverbrush/deep@4.4.0

## 4.3.2

### Patch Changes

- 1556ad1: Prepare a patch release with website SEO, AI-readiness, accessibility, and
  privacy compliance updates.
- Updated dependencies [1556ad1]
  - @cleverbrush/deep@4.3.2

## 4.3.1

### Patch Changes

- @cleverbrush/deep@4.3.1

## 4.3.0

### Patch Changes

- @cleverbrush/deep@4.3.0

## 4.2.0

### Patch Changes

- @cleverbrush/deep@4.2.0

## 4.1.0

### Patch Changes

- @cleverbrush/deep@4.1.0

## 4.0.0

### Patch Changes

- Updated dependencies [3bfc1e1]
- Updated dependencies [cbdfa69]
  - @cleverbrush/schema@4.0.0
  - @cleverbrush/deep@4.0.0

## 3.1.0

### Patch Changes

- @cleverbrush/deep@3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/deep@3.0.1
  - @cleverbrush/schema@3.0.1

## 3.0.0

### Major Changes

- 1af999e: # @cleverbrush/env — Type-safe environment variables

  New library for parsing `process.env` into validated, typed, optionally nested config objects using `@cleverbrush/schema`.

  ### Key features

  - **`env(varName, schema)`** — branded wrapper that binds a schema builder to an env var name
  - **`parseEnv(config, source?)`** — walks a nested config descriptor tree, reads env vars, validates and coerces via schema
  - **`parseEnvFlat(schemas, source?)`** — flat convenience mode where keys = env var names
  - **`splitBy(separator)`** — preprocessor helper for parsing comma-separated (or other delimited) env vars into arrays
  - **Computed values** — optional second argument to `parseEnv()` receives the fully typed base config and returns derived values, deep-merged into the result via `@cleverbrush/deep`
  - **Compile-time enforcement** — TypeScript errors if any config leaf is not wrapped with `env()`
  - **`EnvValidationError`** — lists all missing and invalid variables at once with config paths and types
  - **Full `@cleverbrush/schema` power** — `.coerce()`, `.default()`, `.minLength()`, custom validators all work

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
  - @cleverbrush/deep@3.0.0
