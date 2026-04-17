/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@/lib/highlight';

export default function BatchingSection() {
    return (
        <>
            <div className="section-header">
                <h1>Request Batching</h1>
                <p className="subtitle">
                    Coalesce concurrent requests into a single HTTP round-trip
                </p>
            </div>

            <div className="card">
                <h2>Overview</h2>
                <p>
                    The <code>batching()</code> middleware queues concurrent
                    calls and sends them together as a single{' '}
                    <code>POST&nbsp;/__batch</code>, reducing network overhead
                    for UIs that make many parallel requests. Individual call
                    sites receive their own typed responses — the batching is
                    completely transparent to application code.
                </p>
                <p>
                    <strong>Prerequisite</strong>: the server must have batching
                    enabled via <code>ServerBuilder.useBatching()</code>.
                </p>
            </div>

            <div className="card">
                <h2>Quick Start</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// Server
import { createServer } from '@cleverbrush/server';

await createServer()
    .useBatching()         // enables POST /__batch
    .handleAll(mapping)
    .listen(3000);

// Client
import { batching } from '@cleverbrush/client/batching';

const client = createClient(api, {
    baseUrl: 'https://api.example.com',
    middlewares: [
        retry(),
        timeout(),
        batching({ maxSize: 10, windowMs: 10 }),
    ],
});

// These three concurrent calls become ONE HTTP request.
const [todos, user, stats] = await Promise.all([
    client.todos.list(),
    client.users.me(),
    client.stats.summary(),
]);`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>How It Works</h2>
                <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                    <li>
                        The first queued request starts a <code>windowMs</code>{' '}
                        timer.
                    </li>
                    <li>
                        Additional requests arriving before the timer fires join
                        the same batch.
                    </li>
                    <li>
                        When the timer fires — or <code>maxSize</code> is
                        reached — all queued requests are sent as a single{' '}
                        <code>POST&nbsp;/__batch</code>.
                    </li>
                    <li>
                        The server processes each sub-request through its full
                        middleware and handler pipeline.
                    </li>
                    <li>
                        Each caller receives its own reconstructed{' '}
                        <code>Response</code>.
                    </li>
                </ol>
                <p>
                    If only <strong>one</strong> request is queued at flush time
                    it is sent directly — no batch overhead.
                </p>
            </div>

            <div className="card">
                <h2>
                    Client Options (<code>BatchingOptions</code>)
                </h2>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Option</th>
                                <th>Type</th>
                                <th>Default</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>maxSize</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>
                                    <code>10</code>
                                </td>
                                <td>
                                    Maximum requests per batch; flush
                                    immediately on reaching this limit
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>windowMs</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>
                                    <code>10</code>
                                </td>
                                <td>Collection window in milliseconds</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>batchPath</code>
                                </td>
                                <td>
                                    <code>string</code>
                                </td>
                                <td>
                                    <code>'/__batch'</code>
                                </td>
                                <td>
                                    Batch endpoint path — must match server
                                    config
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>skip</code>
                                </td>
                                <td>
                                    <code>(url, init) =&gt; boolean</code>
                                </td>
                                <td>—</td>
                                <td>
                                    Return <code>true</code> to bypass batching
                                    for a specific request
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h2>
                    Server Options (<code>ServerBatchingOptions</code>)
                </h2>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Option</th>
                                <th>Type</th>
                                <th>Default</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>path</code>
                                </td>
                                <td>
                                    <code>string</code>
                                </td>
                                <td>
                                    <code>'/__batch'</code>
                                </td>
                                <td>URL path for the batch endpoint</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>maxSize</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>
                                    <code>20</code>
                                </td>
                                <td>
                                    Maximum sub-requests per batch (400 if
                                    exceeded)
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>parallel</code>
                                </td>
                                <td>
                                    <code>boolean</code>
                                </td>
                                <td>
                                    <code>true</code>
                                </td>
                                <td>
                                    Process sub-requests in parallel; set{' '}
                                    <code>false</code> for sequential
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h2>Middleware Placement</h2>
                <p>
                    Place <code>batching()</code> <strong>last</strong> in the{' '}
                    <code>middlewares</code> array so that <code>retry()</code>{' '}
                    and <code>timeout()</code> operate on each logical call
                    independently, not on the single batch fetch.
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// ✅ Correct — retry/timeout wrap individual call promises
middlewares: [retry(), timeout(), batching()],

// ⚠️ Wrong — retry wraps the entire batch fetch
middlewares: [batching(), retry(), timeout()],`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Skipping Specific Requests</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`batching({
    skip: (_url, init) => {
        // Never batch file uploads
        return init.body instanceof FormData;
    },
})`)
                        }}
                    />
                </pre>
                <p>
                    Requests that are <strong>never</strong> batched regardless
                    of the <code>skip</code> predicate:
                </p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                    <li>
                        The batch endpoint itself (prevents infinite recursion)
                    </li>
                    <li>
                        <code>FormData</code> or <code>ReadableStream</code>{' '}
                        bodies
                    </li>
                    <li>Single-item queues at flush time (sent directly)</li>
                </ul>
            </div>

            <div className="card">
                <h2>Wire Protocol</h2>
                <p>The batch request and response use plain JSON:</p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// POST /__batch  →  Request body
{
    "requests": [
        { "method": "GET",  "url": "/api/todos", "headers": { "authorization": "Bearer ..." } },
        { "method": "POST", "url": "/api/todos", "headers": { "content-type": "application/json" }, "body": "{\\"title\\":\\"Buy milk\\"}" }
    ]
}

// 200 OK  ←  Response body
{
    "responses": [
        { "status": 200, "headers": { "content-type": "application/json" }, "body": "[{\\"id\\":1}]" },
        { "status": 201, "headers": { "content-type": "application/json" }, "body": "{\\"id\\":2,\\"title\\":\\"Buy milk\\"}" }
    ]
}`)
                        }}
                    />
                </pre>
                <p>
                    One sub-request failing returns its error status in its own
                    slot — the rest succeed normally.
                </p>
            </div>
        </>
    );
}
