# Plan: Schema-First Server (`@cleverbrush/server`)

## TL;DR

Create a new `@cleverbrush/server` library — a schema-first HTTP/HTTPS server framework where controllers are defined as object schemas (constructor dependencies via `addConstructor()`, methods via `func()` properties with `promise()` return types). Controllers implement `InferType<typeof ControllerSchema>` for full IDE scaffolding. The server introspects schemas to auto-resolve DI, auto-validate request parameters, and auto-generate RFC 9457 error responses. Zero external dependencies — only Node.js `http`/`https`/`url`/`querystring` modules. Built for future OpenAPI generation from the route configuration + schema-json.

---

## Architecture Overview

```
HTTP Request
  → Router.match(method, path) → RouteMatch (path validated + parsed via parseString)
  → Create DI Scope for request
  → Build RequestContext (register as scoped in DI under IRequestContext)
  → Run middleware pipeline (before)
  → Parse request body (Content-Type aware)
  → ParameterResolver: inject parsed path params, extract query/body/headers/context
  → Validate non-path params against func() schema → 400 ProblemDetails on failure
  → ControllerFactory: introspect constructorSchemas → resolve deps from DI scope → new Controller(...)
  → Call controller.method(...validatedArgs)
  → Run middleware pipeline (after)
  → Serialize response (Content-Type negotiation)
  → Send response
  → Dispose DI scope (LIFO cleanup)
```

---

## Key Design Decisions

### 1. Controllers implement `InferType<typeof ControllerSchema>`

TypeScript's `implements` clause checks only instance members (properties and methods), ignoring the `new(...)` construct signatures produced by `addConstructor()`. This means:

```typescript
const UserControllerSchema = object({
  getUser: func()
    .addParameter(number())
    .hasReturnType(promise(UserSchema)),
  createUser: func()
    .addParameter(CreateUserInput)
    .hasReturnType(promise(UserSchema)),
}).addConstructor(func().addParameter(IUserRepo));

// InferType produces:
// { new(p0: InferType<typeof IUserRepo>): Instance } & {
//   getUser: (p0: number) => Promise<User>;
//   createUser: (p0: CreateUserInput) => Promise<User>;
// }
//
// `implements` only checks the instance side → IDE offers "Implement Interface"
// to scaffold all method stubs automatically.

class UserController implements InferType<typeof UserControllerSchema> {
  #repo: InferType<typeof IUserRepo>;
  constructor(repo: InferType<typeof IUserRepo>) { this.#repo = repo; }
  async getUser(id: number) { return this.#repo.findById(id); }
  async createUser(input: InferType<typeof CreateUserInput>) { return this.#repo.create(input); }
}
```

### 2. RequestContext injection without inflating the constructor

The HTTP context should NOT be a constructor dependency — constructors define **business dependencies** only (repos, services, configs). RequestContext is injected through a layered mechanism:

**Layer 1: `context()` parameter source (primary)** — Methods that need request info declare it as a regular func() parameter, and the route config maps it via `context()`:

```typescript
const ControllerSchema = object({
  handleUpload: func()
    .addParameter(CreateUserInput)     // slot 0: body
    .addParameter(IRequestContext)      // slot 1: request context
    .hasReturnType(promise(UserSchema)),
}).addConstructor(func().addParameter(IUserRepo));

// Route config:
routes: {
  handleUpload: { method: 'POST', path: '/', params: [body(), context()] }
}
```

**Layer 2: Scoped DI service (for services deeper in the chain)** — `IRequestContext` is automatically registered as a scoped DI service per request. Any service resolved within the request scope can declare `IRequestContext` as a constructor dependency:

```typescript
const IAuditLogger = object({
  log: func().addParameter(string()).hasReturnType(promise(boolean()))
}).addConstructor(func().addParameter(IRequestContext));

// The audit logger gets the current request's context via DI — no extra wiring needed
```

This keeps controllers lean (constructor = business deps only) while still making the full request context available everywhere through DI.

### 3. Async methods use `promise(ReturnSchema)`

All controller methods that are async use `promise(schema)` to correctly model the return type:

```typescript
func()
  .addParameter(number())
  .hasReturnType(promise(UserSchema))
// InferType → (p0: number) => Promise<{ id: number; name: string; email: string }>
```

