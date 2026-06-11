/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function IdempotencySection() {
    return (
        <>
            <div className="section-header">
                <h1>Idempotency Middleware</h1>
                <p className="subtitle">
                    Deduplicate replays of mutating requests via idempotency
                    keys
                </p>
            </div>

            <div className="card">
                <h2>Basic Usage</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { idempotency } from '@cleverbrush/client/idempotency';

const client = createClient(api, {
    middlewares: [
        idempotency(),           // adds X-Idempotency-Key to mutations
        retry({ limit: 3 }),     // preserves the key across retries
    ],
});

// First call — key is generated
await client.todos.create({ body: { title: 'Buy milk' } });

// Retry — same key, server returns stored response
`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Server Integration</h2>
                <p>
                    The server-side <code>idempotency()</code> middleware reads
                    the header, stores the response, and replays it for
                    duplicate keys.
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { idempotency } from '@cleverbrush/server';

server.handle(CreateTodo, createHandler, {
    middlewares: [idempotency({ ttl: 86_400_000 })],
});
`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>How It Works</h2>
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
                <h2>Options (Client)</h2>
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
