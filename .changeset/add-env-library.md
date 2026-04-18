---
'@cleverbrush/env': major
---

# @cleverbrush/env — Type-safe environment variables

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
