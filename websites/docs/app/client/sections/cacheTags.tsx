/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function CacheTagsSection() {
    return (
        <>
            <div className="section-header">
                <h1>Cache-Tag Middleware</h1>
                <p className="subtitle">
                    Tag-based HTTP caching with automatic invalidation driven by
                    endpoint annotations
                </p>
            </div>

            <div className="card">
                <h2>Basic Usage</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { cacheTags } from '@cleverbrush/client/cache';

const client = createClient(api, {
    middlewares: [cacheTags({ defaultTtl: 5000 })],
});

// First call hits the network
await client.todos.list({ query: { page: 1 } });

// Within 5 seconds — cache hit, no network request
await client.todos.list({ query: { page: 1 } });
`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Server Integration</h2>
                <p>
                    Cache tags are declared on the server-side endpoint
                    definition via <code>.cacheTag()</code>. Tags flow through
                    the contract metadata to the client automatically.
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// contract.ts
const ListTodos = todosResource
    .get()
    .query(TodoListQuerySchema)
    .cacheTag('todo-list', p => ({
        page: p.query.page,
        limit: p.query.limit
    }))
    .returns(array(TodoSchema));

const UpdateTodo = todosResource
    .patch(ById)
    .body(UpdateTodoBodySchema)
    .cacheTag('todo-list')            // invalidates list
    .cacheTag('todo', p => ({        // invalidates entity
        id: p.params.id
    }))
    .returns(TodoSchema);
`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>How It Works</h2>
                <ul>
                    <li>
                        <strong>On GET:</strong> Computes cache key from the
                        endpoint&apos;s cache tag names and property selectors.
                        Serves cached response if within TTL.
                    </li>
                    <li>
                        <strong>On mutation (POST/PUT/PATCH/DELETE):</strong>{' '}
                        Invalidates all entries whose key starts with any of the
                        endpoint&apos;s tag names — no manual callbacks needed.
                    </li>
                    <li>
                        <strong>Property-based keys:</strong> Tags with
                        properties differentiate cache entries by request
                        params, query, body, or headers (e.g. different pages
                        get different cache keys).
                    </li>
                    <li>
                        <strong>TanStack Query bridge:</strong> When used with{' '}
                        <code>@cleverbrush/client/react</code>,{' '}
                        <code>useMutation</code> hooks automatically invalidate
                        TanStack Query cache for the affected group.
                    </li>
                </ul>
            </div>

            <div className="card">
                <h2>Options</h2>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Option</th>
                                <th>Type</th>
                                <th>Default</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>defaultTtl</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>
                                    <code>0</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>ttlByTag</code>
                                </td>
                                <td>
                                    <code>
                                        {'{'} [tagName: string]: number {'}'}
                                    </code>
                                </td>
                                <td>
                                    <code>{'{ }'}</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>condition</code>
                                </td>
                                <td>
                                    <code>(response) =&gt; boolean</code>
                                </td>
                                <td>
                                    <code>response.ok</code>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p>
                    Set <code>defaultTtl: 0</code> for invalidation-only mode:
                    GET responses are not cached, but mutations still invalidate
                    entries created by other endpoints.
                </p>
            </div>
        </>
    );
}