The framework will `await` the result regardless, but the schema correctly reflects the async nature for type inference and future OpenAPI generation.

### 4. IRequestContext is an explicit schema definition

`IRequestContext` is defined as an object schema — the canonical DI key and type definition for request context:

```typescript
import { object, string, number, boolean, func, any, record, promise } from '@cleverbrush/schema';

export const IRequestContext = object({
  method: string(),                           // uppercase HTTP method: 'GET', 'POST', ...
  url: string(),                              // full request URL string
  pathParams: record(string(), string()),     // raw path params: { id: "123", slug: "hello" }
  queryParams: record(string(), string()),    // parsed query string params
  headers: record(string(), string()),        // request headers (lowercased keys)
  items: any(),                               // middleware state bag: Map<string, unknown>
  body: func().hasReturnType(promise(any())), // read raw body (buffered, cached)
  json: func().hasReturnType(promise(any())), // parse JSON body (cached)
  responded: boolean(),                       // whether response was already sent
});
```

`RequestContext` (the concrete class) implements this schema and additionally holds the Node.js `IncomingMessage`, `ServerResponse`, and the scoped `IServiceProvider`. Those internal properties are not part of the schema — they are implementation details.

### 5. Route paths via `parseString` schemas

Route paths are defined using `parseString` schemas from `@cleverbrush/schema`. A `parseString` schema combines a URL pattern template with per-segment validation into a single schema that both **matches** and **parses** a URL path:

```typescript
const GetUserPath = parseString(
  object({ id: number() }),
  $t => $t`/${t => t.id}`
);
// Validates: "/42" → { valid: true, object: { id: 42 } }
// Rejects:   "/abc" → { valid: false, errors: [...] }
```

This replaces custom `:param` syntax and dedicated path-extraction helpers. Benefits:
- **Single source of truth** — the pattern, the parameter names, and the validation rules live in one place
- **Type-safe** — the parsed result is fully typed via `InferType`
- **Composable** — uses the same schema validation pipeline as everything else
- **Regex-compiled** — the template compiles to a RegExp at schema creation time for efficient matching

Route paths can be either:
- A `ParseStringSchemaBuilder` — for routes with dynamic segments (primary case)
- A plain `string` — for static routes with no path parameters

The router strips the controller's `basePath` prefix from the incoming URL, then validates the remainder against the route's `parseString` schema. The parsed object is injected into the controller method via the `path()` parameter source (no arguments — the full parsed object is passed).

#### Multi-segment example

```typescript
const GetPostPath = parseString(
  object({ userId: number(), postId: number() }),
  $t => $t`/${t => t.userId}/posts/${t => t.postId}`
);

// Controller config:
{
  basePath: '/api',
  routes: {
    getPost: { method: 'GET', path: GetPostPath, params: [path()] },
  }
}
// URL "/api/5/posts/42" → strip basePath → "/5/posts/42" → parseString → { userId: 5, postId: 42 }
```

#### Nested object paths

`parseString` supports nested object schemas, so deeply structured route params work out of the box:

```typescript
const NestedPath = parseString(
  object({
    order: object({ id: number() }),
    user: object({ name: string() })
  }),
  $t => $t`/orders/${t => t.order.id}/by/${t => t.user.name}`
);
// "/orders/42/by/alice" → { order: { id: 42 }, user: { name: 'alice' } }
```

#### IRequestContext provides raw access

`IRequestContext.pathParams` still provides a raw `Record<string, string>` for middleware that needs untyped access (logging, auth checks, etc.). Controller methods receive the fully typed, validated object via `path()`.

---

## Target Developer Experience

