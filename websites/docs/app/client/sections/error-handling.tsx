/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function ErrorHandlingSection() {
    return (
        <>
            <div className="section-header">
                <h1>Error Handling</h1>
                <p className="subtitle">
                    Typed error hierarchy with type-guard utilities
                </p>
            </div>

            <div className="card">
                <h2>Error Types</h2>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Class</th>
                                <th>Thrown When</th>
                                <th>Key Properties</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>ApiError</code>
                                </td>
                                <td>Server returns non-2xx status</td>
                                <td>
                                    <code>status</code>, <code>body</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>TimeoutError</code>
                                </td>
                                <td>Timeout middleware fires</td>
                                <td>
                                    <code>timeout</code> (ms)
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>NetworkError</code>
                                </td>
                                <td>Fetch itself throws (DNS, offline)</td>
                                <td>
                                    <code>cause</code>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p>
                    All three extend <code>WebError</code>, which extends{' '}
                    <code>Error</code>.
                </p>
            </div>

            <div className="card">
                <h2>Type Guards</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import {
    isApiError,
    isTimeoutError,
    isNetworkError,
    isWebError,
} from '@cleverbrush/client';

try {
    await client.todos.list();
} catch (err) {
    if (isApiError(err)) {
        // err.status, err.body
    } else if (isTimeoutError(err)) {
        // err.timeout
    } else if (isNetworkError(err)) {
        // err.cause — the original fetch error
    }
}`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Using with the beforeError Hook</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const client = createClient(api, {
    hooks: {
        beforeError: [
            (error) => {
                if (isApiError(error) && error.status === 404) {
                    // Transform 404s into a custom error
                    return new NotFoundError(error.message);
                }
                return error;
            }
        ],
    },
});`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}
