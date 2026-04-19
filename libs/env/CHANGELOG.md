# @cleverbrush/env

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
