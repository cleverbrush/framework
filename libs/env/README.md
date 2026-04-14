# @cleverbrush/env

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)

Type-safe environment variable parsing with `@cleverbrush/schema` — validated, coerced, structured configs from `process.env`.

## Why @cleverbrush/env?

**The problem:** Environment variables are untyped strings. Most apps access them via `process.env.SOME_VAR!` — no validation, no coercion, no structure. Missing variables surface as runtime crashes. Secrets accidentally leak into frontend bundles. Config objects are ad-hoc and fragile.

**The solution:** `@cleverbrush/env` uses `@cleverbrush/schema` builders for validation and coercion, and a branded `env()` wrapper for type-safe variable binding. TypeScript enforces at **compile time** that every config leaf is bound to an environment variable. At runtime, all variables are validated at once and coerced to the correct types — with clear error messages for CI and startup logs.

**What makes it different:**

- **Compile-time enforcement** — forgetting `env()` on a config leaf is a TypeScript error, not a runtime surprise
- **Structured configs** — nest objects arbitrarily deep; env vars map to leaf fields
- **Validation & coercion** — full `@cleverbrush/schema` power: `.minLength()`, `.coerce()`, `.default()`, custom validators
- **Array support** — `splitBy(',')` preprocessor for comma-separated values
- **Clear error reporting** — lists all missing and invalid vars at once with paths and types
- **Computed values** — derive values from resolved config via a type-safe callback
- **Flat mode** — `parseEnvFlat()` for simple apps where keys = env var names

| Feature | @cleverbrush/env | t3-env | envalid |
| --- | --- | --- | --- |
| Compile-time leaf enforcement | ✓ | ✗ | ✗ |
| Nested config structures | ✓ | ✗ | ✗ |
| Schema-based validation | ✓ | ✓ | ~ |
| Type coercion (number, boolean, date) | ✓ | Manual | ✓ |
| Array support | ✓ | ✗ | ✗ |
| Computed / derived values | ✓ | ✗ | ✗ |
| All-at-once error reporting | ✓ | ✓ | ✓ |
| No Zod dependency | ✓ | ✗ | ✓ |

## Installation

```bash
npm install @cleverbrush/env
```

**Peer dependency:** `@cleverbrush/schema`

## Quick Start

### Structured config (nested)

```typescript
import { env, parseEnv, splitBy } from '@cleverbrush/env';
import { string, number, boolean, array } from '@cleverbrush/schema';

const config = parseEnv({
  db: {
    host: env('DB_HOST', string().default('localhost')),
    port: env('DB_PORT', number().coerce().default(5432)),
    name: env('DB_NAME', string()),
  },
  jwt: {
    secret: env('JWT_SECRET', string().minLength(32)),
  },
  debug: env('DEBUG', boolean().coerce().default(false)),
  allowedOrigins: env(
    'ALLOWED_ORIGINS',
    array(string()).addPreprocessor(splitBy(','), { mutates: false })
  ),
});

// Type is fully inferred:
// {
//   db: { host: string, port: number, name: string },
//   jwt: { secret: string },
//   debug: boolean,
//   allowedOrigins: string[]
// }
```

### Flat config

For simple apps where each key is both the property name and the env var name:

```typescript
import { parseEnvFlat } from '@cleverbrush/env';
import { string, number } from '@cleverbrush/schema';

const config = parseEnvFlat({
  DB_HOST: string().default('localhost'),
  DB_PORT: number().coerce().default(5432),
  JWT_SECRET: string().minLength(32),
});
// Type: { DB_HOST: string, DB_PORT: number, JWT_SECRET: string }
```

### Type enforcement

Forgetting `env()` is a compile-time error:

```typescript
parseEnv({
  db: {
    host: string(),  // ← TypeScript ERROR: not assignable to EnvConfigNode
  },
});
```

### Array support

Use the `splitBy()` preprocessor helper:

```typescript
// Comma-separated strings
env('ALLOWED_ORIGINS', array(string()).addPreprocessor(splitBy(','), { mutates: false }))
// "a, b, c" → ['a', 'b', 'c']

// Comma-separated numbers
env('PORTS', array(number().coerce()).addPreprocessor(splitBy(','), { mutates: false }))
// "3000, 4000" → [3000, 4000]
```

### Error reporting

When variables are missing or invalid, `EnvValidationError` is thrown with a formatted message:

```
Missing environment variables:
  - DB_NAME (required by db.name) [string]
  - JWT_SECRET (required by jwt.secret) [string]
Invalid environment variables:
  - DB_PORT: "abc" (required by db.port) — number expected
```

The error also exposes structured `.missing` and `.invalid` properties for programmatic access.

### Custom source

By default, `parseEnv()` reads from `process.env`. Pass a custom source for testing or alternative runtimes:

```typescript
const config = parseEnv(schema, {
  DB_HOST: 'test-host',
  DB_PORT: '9999',
});
```

### Computed values

Derive values from the resolved config by passing a compute callback as the second argument. The callback receives the fully typed base config and returns an object that is deep-merged into the result:

```typescript
import { env, parseEnv } from '@cleverbrush/env';
import { string, number } from '@cleverbrush/schema';

const config = parseEnv(
  {
    db: {
      host: env('DB_HOST', string().default('localhost')),
      port: env('DB_PORT', number().coerce().default(5432)),
      name: env('DB_NAME', string()),
    },
  },
  (base) => ({
    db: {
      connectionString: `postgres://${base.db.host}:${base.db.port}/${base.db.name}`,
    },
  })
);

// base is fully typed: { db: { host: string, port: number, name: string } }
// Result type is deep-merged:
// { db: { host: string, port: number, name: string, connectionString: string } }

config.db.connectionString // "postgres://localhost:5432/mydb"
```

When using a compute callback, the optional source is passed as the third argument:

```typescript
const config = parseEnv(
  { host: env('HOST', string()) },
  (base) => ({ url: `http://${base.host}` }),
  { HOST: 'example.com' }  // custom source
);
```

## API Reference

| Export | Type | Description |
| --- | --- | --- |
| `env(varName, schema)` | Function | Binds a schema to an env var name. Required for every leaf in `parseEnv()`. |
| `parseEnv(config, source?)` | Function | Parses env vars into a validated, typed nested config object. |
| `parseEnv(config, compute, source?)` | Function | Parses env vars, then deep-merges computed values from the callback. |
| `parseEnvFlat(schemas, source?)` | Function | Flat convenience — keys are env var names, no `env()` needed. |
| `splitBy(separator)` | Function | Preprocessor that splits a string into an array. |
| `EnvValidationError` | Class | Thrown when env vars are missing or invalid. Has `.missing` and `.invalid`. |
| `EnvField<T>` | Type | Branded wrapper type created by `env()`. |
| `EnvConfig` | Type | Config descriptor tree type (input to `parseEnv`). |
| `InferEnvConfig<T>` | Type | Infers the runtime type from a config descriptor. |

## License

[BSD-3-Clause](../../LICENSE)
