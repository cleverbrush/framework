# @cleverbrush/web

Typed HTTP client for `@cleverbrush/server` API contracts — zero codegen, full type safety.

## Overview

`@cleverbrush/web` provides a Proxy-based HTTP client that infers all endpoint types (params, body, query, headers, responses) from an API contract defined with `defineApi()` from `@cleverbrush/server/contract`. No code generation or manual type annotations are needed.

## Quick Start

### 1. Define a contract (shared package)

```ts
// packages/shared/src/contract.ts
import { defineApi, endpoint, route } from '@cleverbrush/server/contract';
import { array, number, object, string } from '@cleverbrush/schema';

const TodoSchema = object({ id: number(), title: string(), completed: boolean() });
const todosResource = endpoint.resource('/api/todos');
const ById = route({ id: number().coerce() })`/${t => t.id}`;

export const api = defineApi({
    todos: {
        list: todosResource.get()
            .query(object({ page: number().optional(), limit: number().optional() }))
            .responses({ 200: array(TodoSchema) }),
        get: todosResource.get(ById)
            .responses({ 200: TodoSchema }),
        create: todosResource.post()
            .body(object({ title: string() }))
            .responses({ 201: TodoSchema }),
        delete: todosResource.delete(ById)
            .responses({ 204: null }),
    },
    auth: {
        login: endpoint.post('/api/auth/login')
            .body(object({ email: string(), password: string() }))
            .responses({ 200: object({ token: string() }) }),
    },
});
```

### 2. Create a typed client (frontend)

```ts
// src/api/client.ts
import { createClient } from '@cleverbrush/web';
import { api } from 'shared/contract';

export const client = createClient(api, {
    baseUrl: 'https://api.example.com',
    getToken: () => localStorage.getItem('token'),
    onUnauthorized: () => { window.location.href = '/login'; },
});
```

### 3. Use it — fully typed

```ts
// All types are inferred from the contract
const todos = await client.todos.list({ query: { page: 1, limit: 10 } });
//    ^? TodoResponse[]

const todo = await client.todos.get({ params: { id: 1 } });
//    ^? TodoResponse

const created = await client.todos.create({ body: { title: 'Buy milk' } });
//    ^? TodoResponse

await client.todos.delete({ params: { id: 1 } });
//    ^? undefined (204 No Content)

const { token } = await client.auth.login({
    body: { email: 'user@example.com', password: 'secret' }
});
```

## API

### `createClient(contract, options?)`

Creates a typed HTTP client from an API contract.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `contract` | `ApiContract` | Contract created with `defineApi()` |
| `options.baseUrl` | `string` | Base URL prepended to every request (default: `''`) |
| `options.getToken` | `() => string \| null` | Returns auth token for `Authorization: Bearer` header |
| `options.onUnauthorized` | `() => void` | Called on 401 responses |
| `options.fetch` | `typeof fetch` | Custom fetch implementation (default: `globalThis.fetch`) |
| `options.headers` | `Record<string, string>` | Extra headers sent with every request |
| `options.middlewares` | `Middleware[]` | Middleware functions that wrap the fetch call |
| `options.hooks` | `ClientHooks` | Lifecycle hooks invoked at various stages of a request |

## Middleware

Middlewares wrap the `fetch` call, allowing you to intercept, modify, or short-circuit requests and responses. They compose like an onion — the first middleware in the array is the outermost wrapper.

```ts
import { createClient } from '@cleverbrush/web';
import { retry } from '@cleverbrush/web/retry';
import { timeout } from '@cleverbrush/web/timeout';
import { dedupe } from '@cleverbrush/web/dedupe';
import { throttlingCache } from '@cleverbrush/web/cache';

const client = createClient(api, {
    baseUrl: 'https://api.example.com',
    middlewares: [
        retry({ limit: 3 }),
        timeout({ timeout: 10000 }),
        dedupe(),
        throttlingCache({ throttle: 2000 }),
    ],
});
```

### Writing custom middleware

```ts
import type { Middleware } from '@cleverbrush/web';

const logger: Middleware = (next) => async (url, init) => {
    console.log('→', init.method, url);
    const res = await next(url, init);
    console.log('←', res.status);
    return res;
};
```

## Lifecycle Hooks

Hooks are invoked at various stages of a request. All hook arrays execute serially in order.

```ts
const client = createClient(api, {
    hooks: {
        beforeRequest: [(req) => {
            req.init.headers = {
                ...req.init.headers as Record<string, string>,
                'X-Request-Id': crypto.randomUUID(),
            };
        }],
        afterResponse: [(req, res) => {
            console.log(`${req.init.method} ${req.url} → ${res.status}`);
        }],
        beforeError: [(error) => {
            console.error('Request failed:', error.message);
            return error;
        }],
    },
});
```

