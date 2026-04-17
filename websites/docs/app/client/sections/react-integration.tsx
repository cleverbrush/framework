/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function ReactIntegrationSection() {
    return (
        <>
            <div className="section-header">
                <h1>React Integration</h1>
                <p className="subtitle">
                    TanStack Query hooks on every endpoint — direct fetch and
                    hooks on the same object. Zero codegen, full type safety.
                </p>
            </div>

            <InstallBanner
                command="npm install @cleverbrush/client @tanstack/react-query"
                note={
                    <>
                        Requires <code>@cleverbrush/schema</code>,{' '}
                        <code>@cleverbrush/server</code>, and <code>react</code>{' '}
                        as peer dependencies.
                    </>
                }
            />

            {/* ── Why ──────────────────────────────────────────── */}
            <div className="why-box">
                <h2>Why @cleverbrush/client/react?</h2>

                <h3>The Problem</h3>
                <p>
                    Using TanStack Query with typed API clients means manually
                    writing <code>queryKey</code> arrays, <code>queryFn</code>{' '}
                    wrappers, and mutation boilerplate for every endpoint. Query
                    keys are stringly-typed and fragile — rename an endpoint and
                    your invalidation logic silently breaks.
                </p>

                <h3>The Solution</h3>
                <p>
                    <code>@cleverbrush/client/react</code> wraps your{' '}
                    <code>defineApi()</code> contract in a unified client where
                    every endpoint is both a callable function (direct fetch)
                    and an object with TanStack Query hooks. Query keys are
                    hierarchical and deterministic — invalidate a single entry,
                    an entire endpoint, or a whole group with one call. One
                    import, zero boilerplate.
                </p>
            </div>

            {/* ── Quick Start ──────────────────────────────────── */}
            <div className="card">
                <h2>Quick Start</h2>

                <h3>1. Create a Unified Client</h3>
                <p>
                    Wrap your existing API contract with{' '}
                    <code>createClient</code>:
                </p>
                <pre
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { createClient } from '@cleverbrush/client/react';
import { api } from 'shared/contract';

export const client = createClient(api, {
    baseUrl: 'https://api.example.com',
});`)
                    }}
                />

                <h3>2. Use It — Direct Fetch or Hooks</h3>
                <pre
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`// Direct fetch (same as @cleverbrush/client)
const todos = await client.todos.list();
const todo = await client.todos.get({ params: { id: 1 } });

// React Query hooks — on the same object
function TodoList() {
    const { data, isLoading } = client.todos.list.useQuery();

    if (isLoading) return <p>Loading…</p>;
    return (
        <ul>
            {data?.map(t => <li key={t.id}>{t.title}</li>)}
        </ul>
    );
}`)
                    }}
                />
            </div>

            {/* ── Available Hooks ──────────────────────────────── */}
            <div className="card">
                <h2>Endpoint API</h2>
                <p>
                    Every endpoint on the unified client is callable and
                    provides these methods:
                </p>
                <table className="api-table">
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>(args?)</code>
                            </td>
                            <td>
                                Direct HTTP fetch — returns{' '}
                                <code>Promise&lt;Response&gt;</code>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>.stream(args?)</code>
                            </td>
                            <td>
                                NDJSON streaming — returns{' '}
                                <code>AsyncIterable&lt;string&gt;</code>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>useQuery(args?, options?)</code>
                            </td>
                            <td>
                                Standard TanStack Query hook with auto-generated
                                key and fetch function
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>useSuspenseQuery(args?, options?)</code>
                            </td>
                            <td>
                                Suspense-enabled query — suspends the component
                                until data is ready
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>useInfiniteQuery(argsFn, options)</code>
                            </td>
                            <td>
                                Infinite scrolling with a function that receives{' '}
                                <code>pageParam</code>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>useMutation(options?)</code>
                            </td>
                            <td>
                                Mutation hook — pass endpoint args via{' '}
                                <code>mutate(args)</code>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>queryKey(args?)</code>
                            </td>
                            <td>
                                Returns the query key array for cache operations
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>prefetch(queryClient, args?)</code>
                            </td>
                            <td>
                                Prefetches data into the TanStack query cache
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── Query Keys ───────────────────────────────────── */}
            <div className="card">
                <h2>Hierarchical Query Keys</h2>
                <p>
                    Query keys follow a predictable hierarchy for fine-grained
                    or bulk invalidation:
                </p>
                <pre
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`// Group key — invalidate ALL endpoints in a group
client.todos.queryKey()
// → ['@cleverbrush', 'todos']

// Endpoint key — invalidate all variants of one endpoint
client.todos.list.queryKey()
// → ['@cleverbrush', 'todos', 'list']

// Specific key — target one cache entry
client.todos.get.queryKey({ params: { id: 42 } })
// → ['@cleverbrush', 'todos', 'get', { params: { id: 42 } }]`)
                    }}
                />
            </div>

            {/* ── Mutations ─────────────────────────────────────── */}
            <div className="card">
                <h2>Mutations &amp; Cache Invalidation</h2>
                <pre
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { useQueryClient } from '@tanstack/react-query';

