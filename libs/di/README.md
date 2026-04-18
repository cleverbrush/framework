# @cleverbrush/di

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)

A .NET-style dependency injection container for TypeScript. Uses [`@cleverbrush/schema`](../schema) instances as service keys for fully-typed, zero-generic registration and resolution. Supports three service lifetimes, schema-driven function injection, and automatic disposal of scoped services.

## Features

- **Schema-as-key** — schema instances (from `@cleverbrush/schema`) serve as service identifiers via reference equality. No string tokens, no `Symbol`, no decorators.
- **Three lifetimes** — `Singleton`, `Scoped`, and `Transient`, matching .NET semantics.
- **Function injection** — resolve dependencies automatically via `FunctionSchemaBuilder` parameter lists with `invoke()` / `addSingletonFromSchema()`.
- **Scope validation** — resolving a scoped service from the root provider throws by default, catching common lifecycle bugs early.
- **Automatic disposal** — `ServiceScope` disposes scoped services in reverse creation order (LIFO) on scope exit, supporting both `Symbol.dispose` and `Symbol.asyncDispose`.
- **`using` keyword support** — `ServiceScope` implements `Disposable` and `AsyncDisposable`.
- **No decorators, no `reflect-metadata`** — works in any TypeScript project without `experimentalDecorators`.
- **Zero runtime dependencies** (other than `@cleverbrush/schema`).

## Installation

```bash
npm install @cleverbrush/di @cleverbrush/schema
```

## Quick Start

```ts
import { ServiceCollection } from '@cleverbrush/di';
import { object, string, number, func } from '@cleverbrush/schema';

// 1. Define service contracts as schemas (used as keys)
const IConfig = object({ port: number(), host: string() });
const ILogger = object({ info: func().addParameter(string()) });

// 2. Register services
const services = new ServiceCollection();
services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
services.addSingleton(ILogger, () => ({ info: (msg) => console.log(msg) }));

// 3. Build the provider
const provider = services.buildServiceProvider();

// 4. Resolve — fully typed, no explicit generics needed
const config = provider.get(IConfig);
config.port; // number
```

## Service Lifetimes

| Lifetime | Created | Use for |
|---|---|---|
| `Singleton` | Once per `ServiceProvider` | Loggers, configuration, connection pools |
| `Scoped` | Once per `ServiceScope` | Database contexts, HTTP request state |
| `Transient` | On every `get()` call | Lightweight, stateless services |

```ts
const IDbContext = object({ query: func() });
const IRequestId = object({ id: string() });

services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
services.addScoped(IDbContext, (provider) => {
    const config = provider.get(IConfig);
    return new DbContext(config.host);
});
services.addTransient(IRequestId, () => ({ id: crypto.randomUUID() }));
```

## Registering Services

### Plain value (singleton only)

```ts
services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
```

### Factory function

The factory receives the `ServiceProvider` so it can resolve other services:

```ts
services.addSingleton(ILogger, (provider) => {
    const config = provider.get(IConfig);
    return new ConsoleLogger(config.logLevel);
});
```

### Pre-created instance (`addSingletonInstance`)

Use when the service is a function type — `addSingleton` would invoke a function value as a factory, but `addSingletonInstance` always treats its argument as the value:

```ts
const IHandler = func();
const myHandler = (req: Request) => new Response('ok');

services.addSingletonInstance(IHandler, myHandler);
```

### Function-schema-driven registration

Declare dependencies via a `FunctionSchemaBuilder` and let the container resolve them automatically:

```ts
const IGreeter = object({ greet: func() });

const greeterDeps = func()
    .addParameter(IConfig)
    .addParameter(ILogger);

services.addSingletonFromSchema(
    IGreeter,
    greeterDeps,
    (config, logger) => ({
        greet() { logger.info(`Hello from ${config.host}`); }
    })
);
// Also available: addScopedFromSchema, addTransientFromSchema
```

### Runtime validation

Pass `{ validate: true }` to any registration method to validate the resolved value against its schema at resolution time. Useful in development and testing:

```ts
services.addSingleton(IConfig, loadConfig(), { validate: true });
```

## Resolving Services

```ts
const provider = services.buildServiceProvider();

// Throws if not registered
const config = provider.get(IConfig);

// Returns undefined if not registered (no throw)
const mailer = provider.getOptional(IMailer);
```

## Scopes

Create a scope for work that has a bounded lifetime (e.g. an HTTP request). Scoped services are cached within the scope and disposed when the scope exits.

```ts
// Automatic disposal with `using`
using scope = provider.createScope();
const db = scope.serviceProvider.get(IDbContext);
// db is disposed when the block exits

// Async disposal
await using scope = provider.createScope();
const db = scope.serviceProvider.get(IDbContext);
// db.[Symbol.asyncDispose]() is called when the block exits

// Manual disposal
const scope = provider.createScope();
try {
    const db = scope.serviceProvider.get(IDbContext);
    // use db...
} finally {
    await scope.asyncDispose();
}
```

Services registered with a class that implements `Symbol.dispose` or `Symbol.asyncDispose` are tracked and disposed automatically when the scope ends.

## Function Injection with `invoke`

Resolve dependencies described by a `FunctionSchemaBuilder` and call a function with them directly, without registering anything:

```ts
const handlerDeps = func()
    .addParameter(ILogger)
    .addParameter(IDbContext);

const result = scope.serviceProvider.invoke(handlerDeps, (logger, db) => {
    logger.info('Handling request');
    return db.query('SELECT 1');
});
```

## Scope Validation

By default, resolving a `Scoped` service from the root provider throws an error, preventing accidental singleton captures:

```ts
// Throws: "Cannot resolve scoped service from the root provider."
provider.get(IDbContext);

// Disable if intentional (not recommended for production)
const provider = services.buildServiceProvider({ validateScopes: false });
```

## Circular Dependency Detection

The container detects circular dependencies at resolution time and throws a descriptive error showing the dependency chain.

## API Summary

### `ServiceCollection`

| Method | Description |
|---|---|
| `addSingleton(schema, factoryOrValue, options?)` | Register a singleton service |
| `addScoped(schema, factory, options?)` | Register a scoped service |
| `addTransient(schema, factory, options?)` | Register a transient service |
| `addSingletonInstance(schema, instance, options?)` | Register a pre-created singleton (safe for function values) |
| `addSingletonFromSchema(target, funcSchema, impl, options?)` | Register a singleton with schema-driven dependencies |
| `addScopedFromSchema(target, funcSchema, impl, options?)` | Register a scoped service with schema-driven dependencies |
| `addTransientFromSchema(target, funcSchema, impl, options?)` | Register a transient service with schema-driven dependencies |
| `buildServiceProvider(options?)` | Build the immutable `ServiceProvider` |

### `ServiceProvider`

| Method | Description |
|---|---|
| `get(schema)` | Resolve a service; throws if not registered |
| `getOptional(schema)` | Resolve a service; returns `undefined` if not registered |
| `createScope()` | Create a new `ServiceScope` |
| `invoke(funcSchema, implementation)` | Call a function with its dependencies resolved automatically |

### `ServiceScope`

| Member | Description |
|---|---|
| `serviceProvider` | The scoped `IServiceProvider` for this scope |
| `[Symbol.dispose]()` | Synchronously dispose scoped services (LIFO) |
| `[Symbol.asyncDispose]()` | Asynchronously dispose scoped services (LIFO) |
| `asyncDispose()` | Explicit async dispose (same as `Symbol.asyncDispose`) |

## License

[BSD 3-Clause](../../LICENSE)
