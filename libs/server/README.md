# @cleverbrush/server

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)

A schema-first HTTP server framework for Node.js. Combines [`@cleverbrush/schema`](../schema) for request validation, [`@cleverbrush/di`](../di) for dependency injection, and [`@cleverbrush/auth`](../auth) for authentication — all wired together through a fluent builder API.

## Structured validation paths for forms

Request validation retains its existing 400 Problem Details envelope and
`errors: [{ pointer, detail }]` extension. Nested arrays now expose indexed paths
such as `/body/addresses/0/city` alongside existing aggregate errors. Property
names use JSON Pointer escaping (`~0` for `~`, `~1` for `/`), including query and
header names. These paths describe the request, not a particular UI.

The optional client `decodeValidationIssues(error, { source: 'body' })` adapter
produces serializable form-relative issues; see the
[multi-file consumer example](../react-form/README.md#server-validation-issues).
Application-owned business errors need explicit structured paths to appear beside
fields; the framework never derives a field name from an exception's message.

## Features

- **Fluent endpoint builder** — `endpoint.get('/users').body(schema).query(schema).authorize()` with fully typed handler context.
- **Action results** — `ActionResult.ok()`, `.created()`, `.noContent()`, `.redirect()`, `.file()`, `.stream()`, `.raw()`, `.status()` — no manual `res.write()` / `res.end()` unless you explicitly opt in.
- **Content negotiation** — pluggable `ContentTypeHandler` registry; JSON and `application/x-www-form-urlencoded` registered by default; honours the `Accept` request header.
- **Middleware pipeline** — `server.use(middleware)` for global middleware; per-endpoint middleware via `handle(ep, handler, { middlewares })`.
- **DI integration** — `endpoint.inject({ db: IDbContext })` resolves services per-request from a `@cleverbrush/di` container.
- **Authentication & authorization** — `server.useAuthentication()` / `server.useAuthorization()` wired to `@cleverbrush/auth` schemes and policies.
- **RFC 9457 Problem Details** — validation errors and `HttpError` subclasses are serialized as `application/problem+json`.
- **Type-safe routes** — `route()` builds typed path parameters using `ParseStringSchemaBuilder` segments.
- **OpenAPI-ready** — `getRegistrations()` exposes endpoint metadata for `@cleverbrush/server-openapi`.
- **AsyncAPI-ready** — `getSubscriptionRegistrations()` exposes subscription metadata for `generateAsyncApiSpec()` in `@cleverbrush/server-openapi`.
- **Health check** — optional `/health` endpoint via `server.withHealthcheck()`.
- **WebSocket subscriptions** — `endpoint.subscription('/ws/path')` with typed incoming/outgoing schemas, `tracked()` events, and async generator handlers.
- **Contract composition** — `mergeContracts`, `pickGroups`, and `omitGroups` enable audience-scoped bundles: ship only the endpoints each consumer needs.
- **Modular implementations** — `implement(api)` derives server-configured scopes, keeps separate handler files strongly typed, and checks full contract coverage at final registration.
- **Typed error policies** — `errorMap()` and `withErrors()` translate known handler exceptions without repeated catch blocks or widening endpoint responses.

## Large APIs and shared error handling

`implement` adds server-only configuration and complete handler registration to
an existing shared API contract. It does not replace endpoint builders, change
the wire contract, or require business logic inside one fluent expression.
`errorMap` and `withErrors` also work independently of this registration API.

### A complete multi-file example

The application functions and service registration below are application-owned.
The contract in this example has exactly two operations, so its root is complete.

#### Shared contract

```ts
// contracts.ts — browser-safe; no server configuration or handler imports
import { defineApi, endpoint, route } from '@cleverbrush/server/contract';
import { array, number, object, string } from '@cleverbrush/schema';

export const Item = object({ id: number(), title: string() });
const Message = object({ message: string() });
export const Principal = object({ userId: string() });
const resource = endpoint.resource('/items').authorize(Principal);

export const api = defineApi({
    items: {
        list: resource.get().responses({ 200: array(Item) }),
        remove: resource.delete(
            route({ id: number().coerce() })`/${p => p.id}`
        ).responses({ 204: null, 404: Message })
    }
});
```

#### Server configuration without handlers

```ts
// features/items/scope.ts
import { implement } from '@cleverbrush/server';
import { api } from '../../contracts.js';
import { DbToken } from '../../di/tokens.js';

export const items = implement(api).group('items', {
    inject: { db: DbToken },
    tags: ['items'],
    operations: {
        list: { summary: 'List items', operationId: 'listItems' },
        remove: { summary: 'Remove an item', operationId: 'removeItem' }
    }
});
```

`items.endpoints` contains immutable, server-configured builders. Export the
scope constant and reference it with `typeof`; do not annotate it with a broad
base type that erases operation names or service types.

#### Separate handlers

```ts
// features/items/handlers/list.ts
import type { Handler } from '@cleverbrush/server';
import type { items } from '../scope.js';
import { listItems } from '../../../application/items.js';

export const list: Handler<typeof items.endpoints.list> = (
    { principal }, { db }
) => listItems(db, principal.userId);
```

```ts
// features/items/handlers/remove.ts
import { ActionResult, type Handler } from '@cleverbrush/server';
import type { items } from '../scope.js';
import { removeItem } from '../../../application/items.js';

export const remove: Handler<typeof items.endpoints.remove> = async (
    { params, principal }, { db }
) => {
    await removeItem(db, principal.userId, params.id);
    return ActionResult.noContent();
};
```

The application function can throw a domain exception. Handlers do not need a
repeated catch block. Requests, principals, injected services, and responses are
derived at the handler's declaration site, not inferred retrospectively from a
later registration call. Type-only scope imports avoid runtime import cycles.

#### Application-owned policy and feature registration

```ts
// features/items/errors.ts
import { ActionResult, errorMap } from '@cleverbrush/server';
import { MissingItemError } from '../../application/errors.js';

export const itemErrors = errorMap().on(MissingItemError, () =>
    ActionResult.notFound({ message: 'Item not found' })
);
```

```ts
// features/items/index.ts
import { items } from './scope.js';
import { itemErrors } from './errors.js';
import { list } from './handlers/list.js';
import { remove } from './handlers/remove.js';

export const itemsModule = items.withHandlers({
    list,
    remove: { handler: remove, errors: itemErrors }
});
```

Attaching this policy to `list` is a type error: `list` does not declare 404.
Declaring 204 on `remove` does not permit arbitrary other statuses or bodies.

```ts
// server.ts — after the application's ordinary server/DI setup
import { implement } from '@cleverbrush/server';
import { api } from './contracts.js';
import { itemsModule } from './features/items/index.js';

server.handleAll(implement(api).use(itemsModule).complete());
```

`complete()` fails at compile time if an operation is missing, and checks again
at runtime for JavaScript callers and erased types. The output is the existing
`HandlerMapping`. Authentication, validation, caching, batching, middleware,
serialization, logging, and OpenAPI generation use their existing paths.

### Split large features and compose contract slices

```ts
export const reads = items.pick('list').withHandlers({ list });
export const writes = items.pick('remove').withHandlers({
    remove: { handler: remove, errors: itemErrors }
});
export const feature = implement(api).use(reads, writes);

// Partial roots can be exported and composed; finalize only at the full root.
server.handleAll(implement(api).use(feature).complete());
```

Other groups are separate feature modules added to the same `use(...)` call.
Pass modules directly or in a literal tuple, not an array widened to a generic
module type. Duplicate bindings are rejected across modules and calls. Source
endpoint identity is checked at runtime as well: independently recreated
endpoints are not interchangeable just because their TypeScript shapes match.
`pickGroups`, `omitGroups`, and `mergeContracts` preserve endpoint references,
so intentional contract slices can be implemented and recomposed.

Subscriptions use the same scopes, `SubscriptionHandler<typeof scope.endpoints.x>`,
and existing subscription handler descriptors. They count toward completeness.
HTTP error policies are not accepted on subscription handlers and do not change
the WebSocket error protocol.

### Configuration rules

- `inject` merges contract bindings, then group bindings, then operation bindings.
  A same-name binding is replaced by the later value in both the type and runtime
  service map. Other dependencies remain available. Endpoint `.inject()` itself
  retains its existing replacement behavior.
- An operation's `authorize` schema takes precedence over a group's schema;
  existing endpoint roles are retained. Supplying authorization explicitly makes
  even a previously public operation authenticated. Omit it when authorization
  already lives entirely in the shared contract. There is no implicit auth default.
- Operation `tags` replace group tags; group tags replace existing tags. Other
  metadata changes only when supplied: `summary`, `description`, `operationId`,
  and `deprecated: true`. Deprecation is additive and cannot be cleared here.
- Request/response schemas, cache definitions, upload settings, links, examples,
  and other endpoint metadata remain on the shared endpoint. Scopes do not edit
  the wire contract or silently add error responses.
- Handler descriptors support existing per-operation `middlewares`. Configuration
  scopes do not register anything until explicitly bound and composed.

### Error policy behavior and limits

Policies are immutable. Each `.on(ErrorClass, translator)` returns a new policy.
Rules match by `instanceof` in declaration order; put subclasses before base
classes. Both handlers and translators may be synchronous or asynchronous.

Translators return explicit JSON or bodyless `ActionResult` values. Every result
must fit the target endpoint's `.responses()` status/body map. Policies cannot
use raw/file/stream results to escape that check, and endpoints without explicit
responses cannot attach a policy. TypeScript escape hatches (`any`, assertions,
or deliberately erased annotations) still bypass static guarantees; this is not
a replacement for runtime response validation.

Only exceptions from the handler invocation are translated. Authentication,
request validation, DI resolution, middleware, and response serialization are
outside the wrapper. Unknown thrown values are rethrown unchanged. If a translator
fails, its failure propagates without recursively applying the policy again.
Existing centralized handling still logs unexpected failures and sends safe 500
Problem Details. There is no automatic catch-all or exposure of `Error.message`.

Application authors decide which errors are safe to map and which details can
be returned. Framework has no knowledge of domain ownership or privacy rules.

### Incremental adoption

The old `handle` and `mapHandlers` APIs remain unchanged. Adopt just error policies
without migrating registration:

```ts
import { withErrors } from '@cleverbrush/server';

server.handle(
    RemoveItemEndpoint,
    withErrors(RemoveItemEndpoint, itemErrors, removeHandler)
);
```

The returned function can also be placed in an existing handler map. To migrate
registration, move server-only metadata/DI into scopes, type the existing handler
files against `scope.endpoints`, bind feature modules, and finalize at the root.
Keep the shared contract in `/contract` imports; implementation facilities and
policies are server-entry-point exports only.

The repository tests include strict type assertions against emitted package
declarations and a generated 1,000-operation consumer with one handler per file.
The generated consumer verifies cross-file inference and records compiler
diagnostics, memory, and timings for both existing and modular registration
without using environment-dependent timing thresholds.

## Installation

```bash
npm install @cleverbrush/server @cleverbrush/schema
```

## Quick Start

```ts
import { ServerBuilder, endpoint, ActionResult } from '@cleverbrush/server';
import { object, string, number } from '@cleverbrush/schema';

const CreateUserBody = object({ name: string(), age: number() });

const createUser = endpoint
    .post('/api/users')
    .body(CreateUserBody);

const server = new ServerBuilder();

server.handle(createUser, ({ body }) => {
    // body is fully typed: { name: string; age: number }
    return ActionResult.created({ id: 1, ...body }, '/api/users/1');
});

await server.listen(3000);
```

## Defining Endpoints

### HTTP Methods

Use the `endpoint` singleton to start a builder chain:

```ts
import { endpoint } from '@cleverbrush/server';

const getUser  = endpoint.get('/api/users/:id');
const postUser = endpoint.post('/api/users');
const putUser  = endpoint.put('/api/users/:id');
const delUser  = endpoint.delete('/api/users/:id');
```

### Request Validation

Attach schemas for body, query string, and headers. Validation errors automatically produce a 400 Problem Details response.

```ts
import { object, string, number } from '@cleverbrush/schema';

const ListUsers = endpoint
    .get('/api/users')
    .query(object({ page: number().coerce().optional(), search: string().optional() }));

const CreateUser = endpoint
    .post('/api/users')
    .body(object({ name: string(), email: string() }));
```

### Type-Safe Path Parameters

Use `route()` to define path parameters with the full schema type system:

```ts
import { route } from '@cleverbrush/server';
import { number } from '@cleverbrush/schema';

const GetUser = endpoint.get(
    route({ id: number().coerce() })`/api/users/${t => t.id}`
);

server.handle(GetUser, ({ params }) => {
    params.id; // number (already coerced from the URL)
});
```

When several route schemas validate the same URL, the server selects the most
specific route independently of registration order. Exact static routes win,
followed by routes with more literal path segments and then fewer dynamic
segments. Registration order only breaks ties between equally specific routes.
The same precedence applies to WebSocket subscriptions.

### Authorization

```ts
import { object, string } from '@cleverbrush/schema';

const UserPrincipal = object({ sub: string(), role: string() });

// Any authenticated user
const ProtectedEp = endpoint.get('/api/profile').authorize(UserPrincipal);

// Specific roles
const AdminEp = endpoint.delete('/api/users/:id').authorize(UserPrincipal, 'admin');
```

### OpenAPI Metadata

```ts
const CreateUser = endpoint
    .post('/api/users')
    .body(CreateUserBody)
    .returns(UserSchema)
    .summary('Create a new user')
    .description('Creates a user and returns the full record.')
    .tags('users')
    .operationId('createUser');
```

### Cache Tags

Tag-based cache invalidation. Tags declared on endpoints flow to the
[`cacheTags` middleware](/client/cache-tags) for automatic HTTP caching and
invalidation on mutating requests.

```ts
const ListTodos = endpoint
    .get('/api/todos')
    .query(TodoListQuerySchema)
    .cacheTag('todo-list', p => ({ page: p.query.page, limit: p.query.limit }))
    .returns(array(TodoSchema));

const UpdateTodo = endpoint
    .patch('/api/todos/:id')
    .body(UpdateTodoBody)
    .clearsCacheTag('todo-list')               // clears the collection cache
    .clearsCacheTag('todo', p => ({ id: p.params.id }))  // entity label + external computed key
    .returns(TodoSchema);
```

- **`.cacheTag(name)`** — declares the endpoint's data belongs to a cache
  group. Use on GET endpoints.
- **`.clearsCacheTag(name)`** — declares that this mutation clears matching
  cache entries on success. Use on POST / PUT / PATCH / DELETE.
- **`.cacheTag(name, p => ({ ... }))`** — property-based tag; each selected
  property becomes part of the cache key (different pages → different entries).
- **Immutability** — both methods return a new builder; the original is
  unchanged.

`computeCacheKey` (also exported from the browser-safe `@cleverbrush/server/contract`)
and the client's `computeCacheTagKey` use the same deterministic `ct2:` encoding.
It distinguishes types, normalizes property order and preserves date milliseconds.
`cacheResponse()` invalidates only after successful mutations and prevents older
in-flight reads from refilling any invalidated alias. In-memory invalidation retains
tag-name-prefix coverage; it is not limited to the mutation's selected entity ID.

**Breaking:** computed keys changed, even for property-free tags. Upgrade external
writers/invalidators together and retire old entries. Literal base labels and TTLs
are unchanged. Endpoint response identity and auth/tenant isolation remain the
consumer's responsibility. See the [migration guide](../../docs/cache-form-migration.md#cache-key-migration-breaking).

## Registering and Handling Endpoints

```ts
const server = new ServerBuilder();

server.handle(CreateUser, ({ body, context }) => {
    return ActionResult.created({ id: 42, ...body }, `/api/users/42`);
});

// Per-endpoint middleware
server.handle(AdminEp, ({ params }) => { /* … */ }, {
    middlewares: [loggingMiddleware]
});

await server.listen(3000);
```

## Action Results

| Method | Status | Notes |
|---|---|---|
| `ActionResult.ok(body)` | 200 | Content-negotiated JSON |
| `ActionResult.created(body, location?)` | 201 | Sets `Location` header |
| `ActionResult.noContent()` | 204 | No body |
| `ActionResult.redirect(url, permanent?)` | 302 / 301 | |
| `ActionResult.json(body, status?)` | any | Forces `application/json` |
| `ActionResult.file(buffer, fileName)` | 200 | Attachment download |
| `ActionResult.content(body, contentType)` | 200 | Arbitrary string body |
| `ActionResult.stream(readable, contentType)` | 200 | Pipes a `Readable` |
| `ActionResult.raw(handler)` | custom | Native Node `req` / `res` escape hatch |
| `ActionResult.status(status)` | any | Bare status, no body |

Use `ActionResult.raw()` when integrating a library that already writes to
Node's `http.ServerResponse`:

```ts
server.handle(WebhookEndpoint, () =>
    ActionResult.raw(async (req, res) => {
        await thirdPartyWebhookHandler(req, res);
    })
);
```

## URL-Encoded Bodies

`application/x-www-form-urlencoded` request bodies are parsed by default and
validated against the endpoint body schema. Repeated fields become arrays:

```ts
// tag=work&tag=travel&title=Trip
// → { tag: ['work', 'travel'], title: 'Trip' }
```

## File Upload

Accept file uploads via `multipart/form-data` by chaining `.upload()` on an endpoint:

```ts
import { endpoint } from '@cleverbrush/server';
import { object, string } from '@cleverbrush/schema';

const UploadAvatar = endpoint
    .post('/api/avatar')
    .upload({ maxFileSize: 2 * 1024 * 1024, allowedMimeTypes: ['image/*'] })
    .body(object({ description: string().optional() }))
    .authorize(UserPrincipal);

const handler: Handler<typeof UploadAvatar> = async ({ body, files }) => {
    const avatar = files['avatar'];
    // avatar: FilePart { filename, mimeType, buffer, size }
    return ActionResult.created({ name: avatar.filename });
};
```

The `files` object on the handler context contains one `FilePart` entry per uploaded file field. Non-file form fields are validated against the body schema and available via `body`.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxFileSize` | `number` | 10 MB | Maximum file size per file in bytes |
| `allowedMimeTypes` | `string[]` | all | MIME type allowlist (supports `image/*` glob) |
| `maxFileCount` | `number` | 10 | Maximum number of files per request |

### FilePart type

```ts
interface FilePart {
    readonly filename: string;
    readonly mimeType: string;
    readonly buffer: Buffer;
    readonly size: number;
}
```

## Middleware

```ts
import type { Middleware } from '@cleverbrush/server';

const logger: Middleware = async (ctx, next) => {
    console.log(ctx.method, ctx.url.pathname);
    await next();
};

server.use(logger);
```

## Dependency Injection

```ts
import { ServiceCollection } from '@cleverbrush/di';
import { object, func, string } from '@cleverbrush/schema';

const IUserRepo = object({ findById: func() });

const GetUser = endpoint
    .get('/api/users/:id')
    .inject({ repo: IUserRepo });

server
    .services(svc => svc.addSingleton(IUserRepo, () => new UserRepository()))
    .handle(GetUser, ({ params }, { repo }) => {
        return repo.findById(params.id);
    });
```

## Authentication

```ts
import { jwtScheme } from '@cleverbrush/auth';

server.useAuthentication({
    defaultScheme: 'jwt',
    schemes: [
        jwtScheme({
            secret: process.env.JWT_SECRET!,
            mapClaims: claims => ({ sub: claims.sub as string, role: claims.role as string })
        })
    ]
});

server.useAuthorization();
```

By default, only `defaultScheme` is attempted. Use `trySchemes` when an app
accepts multiple credential types on the same endpoints:

```ts
server.useAuthentication({
    defaultScheme: 'cookie',
    schemes: [cookieScheme(options), jwtScheme(options)],
    trySchemes: ['cookie', 'jwt'] // or 'all'
});
```

## HTTP Errors

Throw any `HttpError` subclass from a handler — it becomes a Problem Details response automatically:

```ts
import { NotFoundError, BadRequestError, ForbiddenError } from '@cleverbrush/server';

server.handle(GetUser, ({ params }) => {
    const user = db.find(params.id);
    if (!user) throw new NotFoundError(`User ${params.id} not found`);
    return user;
});
```

| Class | Status |
|---|---|
| `BadRequestError` | 400 |
| `UnauthorizedError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `HttpError` | any (base class) |

## WebSocket Subscriptions

Define real-time endpoints using `endpoint.subscription()`:

```ts
import { endpoint, tracked } from '@cleverbrush/server';
import { object, string, number } from '@cleverbrush/schema';

// Server-push subscription
const liveUpdates = endpoint
    .subscription('/ws/updates')
    .outgoing(object({ action: string(), id: number() }))
    .summary('Live updates');

// Bidirectional subscription
const chat = endpoint
    .subscription('/ws/chat')
    .incoming(object({ text: string() }))
    .outgoing(object({ user: string(), text: string(), ts: number() }))
    .authorize('user');
```

### Subscription Handlers

Handlers are async generators that yield outgoing events:

```ts
import type { SubscriptionHandler } from '@cleverbrush/server';

const handler: SubscriptionHandler<typeof liveUpdates> = async function* () {
    while (true) {
        await new Promise(r => setTimeout(r, 1000));
        yield { action: 'tick', id: Date.now() };
    }
};

// Bidirectional — read from `incoming` async iterable
const chatHandler: SubscriptionHandler<typeof chat> = async function* ({ incoming, principal }) {
    yield { user: 'system', text: `${principal.name} joined`, ts: Date.now() };
    for await (const msg of incoming) {
        yield { user: principal.name, text: msg.text, ts: Date.now() };
    }
};
```

### Tracked Events

Use `tracked(id, data)` to send events with a unique ID for client-side deduplication:

```ts
yield tracked('evt-123', { action: 'created', id: 42 });
```

### Client Usage

```ts
// Direct subscription
const sub = client.live.updates();
for await (const event of sub) {
    console.log(event); // typed as { action: string, id: number }
}

// Send messages (bidirectional)
const chat = client.live.chat();
chat.send({ text: 'hello' });
```

### React Hook

```tsx
import { useSubscription } from '@cleverbrush/client/react';

function LiveFeed() {
    const { events, state, send, close } = useSubscription(
        () => client.live.updates(),
        { maxEvents: 100 }
    );

    return (
        <div>
            <p>Status: {state}</p>
            {events.map((e, i) => <div key={i}>{e.action} #{e.id}</div>)}
        </div>
    );
}
```

## Request Batching

Enable the server-side batch endpoint so the client can coalesce many concurrent requests into a single HTTP round-trip.

```ts
import { createServer } from '@cleverbrush/server';

const server = await createServer()
    .useBatching()          // enables POST /__batch
    .handleAll(mapping)
    .listen(3000);
```

### How it works

The batch endpoint (`POST /__batch` by default) accepts a JSON body:

```json
{
    "requests": [
        { "method": "GET",  "url": "/api/todos",      "headers": { "authorization": "Bearer ..." } },
        { "method": "POST", "url": "/api/todos",      "headers": { "content-type": "application/json", "authorization": "Bearer ..." }, "body": "{\"title\":\"Buy milk\"}" }
    ]
}
```

Each sub-request is processed through the **full middleware and handler pipeline** (including auth and DI) in parallel by default. The response is:

```json
{
    "responses": [
        { "status": 200, "headers": { "content-type": "application/json" }, "body": "[{\"id\":1}]" },
        { "status": 201, "headers": { "content-type": "application/json" }, "body": "{\"id\":2,\"title\":\"Buy milk\"}" }
    ]
}
```

One sub-request failing returns its error status in its own slot — the rest succeed normally.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `'/__batch'` | URL path for the batch endpoint |
| `maxSize` | `number` | `20` | Maximum sub-requests per batch (400 if exceeded) |
| `parallel` | `boolean` | `true` | Run sub-requests in parallel (`false` for sequential) |

```ts
createServer()
    .useBatching({ path: '/_batch', maxSize: 50, parallel: false })
    .handleAll(mapping)
    .listen(3000);
```

## Contract Composition

When building applications with distinct audiences — a **public client** and an **admin panel**, for example — you want each consumer to import only the endpoints it needs.  This eliminates leaking admin schemas into the client bundle and improves tree-shaking.

The `@cleverbrush/server/contract` entry point ships three utilities for this.

### `mergeContracts`

Combine two `ApiContract` objects into one.  Groups that only exist in one contract are kept as-is; groups that share a key have their endpoint maps shallowly merged.

```ts
import { defineApi, mergeContracts } from '@cleverbrush/server/contract';

// public-api.ts — safe to import in every consumer
export const publicApi = defineApi({
    todos: { list: ..., get: ..., create: ... },
    auth:  { login: ..., register: ... },
});

// admin-api.ts — only imported by the admin application
const adminApi = defineApi({
    admin: { activityLog: ..., banUser: ... },
});

// admin-app/contract.ts
export const fullAdminApi = mergeContracts(publicApi, adminApi);
// TypeScript sees: { todos, auth, admin } — all fully typed

// client-app/contract.ts
import { publicApi } from '../shared/public-api';
// TypeScript sees: { todos, auth } — admin is absent from the bundle
```

### `pickGroups`

Returns a new contract containing only the listed groups.  The TypeScript return type is `Pick<T, K>` — the compiler sees exactly the selected groups.

```ts
import { pickGroups } from '@cleverbrush/server/contract';

const fullApi = defineApi({ todos: {...}, auth: {...}, admin: {...}, debug: {...} });

// Only expose what the frontend needs
const clientApi = pickGroups(fullApi, 'todos', 'auth');
// TypeScript: { todos: ..., auth: ... }
// 'admin' and 'debug' do not exist on the type or at runtime
```

### `omitGroups`

Inverse of `pickGroups` — strips the listed groups and keeps everything else.  Return type is `Omit<T, K>`.

```ts
import { omitGroups } from '@cleverbrush/server/contract';

const publicApi = omitGroups(fullApi, 'admin', 'debug');
// TypeScript: { todos: ..., auth: ... }
```

### Bundle isolation pattern

The key to keeping admin endpoints out of the client bundle is **file-level separation**.  Export different slices from different entry points:

```
packages/
  shared-contracts/
    src/
      public.ts        // export const publicApi = defineApi({ ... })
      admin.ts         // export const adminApi  = defineApi({ ... })
      full.ts          // export const fullApi   = mergeContracts(publicApi, adminApi)

apps/
  client/              // imports publicApi  — admin endpoints never bundled
  admin-panel/         // imports fullApi    — full set of endpoints
  backend/             // imports fullApi    — handles all routes
```

## License

BSD-3-Clause — see [LICENSE](../../LICENSE).
