/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function GettingStartedSection() {
    return (
        <>
            <div className="section-header">
                <h1>@cleverbrush/client</h1>
                <p className="subtitle">
                    Typed HTTP client for @cleverbrush/server API contracts —
                    Proxy-based, zero codegen, full type inference
                </p>
            </div>

            <InstallBanner
                command="npm install @cleverbrush/client @cleverbrush/server @cleverbrush/schema"
                note={
                    <>
                        The server and schema packages are needed for the shared
                        API contract that drives type inference.
                    </>
                }
            />

            <div className="why-box">
                <h2>💡 Why @cleverbrush/client?</h2>
                <h3>The Problem</h3>
                <p>
                    Keeping your client-side fetch calls in sync with the server
                    is painful. You either duplicate types by hand, run a code
                    generator, or give up and use <code>any</code>. Every
                    approach has a cost: stale types, extra build steps, or lost
                    safety.
                </p>
                <h3>The Solution</h3>
                <p>
                    <code>@cleverbrush/client</code> reads the same API contract
                    your server already defines and builds a fully typed client
                    at compile time — no codegen, no manual annotations. At
                    runtime a two-level <code>Proxy</code> translates method
                    calls into <code>fetch</code> requests using endpoint
                    metadata.
                </p>
            </div>

            <div className="card">
                <h2>Defining a Contract</h2>
                <p>
                    Define your API contract once in a shared package using{' '}
                    <code>defineApi()</code> from{' '}
                    <code>@cleverbrush/server/contract</code>:
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
            .get('/api/todos', route({ id: number().coerce() })\`/\${t => t.id}\`)
            .returns(Todo),
        create: endpoint
            .post('/api/todos')
            .body(object({ title: string() }))
            .returns(Todo),
        delete: endpoint
            .delete('/api/todos', route({ id: number().coerce() })\`/\${t => t.id}\`)
    }
});`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Creating a Client</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { api } from 'todo-shared';
import { createClient } from '@cleverbrush/client';

const client = createClient(api, {
    baseUrl: 'https://api.example.com',
    getToken: () => localStorage.getItem('token'),
    onUnauthorized: () => { window.location.href = '/login'; },
});`)
                        }}
                    />
                </pre>
            </div>

            <div className="card">
                <h2>Usage</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const todos = await client.todos.list();
const todo = await client.todos.get({ params: { id: 1 } });
const created = await client.todos.create({ body: { title: 'Buy milk' } });
await client.todos.delete({ params: { id: 1 } });`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}