```typescript
import { object, string, number, func, array, promise, parseString, InferType } from '@cleverbrush/schema';
import { createServer, path, query, body, header, context, IRequestContext } from '@cleverbrush/server';

// 1. Define data schemas
const UserSchema = object({
  id: number(),
  name: string().minLength(1).maxLength(100),
  email: string().email(),
});

const CreateUserInput = object({
  name: string().minLength(1).maxLength(100),
  email: string().email(),
});

// 2. Define service interface schemas (for DI)
const IUserRepo = object({
  findById: func().addParameter(number()).hasReturnType(promise(UserSchema.optional())),
  create: func().addParameter(CreateUserInput).hasReturnType(promise(UserSchema)),
  findAll: func().hasReturnType(promise(array().of(UserSchema))),
});

// 3. Define route path schemas (parseString = pattern + parsing + validation in one schema)
const GetUserPath = parseString(
  object({ id: number() }),
  $t => $t`/${t => t.id}`
);

// 4. Define controller schema (methods + constructor deps)
const UserControllerSchema = object({
  getUser: func()
    .addParameter(object({ id: number() }))   // receives parsed path object
    .hasReturnType(promise(UserSchema)),
  createUser: func()
    .addParameter(CreateUserInput)
    .hasReturnType(promise(UserSchema)),
  listUsers: func()
    .hasReturnType(promise(array().of(UserSchema))),
}).addConstructor(
  func().addParameter(IUserRepo)  // DI: resolve IUserRepo
);

// 5. Implement controller — IDE scaffolds all methods via "implement interface"
class UserController implements InferType<typeof UserControllerSchema> {
  #repo: InferType<typeof IUserRepo>;
  constructor(repo: InferType<typeof IUserRepo>) {
    this.#repo = repo;
  }
  async getUser({ id }: InferType<typeof GetUserPath>) {
    const user = await this.#repo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }
  async createUser(input: InferType<typeof CreateUserInput>) {
    return this.#repo.create(input);
  }
  async listUsers() {
    return this.#repo.findAll();
  }
}

// 6. Multi-path-param example using parseString
const GetPostPath = parseString(
  object({ userId: number(), postId: number() }),
  $t => $t`/${t => t.userId}/posts/${t => t.postId}`
);

const PostSchema = object({
  id: number(),
  userId: number(),
  title: string(),
  body: string(),
});

const PostControllerSchema = object({
  getPost: func()
    .addParameter(object({ userId: number(), postId: number() }))
    .hasReturnType(promise(PostSchema)),
}).addConstructor(func().addParameter(IUserRepo));

class PostController implements InferType<typeof PostControllerSchema> {
  #repo: InferType<typeof IUserRepo>;
  constructor(repo: InferType<typeof IUserRepo>) { this.#repo = repo; }
  async getPost({ userId, postId }: InferType<typeof GetPostPath>) {
    // fully typed + validated by parseString before the method is called
    return this.#repo.findPostByIds(userId, postId);
  }
}

// 7. Configure and start
const server = createServer()
  .services(svc => {
    svc.addSingleton(IUserRepo, () => new InMemoryUserRepo());
  })
  .controller(UserControllerSchema, UserController, {
    basePath: '/api/users',
    routes: {
      getUser:    { method: 'GET',  path: GetUserPath, params: [path()] },
      createUser: { method: 'POST', path: '/',         params: [body()] },
      listUsers:  { method: 'GET',  path: '/' },
    }
  })
  .controller(PostControllerSchema, PostController, {
    basePath: '/api/users',
    routes: {
      getPost: { method: 'GET', path: GetPostPath, params: [path()] },
    }
  })
  .use(loggingMiddleware)   // global middleware
  .listen(3000);
```

---

## Implementation Steps

### Phase 1: Foundation (steps 1–4, all parallel)

**Step 1. Scaffold the library** — Create `libs/server/` with standard monorepo structure:
- `package.json` (name: `@cleverbrush/server`, deps: `@cleverbrush/schema`, `@cleverbrush/di`)
- `tsup.config.ts` (ESM, es2022, minify, sourcemap)
- `tsconfig.build.json`
- `src/index.ts` (public exports)
- Add project reference in root `tsconfig.build.json`
- Add to Vitest project list in `vite.config.mts`

**Step 2. Core types** (`src/types.ts`) — Define all interfaces and types:
- `ParameterSource`: `{ from: 'path' | 'query' | 'body' | 'header' | 'context'; name?: string }`
- `RouteDefinition`: `{ method, path (string | ParseStringSchemaBuilder), handler (property name string), parameterSources }`
- `ControllerRegistration`: `{ schema, implementation (class), basePath?, routes, middlewares? }`
- `RouteMatch`: `{ route, parsedPath (object from parseString or null), controllerRegistration }`
- `ContentTypeHandler`: `{ mimeType, serialize, deserialize }`
- `Middleware`: `(context: RequestContext, next: () => Promise<void>) => Promise<void>`
- `ServerOptions`: `{ port?, host?, https? { key, cert } }`
- Helper factories: `path()`, `query(name)`, `body()`, `header(name)`, `context()` — return ParameterSource objects. `path()` takes no arguments — it injects the parsed path object from the route's `parseString` schema

