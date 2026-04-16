/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@/app/InstallBanner';
import { highlightTS } from '@/lib/highlight';

export default function WebPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/web</h1>
                    <p className="subtitle">
                        Typed HTTP client for @cleverbrush/server API contracts
                        — Proxy-based, zero codegen, full type inference
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    command="npm install @cleverbrush/web @cleverbrush/server @cleverbrush/schema"
                    note={
                        <>
                            The server and schema packages are needed for the
                            shared API contract that drives type inference.
                        </>
                    }
                />

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/web?</h2>

                    <h3>The Problem</h3>
                    <p>
                        Keeping your client-side fetch calls in sync with the
                        server is painful. You either duplicate types by hand,
                        run a code generator, or give up and use{' '}
                        <code>any</code>. Every approach has a cost: stale
                        types, extra build steps, or lost safety.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/web</code> reads the same API
                        contract your server already defines and builds a fully
                        typed client at compile time — no codegen, no manual
                        annotations. At runtime a two-level <code>Proxy</code>{' '}
                        translates method calls into <code>fetch</code> requests
                        using endpoint metadata.
                    </p>

                    <h3>Key Features</h3>
                    <ul>
                        <li>
                            <strong>
                                Types inferred from server endpoints
                            </strong>{' '}
                            — params, body, query, and response types flow
                            automatically from the contract.
                        </li>
                        <li>
                            <strong>No code generation</strong> — share the
                            contract package and import{' '}
                            <code>createClient</code>. That&apos;s it.
                        </li>
                        <li>
                            <strong>Proxy-based runtime</strong> — endpoint
                            metadata (HTTP method, path template, schemas) is
                            read via <code>.introspect()</code> at first call
                            and cached.
                        </li>
                        <li>
                            <strong>Shared contract</strong> — server and client
                            depend on the same <code>defineApi()</code> object,
                            so changes are caught by the compiler immediately.
                        </li>
                        <li>
                            <strong>Configurable auth &amp; fetch</strong> —
                            token injection, 401 handling, custom{' '}
                            <code>fetch</code>, and extra headers out of the
                            box.
                        </li>
                    </ul>
                </div>

                {/* ── Defining a Contract ──────────────────────────── */}
                <div className="card">
                    <h2>Defining a Contract</h2>
                    <p>
                        Define your API contract once in a shared package using{' '}
                        <code>defineApi()</code> from{' '}
                        <code>@cleverbrush/server/contract</code>. Both the
                        server and the client import the same object:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { endpoint, route, defineApi } from '@cleverbrush/server/contract';
import { object, string, number, array, boolean } from '@cleverbrush/schema';

const Todo = object({
    id: number(),
    title: string(),
    completed: boolean()
});

export const api = defineApi({
    todos: {
        list: endpoint.get('/api/todos').returns(array(Todo)),

        get: endpoint
            .get(route(object({ id: number().coerce() }), $t => $t\`/api/todos/\${t => t.id}\`))
            .returns(Todo),

        create: endpoint
            .post('/api/todos')
            .body(object({ title: string() }))
            .returns(Todo),

        delete: endpoint
            .delete(route(object({ id: number().coerce() }), $t => $t\`/api/todos/\${t => t.id}\`))
    }
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Creating a Client ────────────────────────────── */}
                <div className="card">
                    <h2>Creating a Client</h2>
                    <p>
                        Pass the contract and options to{' '}
                        <code>createClient()</code>. The returned object mirrors
                        the contract shape: each group becomes a namespace and
                        each endpoint becomes an async function.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { api } from 'todo-shared';
import { createClient } from '@cleverbrush/web';

const client = createClient(api, {
    baseUrl: 'https://api.example.com',
    getToken: () => localStorage.getItem('token'),
    onUnauthorized: () => {
        window.location.href = '/login';
    },
    headers: {
        'X-Client-Version': '1.0.0'
    }
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Usage ────────────────────────────────────────── */}
                <div className="card">
                    <h2>Usage</h2>
                    <p>
                        Every call is fully typed — params, body, query, and the
                        return type are all inferred from the contract:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// List all todos — no arguments needed
const todos = await client.todos.list();
// todos: { id: number; title: string; completed: boolean }[]

// Get a single todo — params are required
const todo = await client.todos.get({ params: { id: 1 } });
// todo: { id: number; title: string; completed: boolean }

// Create a todo — body is required
const created = await client.todos.create({
    body: { title: 'Buy milk' }
});
// created: { id: number; title: string; completed: boolean }

// Delete a todo — params are required, returns void
await client.todos.delete({ params: { id: 1 } });`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Error Handling ───────────────────────────────── */}
                <div className="card">
                    <h2>Error Handling</h2>
                    <p>
                        When the server responds with a non-2xx status code the
                        client throws an <code>ApiError</code> with the status,
                        message, and parsed body (if JSON):
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { ApiError } from '@cleverbrush/web';

try {
    await client.todos.get({ params: { id: 999 } });
} catch (err) {
    if (err instanceof ApiError) {
        console.log(err.status);  // 404
        console.log(err.message); // "Not Found"
        console.log(err.body);    // parsed JSON body, if any
    }
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── ClientOptions ────────────────────────────────── */}
                <div className="card">
                    <h2>ClientOptions</h2>
                    <p>
                        All fields are optional. Pass them as the second
                        argument to <code>createClient()</code>:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`interface ClientOptions {
    /** Base URL prepended to every request path. Defaults to '' (same origin). */
    baseUrl?: string;

    /** Returns the current auth token. Sent as a Bearer token in the Authorization header. */
    getToken?: () => string | null;

    /** Custom fetch implementation. Defaults to globalThis.fetch. */
    fetch?: typeof globalThis.fetch;

    /** Called when a 401 Unauthorized response is received. */
    onUnauthorized?: () => void;

    /** Additional headers sent with every request. */
    headers?: Record<string, string>;
}`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}
