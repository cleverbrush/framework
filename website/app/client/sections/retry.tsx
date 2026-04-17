/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@/lib/highlight';

export default function RetrySection() {
    return (
        <>
            <div className="section-header">
                <h1>Retry Middleware</h1>
                <p className="subtitle">
                    Automatically retry failed requests with exponential
                    backoff, jitter, and Retry-After support
                </p>
            </div>

            <div className="card">
                <h2>Basic Usage</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { retry } from '@cleverbrush/client/retry';

const client = createClient(api, {
    middlewares: [retry()],
});`)
                        }}
                    />
                </pre>
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
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>limit</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>
                                    <code>2</code>
                                </td>
                                <td>Maximum number of retries</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>methods</code>
                                </td>
                                <td>
                                    <code>string[]</code>
                                </td>
                                <td>GET, PUT, HEAD, DELETE, OPTIONS</td>
                                <td>HTTP methods to retry</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>statusCodes</code>
                                </td>
                                <td>
                                    <code>number[]</code>
                                </td>
                                <td>408, 429, 500, 502, 503, 504</td>
                                <td>Status codes that trigger retry</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>backoffLimit</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>
                                    <code>Infinity</code>
                                </td>
                                <td>Maximum delay in ms</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>delay</code>
                                </td>
                                <td>
                                    <code>(n) =&gt; ms</code>
                                </td>
                                <td>Exponential (0.3 × 2ⁿ⁻¹ × 1000)</td>
                                <td>Custom delay function</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>jitter</code>
                                </td>
                                <td>
                                    <code>boolean | (d) =&gt; d</code>
                                </td>
                                <td>
                                    <code>false</code>
                                </td>
                                <td>Add randomization to delays</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>retryOnTimeout</code>
                                </td>
                                <td>
                                    <code>boolean</code>
                                </td>
                                <td>
                                    <code>false</code>
                                </td>
                                <td>Retry on TimeoutError</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>shouldRetry</code>
                                </td>
                                <td>
                                    <code>(err, n) =&gt; boolean</code>
                                </td>
                                <td>—</td>
                                <td>Custom predicate</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h2>Advanced Example</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`retry({
    limit: 5,
    backoffLimit: 30000,
    jitter: true,
    retryOnTimeout: true,
    shouldRetry: (error, attempt) => {
        // Don't retry client errors
        if ('status' in error && error.status < 500) return false;
        return attempt < 5;
    },
})`)
                        }}
                    />
                </pre>
                <p>
                    The retry middleware automatically respects{' '}
                    <code>Retry-After</code> headers on 429 and 503 responses,
                    supporting both seconds and HTTP-date formats.
                </p>
            </div>
        </>
    );
}
