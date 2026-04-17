# @cleverbrush/react-query

Unified typed client for `@cleverbrush/web` API contracts — direct fetch **and** TanStack Query hooks on the same object. Zero codegen, full type safety.

## Overview

`@cleverbrush/react-query` wraps your `defineApi()` contract in a unified client where every endpoint is both a **callable function** (direct HTTP fetch) and an object with **TanStack Query hooks** (`useQuery`, `useSuspenseQuery`, `useInfiniteQuery`, `useMutation`, `queryKey`, `prefetch`). No need for two separate clients — one import does it all.

## Quick Start

### 1. Define a contract (shared package)

```ts
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
    },
});
```

### 2. Create a unified client

```ts
import { createClient } from '@cleverbrush/react-query';
import { api } from 'shared/contract';

export const client = createClient(api, {
    baseUrl: 'https://api.example.com',
});
```

### 3. Use it — direct fetch or hooks

```tsx
import { client } from './api';

// Direct fetch (same as @cleverbrush/web)
const todos = await client.todos.list();
const todo = await client.todos.get({ params: { id: 1 } });

// React Query hooks — on the same object
function TodoList() {
    const { data, isLoading } = client.todos.list.useQuery();

    if (isLoading) return <p>Loading…</p>;
    return <ul>{data?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
}
```

## API

### `createClient(contract, options?)`

Creates a unified client from an API contract. Accepts the same options as `createClient()` from `@cleverbrush/web` (base URL, auth token, middlewares, hooks, etc.).

Returns a proxy matching the contract structure where each endpoint is **callable** and provides:

| Method / Call | Description |
|---------------|-------------|
| `(args?)` | Direct HTTP fetch — returns `Promise<Response>` |
| `.stream(args?)` | NDJSON streaming — returns `AsyncIterable<string>` |
| `.useQuery(args?, options?)` | TanStack `useQuery` with auto-generated `queryKey` and `queryFn` |
| `.useSuspenseQuery(args?, options?)` | TanStack `useSuspenseQuery` — suspends until data is ready |
| `.useInfiniteQuery(argsFn, options)` | TanStack `useInfiniteQuery` with a function that receives `pageParam` |
| `.useMutation(options?)` | TanStack `useMutation` — pass args via `mutate(args)` |
| `.queryKey(args?)` | Returns the query key array for cache operations |
| `.prefetch(queryClient, args?)` | Prefetches data into the query cache |

Each **group** also exposes:

| Method | Description |
|--------|-------------|
| `queryKey()` | Returns the group-level query key prefix for bulk invalidation |

### Query Key Structure

Keys follow a hierarchical structure for predictable invalidation:

```ts
// Group key — invalidates all endpoints in the group
client.todos.queryKey()
// → ['@cleverbrush', 'todos']

// Endpoint key (no args) — invalidates all variants of this endpoint
client.todos.list.queryKey()
// → ['@cleverbrush', 'todos', 'list']

// Endpoint key (with args) — targets a specific cache entry
client.todos.get.queryKey({ params: { id: 42 } })
// → ['@cleverbrush', 'todos', 'get', { params: { id: 42 } }]
```

### Key Utilities

For manual key construction outside of the proxy:

```ts
import { buildQueryKey, buildGroupQueryKey, QUERY_KEY_PREFIX } from '@cleverbrush/react-query';

buildGroupQueryKey('todos');           // ['@cleverbrush', 'todos']
buildQueryKey('todos', 'list');        // ['@cleverbrush', 'todos', 'list']
buildQueryKey('todos', 'get', args);   // ['@cleverbrush', 'todos', 'get', args]
```

## Usage Patterns

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

// Prefetch on hover
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

## Error Handling

Errors from the web client are typed as `WebError` and its subtypes:

```tsx
import { isApiError, isTimeoutError } from '@cleverbrush/web';

const { error } = client.todos.list.useQuery();

if (isApiError(error)) {
    console.log(error.status, error.body);
} else if (isTimeoutError(error)) {
    console.log('Timed out after', error.timeout, 'ms');
}
```

## License

BSD 3-Clause
