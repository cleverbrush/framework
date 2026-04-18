/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function CacheSection() {
    return (
        <>
            <div className="section-header">
                <h1>Cache Middleware</h1>
                <p className="subtitle">
                    Throttle GET requests by serving cached responses within a
                    TTL window
                </p>
            </div>

            <div className="card">
                <h2>Basic Usage</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { throttlingCache } from '@cleverbrush/client/cache';

const client = createClient(api, {
    middlewares: [throttlingCache({ throttle: 5000 })],
});

// First call hits the network
await client.todos.list();

// Within 5 seconds — returns cached response instantly
await client.todos.list();`)
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
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>throttle</code>
                                </td>
                                <td>
                                    <code>number</code>
                                </td>
                                <td>
                                    <code>1000</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>methods</code>
                                </td>
                                <td>
                                    <code>string[]</code>
                                </td>
                                <td>
                                    <code>[&apos;GET&apos;]</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>key</code>
                                </td>
                                <td>
                                    <code>(url, init) =&gt; string</code>
                                </td>
                                <td>
                                    <code>method + url</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>invalidateOnMutation</code>
                                </td>
                                <td>
                                    <code>boolean</code>
                                </td>
                                <td>
                                    <code>true</code>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p>
                    When <code>invalidateOnMutation</code> is enabled, any POST,
                    PUT, PATCH, or DELETE request clears the entire cache so
                    subsequent GETs fetch fresh data.
                </p>
            </div>
        </>
    );
}
