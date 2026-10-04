/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function IdempotencySection() {
    return (
        <>
            <div className="section-header">
                <h1>Idempotent Operations</h1>
                <p className="subtitle">
                    Deduplicate replays of mutating requests via idempotency
                    keys
                </p>
            </div>

            <div className="card">
                <h2>Contract-declared retries</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// Shared contract: opt in once.
const CreateTodo = endpoint.post('/todos').idempotent().body(CreateTodoSchema);

const client = createClient(api, {
    middlewares: [retry({ limit: 3 }), timeout({ timeout: 10_000 })]
});

// Framework generates a key and retains it across HTTP retries.
await client.todos.create({ body: { title: 'Buy milk' } });

// To retry an existing user attempt, supply its saved key.
await client.todos.create({ body: savedBody, idempotencyKey: savedKey });
`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Server Integration</h2>
                <p>
                    Endpoint preparation runs after authentication and
                    validation, before every replay. It receives typed request
                    data and injected services. Scope resolution uses the
                    prepared request. Concurrent duplicates share one execution
                    within a bounded, process-local store.
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`server.handle(CreateTodo.authorize(UserPrincipal).inject({ db: DbToken }), createHandler, {
    prepare: authorizeAndResolveWorkspace,
    idempotency: {
        scope: ({ principal, body }) => [principal.userId, body.workspaceId]
    },
    errors: todoErrors
});

// The same options work in implement(api).group(...).withHandlers(...).
`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>User save attempts</h2>
                <p>
                    Use <code>createIdempotentOperation</code> from
                    <code>@cleverbrush/client/idempotency</code> to retain a
                    payload snapshot and key after an uncertain failure. Its
                    <code>prepare</code> callback computes defaults once per
                    changed input, and <code>execute</code> sends the request.
                    Success clears the attempt; <code>reset(draftId)</code>
                    cancels its local state. Independent drafts use separate
                    IDs.
                </p>
                <p>
                    The matching <code>useIdempotentOperation</code> hook lives
                    in <code>@cleverbrush/client/idempotency/react</code> and
                    requires no form or query library. FormData actions can use
                    <code>withIdempotencyKey</code> and
                    <code>readIdempotencyKey</code> to pass metadata separately
                    from their domain payload.
                </p>
                <h2>How replay works</h2>
                <ul>
                    <li>
                        <strong>On mutation:</strong> Client auto-generates a
                        UUID v4 as <code>X-Idempotency-Key</code> header.
                    </li>
                    <li>
                        <strong>On server:</strong> First request with a key
                        runs the handler and stores the response. Replays return
                        the stored response immediately.
                    </li>
                    <li>
                        <strong>On retry:</strong> The key is preserved —
                        retried requests are treated as replays, not new
                        operations.
                    </li>
                </ul>
            </div>

            <div className="card">
                <h2>Low-level middleware options (Client)</h2>
                <div className="table-wrap">
                    <table className="api-table">
                        <caption className="visually-hidden">
                            API reference table
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">Option</th>
                                <th scope="col">Type</th>
                                <th scope="col">Default</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>headerName</code>
                                </td>
                                <td>
                                    <code>string</code>
                                </td>
                                <td>
                                    <code>"X-Idempotency-Key"</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>keyGenerator</code>
                                </td>
                                <td>
                                    <code>(url, init) =&gt; string</code>
                                </td>
                                <td>
                                    <code>uuid v4</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>condition</code>
                                </td>
                                <td>
                                    <code>(url, init) =&gt; boolean</code>
                                </td>
                                <td>
                                    <code>mutations only</code>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h2>Options (Server)</h2>
                <div className="table-wrap">
                    <table className="api-table">
                        <caption className="visually-hidden">
                            API reference table
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">Option</th>
                                <th scope="col">Type</th>
                                <th scope="col">Default</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>scope</code>
                                </td>
                                <td>
                                    <code>(ctx) =&gt; string | undefined</code>
                                </td>
                                <td>Required; undefined skips replay</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>maxEntries</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>
                                    <code>1000</code> (pending and completed)
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>maxResponseBytes</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>
                                    <code>65536</code> bytes
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>ttl</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>
                                    <code>86400000</code> (24h)
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>headerName</code>
                                </td>
                                <td>
                                    <code>string</code>
                                </td>
                                <td>
                                    <code>"x-idempotency-key"</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>skip</code>
                                </td>
                                <td>
                                    <code>(ctx) =&gt; boolean</code>
                                </td>
                                <td>
                                    <code>non-mutating requests</code>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
