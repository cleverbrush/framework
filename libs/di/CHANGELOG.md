# @cleverbrush/di

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
