# @cleverbrush/server

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)

A schema-first HTTP server framework for Node.js. Combines [`@cleverbrush/schema`](../schema) for request validation, [`@cleverbrush/di`](../di) for dependency injection, and [`@cleverbrush/auth`](../auth) for authentication — all wired together through a fluent builder API.

## Features

- **Fluent endpoint builder** — `endpoint.get('/users').body(schema).query(schema).authorize()` with fully typed handler context.
- **Action results** — `ActionResult.ok()`, `.created()`, `.noContent()`, `.redirect()`, `.file()`, `.stream()`, `.status()` — no manual `res.write()` / `res.end()`.
- **Content negotiation** — pluggable `ContentTypeHandler` registry; JSON registered by default; honours the `Accept` request header.
- **Middleware pipeline** — `server.use(middleware)` for global middleware; per-endpoint middleware via `handle(ep, handler, { middlewares })`.
- **DI integration** — `endpoint.inject({ db: IDbContext })` resolves services per-request from a `@cleverbrush/di` container.
- **Authentication & authorization** — `server.useAuthentication()` / `server.useAuthorization()` wired to `@cleverbrush/auth` schemes and policies.
- **RFC 9457 Problem Details** — validation errors and `HttpError` subclasses are serialized as `application/problem+json`.
- **Type-safe routes** — `route()` builds typed path parameters using `ParseStringSchemaBuilder` segments.
- **OpenAPI-ready** — `getRegistrations()` exposes endpoint metadata for `@cleverbrush/server-openapi`.
- **AsyncAPI-ready** — `getSubscriptionRegistrations()` exposes subscription metadata for `generateAsyncApiSpec()` in `@cleverbrush/server-openapi`.
- **Health check** — optional `/health` endpoint via `server.withHealthcheck()`.
- **WebSocket subscriptions** — `endpoint.subscription('/ws/path')` with typed incoming/outgoing schemas, `tracked()` events, and async generator handlers.

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
| `ActionResult.status(status)` | any | Bare status, no body |

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

## License

BSD-3-Clause — see [LICENSE](../../LICENSE).
