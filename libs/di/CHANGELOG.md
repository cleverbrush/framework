# @cleverbrush/di

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

### Major Changes

- 346bcdd: Add `@cleverbrush/di` — dependency injection container

  A new `.NET-style` dependency injection library that uses `@cleverbrush/schema` instances as service keys (reference equality) and supports three lifetimes: singleton, scoped, and transient.

  ### Key Features

  - **Schema-as-key** — schema instances act as both type descriptors and service identifiers. No separate token classes or string keys needed.
  - **Three lifetimes** — `Singleton` (one per container), `Scoped` (one per scope), `Transient` (new every time).
  - **Function injection** — resolve dependencies described by a `FunctionSchemaBuilder` and call an implementation with the resolved values.
  - **Scope disposal** — `ServiceScope` implements `Symbol.dispose` and `Symbol.asyncDispose` for automatic cleanup with the `using` keyword.
  - **Circular dependency detection** — throws a descriptive error at resolution time when a cycle is detected.
  - **Optional runtime validation** — opt-in per registration to validate resolved values against their schemas.

  ### Basic Usage

  ```ts
  import { ServiceCollection } from "@cleverbrush/di";
  import { object, string, number, func } from "@cleverbrush/schema";

  // Define service contracts as schemas
  const IConfig = object({ port: number(), host: string() });
  const ILogger = object({ info: func().addParameter(string()) });

  // Register
  const services = new ServiceCollection();
  services.addSingleton(IConfig, { port: 3000, host: "localhost" });
  services.addSingleton(ILogger, () => ({ info: console.log }));

  // Build & resolve
  const provider = services.buildServiceProvider();
  const config = provider.get(IConfig); // typed as { port: number; host: string }
  ```

  ### Scoped Services

  ```ts
  const IDbContext = object({ query: func().addParameter(string()) });
  services.addScoped(IDbContext, () => new DbContext());

  const provider = services.buildServiceProvider();

  // Per-request scope
  await using scope = provider.createScope();
  const db = scope.serviceProvider.get(IDbContext);
  // db is disposed when scope exits
  ```

  ### Function Injection

  ```ts
  const handler = func()
    .addParameter(ILogger)
    .addParameter(IConfig)
    .hasReturnType(string());

  const result = provider.invoke(handler, (logger, config) => {
    logger.info(`Port: ${config.port}`);
    return "ok";
  });
  ```

  ### Schema-Driven Factory Registration

  ```ts
  const greeterDeps = func().addParameter(IConfig).addParameter(ILogger);

  services.addSingletonFromSchema(IGreeter, greeterDeps, (config, logger) => ({
    greet() {
      logger.info(`Hello from ${config.host}`);
    },
  }));
  ```

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
