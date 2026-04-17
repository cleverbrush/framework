/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@/lib/highlight';

export default function DedupeSection() {
    return (
        <>
            <div className="section-header">
                <h1>Deduplication Middleware</h1>
                <p className="subtitle">
                    Coalesce identical in-flight requests into a single fetch
                </p>
            </div>

            <div className="card">
                <h2>Basic Usage</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { dedupe } from '@cleverbrush/web/dedupe';

const client = createClient(api, {
    middlewares: [dedupe()],
});

// These fire only ONE fetch — both callers receive the same response
const [a, b] = await Promise.all([
    client.todos.list(),
    client.todos.list(),
]);`)
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
                        </tbody>
                    </table>
                </div>
                <p>
                    Only GET requests are deduplicated by default. Mutations
                    (POST, PUT, etc.) always go through. Provide a custom{' '}
                    <code>key</code> function to control what counts as a
                    &quot;duplicate&quot;.
                </p>
            </div>
        </>
    );
}