| Hook | Signature | Description |
|------|-----------|-------------|
| `beforeRequest` | `(req: { url, init }) => void` | Modify request before sending |
| `afterResponse` | `(req, response) => void \| Response` | Inspect/replace response |
| `beforeRetry` | `(info: { url, init, error, retryCount }) => void` | Called between retry attempts |
| `beforeError` | `(error: WebError) => WebError` | Transform errors before throwing |

## Resilience Middlewares

### Retry — `@cleverbrush/web/retry`

```ts
import { retry } from '@cleverbrush/web/retry';

retry({
    limit: 2,           // max retries (default: 2)
    methods: ['GET'],   // retryable methods (default: GET, PUT, HEAD, DELETE, OPTIONS)
    statusCodes: [500], // retryable status codes (default: 408, 429, 500, 502, 503, 504)
    backoffLimit: 5000, // max delay in ms (default: Infinity)
    delay: (n) => n * 1000,  // custom delay function
    jitter: true,       // add randomization to delays
    retryOnTimeout: false,   // retry on TimeoutError (default: false)
    shouldRetry: (err, count) => count < 3,  // custom predicate
});
```

Respects `Retry-After` headers (seconds and HTTP-date formats) on 429/503 responses.

### Timeout — `@cleverbrush/web/timeout`

```ts
import { timeout } from '@cleverbrush/web/timeout';

timeout({ timeout: 10000 }); // 10 second timeout (default)
```

Aborts requests that exceed the configured duration, throwing a `TimeoutError`.

### Dedupe — `@cleverbrush/web/dedupe`

```ts
import { dedupe } from '@cleverbrush/web/dedupe';

dedupe({
    skip: (url, init) => init.method !== 'GET', // skip non-GET (default)
    key: (url, init) => `${init.method}@${url}`, // dedup key (default)
});
```

Prevents duplicate in-flight requests. Concurrent calls with the same key share a single fetch; each caller receives a cloned response.

### Cache — `@cleverbrush/web/cache`

```ts
import { throttlingCache } from '@cleverbrush/web/cache';

throttlingCache({
    throttle: 1000,     // TTL in ms (default: 1000)
    skip: (url, init) => init.method !== 'GET', // skip non-GET (default)
    condition: (res) => res.ok, // only cache successful responses (default)
    invalidate: (url, init) => {
        if (init.method !== 'GET') return `GET@${url}`;
        return null;
    },
});
```

Caches successful GET responses for a configurable TTL. Subsequent requests within the TTL receive a cloned cached response without hitting the network.

## Per-Call Overrides

Override middleware options for individual calls:

```ts
// Override timeout for a slow endpoint
const report = await client.reports.generate({
    body: { type: 'annual' },
    timeout: 60000,
});

// Override retry limit
const data = await client.data.fetch({
    query: { id: 1 },
    retry: { limit: 5 },
});
```

## Error Types

All errors extend a common `WebError` base class.

```ts
import {
    ApiError, TimeoutError, NetworkError,
    isApiError, isTimeoutError, isNetworkError, isWebError
} from '@cleverbrush/web';
```

| Error | Description | Properties |
|-------|-------------|------------|
| `WebError` | Base class for all web client errors | `message` |
| `ApiError` | Non-2xx HTTP response | `status`, `message`, `body` |
| `TimeoutError` | Request exceeded timeout | `timeout` (ms) |
| `NetworkError` | Network-level failure | `cause` |

### Type guards

```ts
try {
    await client.todos.get({ params: { id: 999 } });
} catch (err) {
    if (isApiError(err)) {
        console.log(err.status, err.body);
    } else if (isTimeoutError(err)) {
        console.log('Timed out after', err.timeout, 'ms');
    } else if (isNetworkError(err)) {
        console.log('Network failure:', err.cause);
    }
}
```

### `ApiError`

Error thrown on non-2xx responses.

```ts
import { ApiError } from '@cleverbrush/web';

try {
    await client.todos.get({ params: { id: 999 } });
} catch (err) {
    if (err instanceof ApiError) {
        console.log(err.status);  // 404
        console.log(err.body);    // { message: 'Not found' }
    }
}
```

### Type Utilities

| Type | Description |
|------|-------------|
| `EndpointCallArgs<E>` | Request argument shape for an endpoint |
| `EndpointResponse<E>` | Success response type for an endpoint |
| `TypedClient<T>` | Full client type mirroring the contract |
| `ClientOptions` | Configuration for `createClient()` |

## How It Works

1. **Compile time**: TypeScript infers the full type of each endpoint from the `defineApi()` contract. `TypedClient<T>` maps each group/endpoint to a typed async function.

2. **Runtime**: `createClient()` returns a two-level `Proxy`. When you call `client.todos.list(args)`, the proxy:
   - Calls `.introspect()` on the endpoint builder to get HTTP method, base path, and path template
   - Serializes path parameters via `ParseStringSchemaBuilder.serialize()`
   - Serializes query parameters to a URL query string
   - JSON-encodes the body for POST/PUT/PATCH requests
   - Sends the request via `fetch` with auth headers

## License

BSD 3-Clause
