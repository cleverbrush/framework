# @cleverbrush/client

Typed HTTP client for `@cleverbrush/server` API contracts — zero codegen, full type safety. Optional React + TanStack Query integration via `@cleverbrush/client/react`.

## Overview

`@cleverbrush/client` provides a Proxy-based HTTP client that infers all endpoint types (params, body, query, headers, responses) from an API contract defined with `defineApi()` from `@cleverbrush/server/contract`. No code generation or manual type annotations are needed.

The optional `/react` subpath adds TanStack Query hooks to the same client, so every endpoint is both a callable function and a hook provider.

## Quick Start

### 1. Define a contract (shared package)

```ts
// packages/shared/src/contract.ts
import { defineApi, endpoint, route } from '@cleverbrush/server/contract';
import { array, number, object, string, boolean } from '@cleverbrush/schema';

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

### 2. Create a typed client

```ts
// Framework-agnostic (works in any JS runtime)
import { createClient } from '@cleverbrush/client';
import { api } from 'shared/contract';

export const client = createClient(api, {
    baseUrl: 'https://api.example.com',
    getToken: () => localStorage.getItem('token'),
    onUnauthorized: () => { window.location.href = '/login'; },
});
```

Or with React + TanStack Query hooks:

```ts
// React — adds useQuery, useMutation, etc. to every endpoint
import { createClient } from '@cleverbrush/client/react';
import { api } from 'shared/contract';

export const client = createClient(api, {
    baseUrl: 'https://api.example.com',
    getToken: () => localStorage.getItem('token'),
});
```

### 3. Use it — fully typed

```ts
// Direct fetch (both clients)
const todos = await client.todos.list({ query: { page: 1, limit: 10 } });
//    ^? TodoResponse[]

const todo = await client.todos.get({ params: { id: 1 } });
//    ^? TodoResponse

const created = await client.todos.create({ body: { title: 'Buy milk' } });
//    ^? TodoResponse

await client.todos.delete({ params: { id: 1 } });
//    ^? undefined (204 No Content)
```

```tsx
// React hooks (react client only)
function TodoList() {
    const { data, isLoading } = client.todos.list.useQuery();

    if (isLoading) return <p>Loading…</p>;
    return <ul>{data?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
}
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
import { createClient } from '@cleverbrush/client';
import { retry } from '@cleverbrush/client/retry';
import { timeout } from '@cleverbrush/client/timeout';
import { dedupe } from '@cleverbrush/client/dedupe';
import { throttlingCache } from '@cleverbrush/client/cache';

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
import type { Middleware } from '@cleverbrush/client';

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

### Retry — `@cleverbrush/client/retry`

```ts
import { retry } from '@cleverbrush/client/retry';

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

### Timeout — `@cleverbrush/client/timeout`

```ts
import { timeout } from '@cleverbrush/client/timeout';

timeout({ timeout: 10000 }); // 10 second timeout (default)
```

Aborts requests that exceed the configured duration, throwing a `TimeoutError`.

### Dedupe — `@cleverbrush/client/dedupe`

```ts
import { dedupe } from '@cleverbrush/client/dedupe';

dedupe({
    skip: (url, init) => init.method !== 'GET', // skip non-GET (default)
    key: (url, init) => `${init.method}@${url}`, // dedup key (default)
});
```

Prevents duplicate in-flight requests. Concurrent calls with the same key share a single fetch; each caller receives a cloned response.

### Cache — `@cleverbrush/client/cache`

```ts
import { throttlingCache } from '@cleverbrush/client/cache';

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
} from '@cleverbrush/client';
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

## React Integration (`@cleverbrush/client/react`)

The `/react` subpath provides a `createClient()` that wraps the core client with TanStack Query hooks. Every endpoint becomes callable **and** provides hooks.

**Peer dependencies:** `react >=18`, `@tanstack/react-query ^5`

### Unified Client

```ts
import { createClient } from '@cleverbrush/client/react';

const client = createClient(api, { baseUrl: '/api' });

// Each endpoint provides:
client.todos.list(args?)             // Direct fetch → Promise<T>
client.todos.list.stream(args?)      // NDJSON streaming → AsyncIterable<string>
client.todos.list.useQuery(args?, options?)        // TanStack useQuery
client.todos.list.useSuspenseQuery(args?, options?) // TanStack useSuspenseQuery
client.todos.list.useInfiniteQuery(argsFn, options) // TanStack useInfiniteQuery
client.todos.list.useMutation(options?)             // TanStack useMutation
client.todos.list.queryKey(args?)    // Query key array
client.todos.list.prefetch(qc, args?) // Prefetch into cache

// Group-level query key for bulk invalidation:
client.todos.queryKey()  // → ['@cleverbrush', 'todos']
```

### Query Key Structure

Keys follow a hierarchical structure for predictable invalidation:

