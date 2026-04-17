/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@/lib/highlight';

export default function MiddlewareSection() {
    return (
        <>
            <div className="section-header">
                <h1>Middleware</h1>
                <p className="subtitle">
                    Wrap the fetch call to intercept, modify, or short-circuit
                    requests and responses
                </p>
            </div>

            <div className="card">
                <h2>How It Works</h2>
                <p>
                    A middleware is a function that takes the <em>next</em>{' '}
                    handler and returns a new handler that wraps it. Middlewares
                    compose like an onion — the first in the array executes
                    first on the way in and last on the way out.
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
type Middleware = (next: FetchLike) => FetchLike;`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Using Built-in Middlewares</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { createClient } from '@cleverbrush/web';
import { retry } from '@cleverbrush/web/retry';
import { timeout } from '@cleverbrush/web/timeout';
import { dedupe } from '@cleverbrush/web/dedupe';
import { throttlingCache } from '@cleverbrush/web/cache';

const client = createClient(api, {
    middlewares: [
        retry({ limit: 3 }),
        timeout({ timeout: 10000 }),
        dedupe(),
        throttlingCache({ throttle: 2000 }),
    ],
});`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Writing a Custom Middleware</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import type { Middleware } from '@cleverbrush/web';

const logger: Middleware = (next) => async (url, init) => {
    const start = performance.now();
    console.log('→', init.method, url);
    const res = await next(url, init);
    console.log('←', res.status, \`(\${(performance.now() - start).toFixed(0)}ms)\`);
    return res;
};`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Composition Order</h2>
                <p>
                    Middlewares are applied in array order. For resilience, a
                    typical order is:
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`middlewares: [
    retry(),     // outermost — retries the entire inner chain
    timeout(),   // aborts if a single attempt takes too long
    dedupe(),    // deduplicates concurrent identical requests
    cache(),     // serves cached responses within TTL
]`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}
