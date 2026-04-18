/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function PerCallOverridesSection() {
    return (
        <>
            <div className="section-header">
                <h1>Per-Call Overrides</h1>
                <p className="subtitle">
                    Override middleware options on individual requests
                </p>
            </div>

            <div className="card">
                <h2>Overview</h2>
                <p>
                    The retry and timeout middlewares accept default options at
                    client creation time. You can override those defaults for a
                    single call by passing <code>retry</code> or{' '}
                    <code>timeout</code> in the call arguments:
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// Global: 3 retries, 5s timeout
const client = createClient(api, {
    middlewares: [
        retry({ limit: 3 }),
        timeout({ timeout: 5000 }),
    ],
});

// This specific call: 5 retries, 30s timeout
const report = await client.reports.generate({
    retry: { limit: 5 },
    timeout: 30000,
});

// This call: no retries
const data = await client.analytics.realtime({
    retry: { limit: 0 },
});`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Supported Overrides</h2>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Key</th>
                                <th>Type</th>
                                <th>Affects</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>retry</code>
                                </td>
                                <td>
                                    <code>Partial&lt;RetryOptions&gt;</code>
                                </td>
                                <td>Retry middleware</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>timeout</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>Timeout middleware</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
