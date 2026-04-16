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