function CreateTodo() {
    const queryClient = useQueryClient();
    const mutation = client.todos.create.useMutation({
        onSuccess: () => {
            // Invalidate all todo queries after creating
            queryClient.invalidateQueries({
                queryKey: client.todos.queryKey()
            });
        },
    });

    return (
        <button onClick={() => mutation.mutate({ body: { title: 'New' } })}>
            Add Todo
        </button>
    );
}`)
                    }}
                />
            </div>

            {/* ── Suspense ─────────────────────────────────────── */}
            <div className="card">
                <h2>Suspense</h2>
                <pre
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { Suspense } from 'react';

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
}`)
                    }}
                />
            </div>

            {/* ── Prefetch ─────────────────────────────────────── */}
            <div className="card">
                <h2>Prefetching</h2>
                <p>
                    Pre-populate the cache before a component mounts — great for
                    hover-to-prefetch patterns:
                </p>
                <pre
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`const queryClient = useQueryClient();

<button
    onMouseEnter={() =>
        client.todos.get.prefetch(queryClient, { params: { id: 1 } })
    }
>
    View Todo
</button>`)
                    }}
                />
            </div>

            {/* ── Error Handling ────────────────────────────────── */}
            <div className="card">
                <h2>Error Handling</h2>
                <p>
                    Errors are typed as <code>WebError</code> from{' '}
                    <code>@cleverbrush/client</code>. Use the provided type
                    guards:
                </p>
                <pre
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { isApiError, isTimeoutError } from '@cleverbrush/client';

function TodoList() {
    const { data, error } = client.todos.list.useQuery();

    if (isApiError(error)) {
        return <p>API error: {error.status} — {error.body?.message}</p>;
    }
    if (isTimeoutError(error)) {
        return <p>Request timed out after {error.timeout}ms</p>;
    }

    return <ul>{data?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
}`)
                    }}
                />
            </div>

            {/* ── Key Utilities ─────────────────────────────────── */}
            <div className="card">
                <h2>Key Utilities</h2>
                <p>
                    For manual key construction outside of the proxy (e.g., in
                    SSR loaders or utility functions):
                </p>
                <pre
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import {
    buildQueryKey,
    buildGroupQueryKey,
    QUERY_KEY_PREFIX
} from '@cleverbrush/client/react';

buildGroupQueryKey('todos');
// → ['@cleverbrush', 'todos']

buildQueryKey('todos', 'list');
// → ['@cleverbrush', 'todos', 'list']

buildQueryKey('todos', 'get', { params: { id: 1 } });
// → ['@cleverbrush', 'todos', 'get', { params: { id: 1 } }]`)
                    }}
                />
            </div>
        </>
    );
}