**Step 3. RFC 9457 ProblemDetails** (`src/ProblemDetails.ts` + `src/ProblemDetails.test.ts`):
- `ProblemDetails` interface: `{ type, status, title, detail?, instance?, [extensions] }`
- `createProblemDetails(status, title, detail?, extensions?)` factory
- `createValidationProblemDetails(errors[])` — creates 400 problem with `errors` extension array containing `{ pointer, detail }`
- Standard HTTP status → title mappings (400, 401, 403, 404, 405, 409, 415, 422, 500, 503)
- `serializeProblemDetails(pd)` → JSON string with Content-Type `application/problem+json`
- **Tests**: correct structure, all status codes, extension members, validation error format

**Step 4. HttpError & HttpResponse** (`src/HttpError.ts`, `src/HttpResponse.ts`):
- `HttpError extends Error`: `{ status, title, detail?, extensions? }` — maps to ProblemDetails
- Subclasses: `NotFoundError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`
- `HttpResponse`: wraps custom responses with `{ body, status, headers?, contentType? }`
- Static factories: `HttpResponse.ok(body)`, `.created(body, location?)`, `.noContent()`, `.redirect(url, permanent?)`
- **Tests**: error hierarchy, HttpResponse factories

### Phase 2: Request Processing (steps 5–7, all parallel)

**Step 5. Router** (`src/Router.ts` + `src/Router.test.ts`):
- Routes grouped by HTTP method; matching iterates registered routes in order (first match wins)
- `addRoute(method, basePath, routePath, metadata)` — registers route; `routePath` is either a `string` (static) or a `ParseStringSchemaBuilder` (dynamic)
- `match(method, url)` → `{ metadata, parsedPath } | null`
- For `ParseStringSchemaBuilder` paths: strip `basePath` prefix from URL, call `schema.validate(remainder)` — the schema's compiled regex handles matching; segment schemas handle parsing/validation
- For string paths: exact match after stripping `basePath`
- Method matching: exact match, auto 405 (matched path, wrong method)
- Path normalization: strip trailing slashes, decode URI components
- **Tests**: static routes, dynamic params via parseString, multiple params, overlapping paths, method matching, 405 detection, URL decoding, nested object paths, edge cases

**Step 6. ContentNegotiator** (`src/ContentNegotiator.ts` + test):
- `register(handler: ContentTypeHandler)` — add custom handler
- `selectResponseHandler(acceptHeader)` — parse Accept header, quality values, pick best match
- `selectRequestHandler(contentTypeHeader)` — match exact Content-Type for deserialization
- Built-in `JsonContentTypeHandler`: `application/json`, uses `JSON.stringify`/`JSON.parse`
- Handle missing Accept (default to JSON), `*/*` wildcard
- **Tests**: Accept header parsing, quality values, fallback to JSON, unknown types → 415

**Step 7. ParameterResolver** (`src/ParameterResolver.ts` + test):
- `resolve(funcSchema, sources, routeMatch)` → `{ valid: true, args[] } | { valid: false, problemDetails }`
- **Parameter source types**:
  - `path`: inject the already-parsed path object from the route match (`routeMatch.parsedPath`) — no additional validation needed, the `parseString` schema already validated during routing
  - `query`: extract from URL query string, auto-coerce to number/boolean if target schema requires it
  - `body`: extract from parsed request body (already deserialized via Content-Type handler)
  - `header`: extract from request headers
  - `context`: inject the RequestContext instance directly (no validation needed)
- **Validation**: call `schema.validate(coercedValue, { doNotStopOnFirstError: true })` per parameter (skip for `context` and `path` sources — path is pre-validated by parseString)
- **Error aggregation**: collect all validation errors across all params, create single RFC 9457 `ProblemDetails`
- **Tests**: extraction per source type, path object injection, query coercion, context injection, validation failures, optional params, mixed sources

