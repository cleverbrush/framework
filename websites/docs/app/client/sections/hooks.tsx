/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function HooksSection() {
    return (
        <>
            <div className="section-header">
                <h1>Lifecycle Hooks</h1>
                <p className="subtitle">
                    Fine-grained callbacks at various stages of a request
                </p>
            </div>

            <div className="card">
                <h2>Overview</h2>
                <p>
                    Hooks are arrays of callbacks executed serially at specific
                    points in the request lifecycle. Unlike middleware, hooks
                    are simpler callbacks that don&apos;t wrap the fetch call.
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const client = createClient(api, {
    hooks: {
        beforeRequest: [
            (req) => {
                req.init.headers = {
                    ...req.init.headers as Record<string, string>,
                    'X-Request-Id': crypto.randomUUID(),
                };
            }
        ],
        afterResponse: [
            (req, res) => {
                console.log(\`\${req.init.method} \${req.url} → \${res.status}\`);
            }
        ],
        beforeError: [
            (error) => {
                console.error('Request failed:', error.message);
                return error;
            }
        ],
    },
});`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Hook Reference</h2>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Hook</th>
                                <th>When</th>
                                <th>Can Modify</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>beforeRequest</code>
                                </td>
                                <td>Before the fetch call</td>
                                <td>Request headers, body, URL</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>afterResponse</code>
                                </td>
                                <td>After a successful response</td>
                                <td>Return a new Response to replace</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>beforeRetry</code>
                                </td>
                                <td>Between retry attempts</td>
                                <td>Logging only</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>beforeError</code>
                                </td>
                                <td>Before an error is thrown</td>
                                <td>Return a transformed WebError</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