```ts
client.todos.queryKey()
// → ['@cleverbrush', 'todos']

client.todos.list.queryKey()
// → ['@cleverbrush', 'todos', 'list']

client.todos.get.queryKey({ params: { id: 42 } })
// → ['@cleverbrush', 'todos', 'get', { params: { id: 42 } }]
```

### Key Utilities

For manual key construction outside of the proxy:

```ts
import { buildQueryKey, buildGroupQueryKey, QUERY_KEY_PREFIX } from '@cleverbrush/client/react';

buildGroupQueryKey('todos');           // ['@cleverbrush', 'todos']
buildQueryKey('todos', 'list');        // ['@cleverbrush', 'todos', 'list']
buildQueryKey('todos', 'get', args);   // ['@cleverbrush', 'todos', 'get', args]
```

### Queries with Parameters

```tsx
function TodoDetail({ id }: { id: number }) {
    const { data } = client.todos.get.useQuery({ params: { id } });
    return <h2>{data?.title}</h2>;
}
```

### Mutations with Cache Invalidation

```tsx
import { useQueryClient } from '@tanstack/react-query';

function CreateTodo() {
    const queryClient = useQueryClient();
    const mutation = client.todos.create.useMutation({
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: client.todos.queryKey() });
        },
    });

    return (
        <button onClick={() => mutation.mutate({ body: { title: 'New todo' } })}>
            Add Todo
        </button>
    );
}
```

### Suspense

```tsx
import { Suspense } from 'react';

function TodoListSuspense() {
    const { data } = client.todos.list.useSuspenseQuery();
    return <ul>{data.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
}

function App() {
    return (
        <Suspense fallback={<p>Loading…</p>}>
            <TodoListSuspense />
        </Suspense>
    );
}
```

### Prefetching

```tsx
const queryClient = useQueryClient();

<button
    onMouseEnter={() => client.todos.get.prefetch(queryClient, { params: { id: 1 } })}
>
    View Todo
</button>
```

### Conditional Queries

```tsx
function UserTodos({ userId }: { userId: number | null }) {
    const { data } = client.todos.list.useQuery({
        query: { userId: userId! },
        enabled: userId !== null,
    });
    // ...
}
```

### Infinite Queries

```tsx
function InfiniteTodos() {
    const { data, fetchNextPage, hasNextPage } = client.todos.list.useInfiniteQuery(
        (pageParam) => ({ query: { page: pageParam, limit: 10 } }),
        {
            initialPageParam: 1,
            getNextPageParam: (lastPage, allPages) => allPages.length + 1,
        }
    );
    // ...
}
```

### Error Handling in Hooks

```tsx
import { isApiError, isTimeoutError } from '@cleverbrush/client';

const { error } = client.todos.list.useQuery();

if (isApiError(error)) {
    console.log(error.status, error.body);
} else if (isTimeoutError(error)) {
    console.log('Timed out after', error.timeout, 'ms');
}
```

## Type Utilities

| Type | Description |
|------|-------------|
| `EndpointCall` | Callable endpoint function type |
| `EndpointCallArgs<E>` | Request argument shape for an endpoint |
| `EndpointResponse<E>` | Success response type for an endpoint |
| `TypedClient<T>` | Full client type mirroring the contract |
| `ClientOptions` | Configuration for `createClient()` |
| `Middleware` | Middleware function type |
| `PerCallOverrides` | Per-call override options (retry, timeout, etc.) |
| `UnifiedClient<T>` | React client type with hooks on every endpoint |

## How It Works

1. **Compile time**: TypeScript infers the full type of each endpoint from the `defineApi()` contract. `TypedClient<T>` maps each group/endpoint to a typed async function.

2. **Runtime**: `createClient()` returns a two-level `Proxy`. When you call `client.todos.list(args)`, the proxy:
   - Calls `.introspect()` on the endpoint builder to get HTTP method, base path, and path template
   - Serializes path parameters via `ParseStringSchemaBuilder.serialize()`
   - Serializes query parameters to a URL query string
   - JSON-encodes the body for POST/PUT/PATCH requests
   - Sends the request via `fetch` with auth headers

3. **React layer** (optional): The `/react` `createClient()` wraps the core client in an additional proxy layer that attaches TanStack Query hook factories to each endpoint function.

## Subpath Exports

| Import | Description |
|--------|-------------|
| `@cleverbrush/client` | Core client, errors, middleware utilities, types |
| `@cleverbrush/client/retry` | Retry middleware with exponential backoff |
| `@cleverbrush/client/timeout` | AbortController-based timeout middleware |
| `@cleverbrush/client/dedupe` | Request deduplication middleware |
| `@cleverbrush/client/cache` | Throttling cache middleware |
| `@cleverbrush/client/react` | TanStack Query hooks + unified client |

## License

BSD 3-Clause