### Phase 3: Controller & Middleware (depends on Phase 2)

**Step 8. RequestContext** (`src/RequestContext.ts` + test):
- `RequestContext` class:
  - `request`: Node.js `IncomingMessage`
  - `response`: Node.js `ServerResponse`
  - `url`: parsed `URL`
  - `method`: uppercase HTTP method string
  - `pathParams`: `Record<string, string>` — raw, uncoerced path segments
  - `queryParams`: `Record<string, string>` (from URL.searchParams)
  - `headers`: reference to `request.headers`
  - `services`: `IServiceProvider` (scoped — allows resolving any scoped/singleton service)
  - `items`: `Map<string, unknown>` — middleware state bag (like ASP.NET's HttpContext.Items)
  - `body()`: `Promise<Buffer>` — buffered request body, read-once, cached
  - `json()`: `Promise<unknown>` — parsed JSON body, cached
  - `responded`: boolean — tracks if response already sent
- `IRequestContext` — exported object schema matching the RequestContext shape, used as DI key and func() parameter type (see Decision §4)
- **Tests**: body buffering + caching, JSON parsing, query param extraction, items map

**Step 9. ControllerFactory** (`src/ControllerFactory.ts` + test):
- `createController(schema, implClass, serviceProvider)` → controller instance
- Introspects `schema.introspect().constructorSchemas[0].introspect().parameters` to get dependency schemas
- Resolves each dependency from `serviceProvider.get(paramSchema)` (within request scope)
- Instantiates `new implClass(...resolvedArgs)`
- If no constructorSchemas → instantiate with no args
- Validates controller method exists + is a function for each route handler name
- **Tests**: no-dep controller, single-dep, multi-dep, missing dependency error, method validation

**Step 10. MiddlewarePipeline** (`src/MiddlewarePipeline.ts` + test):
- `MiddlewarePipeline`: builds a chain of `Middleware` functions
- `add(middleware)` → appends to pipeline
- `execute(context, finalHandler)` → runs chain, calls `finalHandler` at end
- Short-circuit: if middleware doesn't call `next()`, pipeline stops
- Error handling: if any middleware throws, catch and create ProblemDetails
- Supports global, per-controller, and per-route middleware (composed at registration time)
- **Tests**: execution order, short-circuit, error propagation, empty pipeline, async middleware

### Phase 4: Integration (depends on all above)

**Step 11. Server** (`src/Server.ts` + `src/Server.test.ts`):
- `createServer(options?)` → `ServerBuilder` (fluent API)
- `ServerBuilder`:
  - `.services(configureFn: (svc: ServiceCollection) => void)` — configure DI container
  - `.controller(schema, implClass, config)` — register controller with route config
  - `.use(middleware)` — global middleware
  - `.contentType(handler: ContentTypeHandler)` — register custom content type handler
  - `.listen(port, host?)` → `Promise<Server>`
  - `.close()` → `Promise<void>` — graceful shutdown
- On `.listen()`:
  1. Build `ServiceProvider` from `ServiceCollection`
  2. Register all routes in `Router` (compose basePath + route path)
  3. Create Node.js HTTP request handler
- Per-request flow:
  1. Create DI scope
  2. Build `RequestContext`, register as scoped under `IRequestContext`
  3. Match route → 404/405 ProblemDetails if no match
  4. Build middleware pipeline (global + controller + route)
  5. Execute pipeline with final handler:
     a. Parse body (Content-Type → ContentNegotiator)
     b. Resolve params via ParameterResolver
     c. If invalid → 400 ProblemDetails
     d. Create controller via ControllerFactory
     e. `await controller[methodName](...args)`
     f. Handle return: `HttpResponse` → custom, `null` → 204, other → 200 JSON
  6. `HttpError` → ProblemDetails, unhandled → 500 ProblemDetails
  7. Dispose DI scope

- **Integration tests**:
  - Full request/response cycle (200 JSON)
  - Path/body validation → 400 ProblemDetails with errors array
  - `parseString` path parsing + validation (single param, multi-param, nested objects)
  - Missing route → 404, wrong method → 405 with Allow header
  - Controller DI resolution + scoped isolation
  - `context()` parameter source injects RequestContext
  - Middleware execution order
  - HttpResponse custom status/headers
  - HttpError → ProblemDetails
  - Multiple controllers
  - Graceful shutdown

### Phase 5: Polish & Export

**Step 12. Public API** (`src/index.ts`):
- `createServer`, `Server`, `ServerBuilder`
- `RequestContext`, `IRequestContext`
- `HttpError`, `NotFoundError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`
- `HttpResponse`
- `ProblemDetails`, `createProblemDetails`, `createValidationProblemDetails`
- `ContentTypeHandler`, `Middleware`
- Helper factories: `path`, `query`, `body`, `header`, `context`
- All core types

**Step 13. README.md**

---

## Relevant Files

### Files to CREATE (all under `libs/server/`)
- `package.json`, `tsup.config.ts`, `tsconfig.build.json`
- `src/index.ts`, `src/types.ts`
- `src/ProblemDetails.ts` + test
- `src/HttpError.ts` + test, `src/HttpResponse.ts` + test
- `src/Router.ts` + test
- `src/ContentNegotiator.ts` + test
- `src/ParameterResolver.ts` + test
- `src/RequestContext.ts` + test
- `src/ControllerFactory.ts` + test
- `src/MiddlewarePipeline.ts` + test
- `src/Server.ts` + test
- `README.md`

### Files to MODIFY
- Root `tsconfig.build.json` — add project reference `{ "path": "./libs/server" }`
- Root `vite.config.mts` — add `libs/server` to Vitest projects array

### Reference patterns
- `libs/di/package.json`, `libs/di/tsup.config.ts` — monorepo templates
- `libs/di/src/ServiceProvider.ts` — `invoke()`: func schema param resolution
- `libs/di/src/ServiceCollection.ts` — `#addFromSchema()`: constructor introspection
- `libs/schema/src/builders/ObjectSchemaBuilder.ts` — `introspect().constructorSchemas`
- `libs/schema/src/builders/FunctionSchemaBuilder.ts` — `introspect().parameters`
- `libs/schema/src/builders/ParseStringSchemaBuilder.ts` — `parseString()` factory, regex-compiled URL pattern matching + validation
- `libs/schema/src/builders/PromiseSchemaBuilder.ts` — `promise(resolvedTypeSchema)` factory
- `libs/schema-json/src/Core.ts` — `toJsonSchema()` for future OpenAPI

---

## Verification

1. `vitest --run --typecheck` — all server library tests pass
2. `tsc --noEmit` — monorepo type-checks
3. `turbo run build` → `libs/server/dist/index.js` + `index.d.ts`
4. `biome check ./libs/server` — lint passes
5. Integration tests verify: 200/400/404/405/500 responses, DI scope isolation, middleware order, `context()` injection, `parseString` path parsing + validation, content types, graceful shutdown

---

## Decisions

- **Package name**: `@cleverbrush/server` (directory: `libs/server/`)
- **Controller type safety**: `implements InferType<typeof Schema>` — IDE scaffolds all method stubs via "Implement Interface"
- **Controller lifecycle**: Scoped per-request via DI scope
- **RequestContext**: NOT a constructor dep. Injected via `context()` method param source or resolved as scoped DI service
- **IRequestContext**: Explicitly defined object schema with `method`, `url`, `pathParams`, `queryParams`, `headers`, `items`, `body`, `json`, `responded` — serves as both DI key and type definition
- **Async return types**: `promise(schema)` on all async methods
- **Path parameters**: Route paths defined via `parseString` schemas from `@cleverbrush/schema` — combines URL pattern matching with type-safe parsing and per-segment validation in a single schema. `path()` parameter source (no arguments) injects the parsed path object. Plain strings supported for static routes. `IRequestContext.pathParams` provides raw `Record<string, string>` for middleware
- **Parameter coercion**: query strings auto-coerced to number/boolean; body parsed via Content-Type; path params coerced + validated by `parseString` segment schemas
- **Middleware**: `(context, next) => Promise<void>` — global + per-controller + per-route
- **Libraries HTTP-agnostic**: No changes to schema/di/mapper
- **Future OpenAPI**: architecture supports it via schema-json, deferred to v2
- **Scope**: HTTP/HTTPS only, no WebSocket/HTTP2/static files in v1
