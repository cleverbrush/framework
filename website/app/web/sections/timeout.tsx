/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@/lib/highlight';

export default function TimeoutSection() {
    return (
        <>
            <div className="section-header">
                <h1>Timeout Middleware</h1>
                <p className="subtitle">
                    Abort requests that exceed a time limit and throw a typed
                    TimeoutError
                </p>
            </div>

            <div className="card">
                <h2>Basic Usage</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { timeout } from '@cleverbrush/web/timeout';

const client = createClient(api, {
    middlewares: [timeout({ timeout: 5000 })],
});`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>How It Works</h2>
                <p>
                    The middleware creates an <code>AbortController</code> and
                    starts a timer. If the timer fires before the fetch
                    completes, the request is aborted and a{' '}
                    <code>TimeoutError</code> is thrown. If the caller provides
                    their own <code>AbortSignal</code>, it is linked — aborting
                    either signal cancels the request.
                </p>
            </div>

            <div className="card">
                <h2>Handling TimeoutError</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { isTimeoutError } from '@cleverbrush/web';

try {
    await client.todos.list();
} catch (err) {
    if (isTimeoutError(err)) {
        console.log(\`Timed out after \${err.timeout}ms\`);
    }
}`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}
