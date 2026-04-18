/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: needed for code examples */

import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export const metadata = {
    title: 'Examples — Cleverbrush',
    description:
        'Full-stack Todo app demonstrating Cleverbrush server, client, auth, DI, schema-driven forms, and more.'
};

export default function ExamplesPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Examples</h1>
                    <p className="subtitle">
                        A production-style full-stack Todo app that uses most of
                        the Cleverbrush framework — server, client, auth, DI,
                        mapper, schema-driven forms, and OpenAPI.
                    </p>
                </div>

                {/* ── Overview ────────────────────────────────────── */}
                <div className="card">
                    <h2>Todo app</h2>
                    <p>
                        The monorepo includes a complete{' '}
                        <strong>backend + frontend</strong> demo with Docker
                        Compose and PostgreSQL. It showcases the core workflow:
                        define schemas once, share the contract, and get typed
                        handlers, clients, and forms for free.
                    </p>

                    <h3>Backend packages used</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Package</th>
                                    <th>What it does in the demo</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/server</code>
                                    </td>
                                    <td>
                                        REST API, exhaustive handler mapping,
                                        batching, health check
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/schema</code>
                                    </td>
                                    <td>
                                        Shared schemas for request/response
                                        bodies, queries, headers
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/auth</code>
                                    </td>
                                    <td>
                                        JWT auth, Google OAuth, role-based
                                        authorization
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/di</code>
                                    </td>
                                    <td>
                                        Dependency injection with schema-as-key
                                        tokens
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/env</code>
                                    </td>
                                    <td>
                                        Typed env config with schema validation
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/knex-schema</code>
                                    </td>
                                    <td>
                                        Schema-aware Knex queries (
                                        <code>.hasTableName()</code>,{' '}
                                        <code>.hasColumnName()</code>)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/mapper</code>
                                    </td>
                                    <td>
                                        Object mapping between DB rows and API
                                        responses
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/server-openapi</code>
                                    </td>
                                    <td>
                                        Auto-generated OpenAPI 3.1 + AsyncAPI
                                        specs
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/schema-json</code>
                                    </td>
                                    <td>Discriminator support for OpenAPI</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>Frontend packages used</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Package</th>
                                    <th>What it does in the demo</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/client</code>
                                    </td>
                                    <td>
                                        Typed REST client with retry, timeout,
                                        dedup, cache, batching
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/react-form</code>
                                    </td>
                                    <td>
                                        Schema-driven form fields with
                                        auto-validation
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/schema</code>
                                    </td>
                                    <td>
                                        Shared schemas (same ones used on the
                                        server)
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Key patterns ────────────────────────────────── */}
                <div className="card">
                    <h2>Key patterns from the demo</h2>

                    <h3>1. Shared API contract</h3>
                    <p>
                        One contract file imported by both server and client —
                        no codegen, no type duplication:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// contract.ts — shared between frontend and backend
export const api = defineApi({
    todos: {
        list: todosResource.get()
            .query(TodoListQuerySchema)
            .responses({ 200: array(TodoResponseSchema) }),
        create: todosResource.post()
            .body(CreateTodoBodySchema)
            .responses({ 201: TodoResponseSchema }),
    }
});`)
                            }}
                        />
                    </pre>

                    <h3>2. Typed client with resilience</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { createClient } from '@cleverbrush/client/react';
import { retry, timeout, dedupe, throttlingCache, batching } from '@cleverbrush/client';

export const client = createClient(api, {
    baseUrl: BASE_URL,
    getToken: () => loadToken(),
    middlewares: [
        retry({ limit: 2 }),
        timeout({ timeout: 10_000 }),
        dedupe(),
        throttlingCache({ throttle: 2000 }),
        batching({ maxSize: 10 })
    ]
});

// Usage: fully typed, autocompleted
const todos = await client.todos.list({ query: { page: 1 } });`)
                            }}
                        />
                    </pre>

                    <h3>3. Schema-driven forms</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { useSchemaForm, Field } from '@cleverbrush/react-form';

const form = useSchemaForm(CreateTodoBodySchema);

// Validation rules come from the schema — no manual rules needed
<Field forProperty={(t) => t.title} form={form} label="Title" />
<Field forProperty={(t) => t.description} form={form} label="Description" variant="textarea" />`)
                            }}
                        />
                    </pre>

                    <h3>4. Server with auth &amp; DI</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const server = createServer()
    .use(corsMiddleware)
    .services(svc => configureDI(svc, config))
    .useAuthentication({
        defaultScheme: 'jwt',
        schemes: [jwtScheme({
            secret: config.jwt.secret,
            mapClaims: claims => ({ userId: claims.sub, role: claims.role })
        })]
    })
    .useAuthorization()
    .withHealthcheck()
    .useBatching();

mapHandlers(server, api, handlers);
server.listen(config.port);`)
                            }}
                        />
                    </pre>

                    <h3>5. Typed env config</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { env, parseEnv } from '@cleverbrush/env';

export const config = parseEnv({
    db: {
        host: env('DB_HOST', string().default('localhost')),
        port: env('DB_PORT', number().coerce().default(5432))
    },
    jwt: {
        secret: env('JWT_SECRET', string().minLength(32))
    }
});`)
                            }}
                        />
                    </pre>

                    <h3>6. DI tokens using schema</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { any } from '@cleverbrush/schema';

// Schema builders serve as DI tokens — fully typed
export const KnexToken = any().hasType<Knex>();
export const BoundQueryToken = any().hasType<BoundQuery>();`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Run it ──────────────────────────────────────── */}
                <div className="card">
                    <h2>Run it yourself</h2>
                    <p>
                        Clone the repo and spin up the demo with Docker Compose:
                    </p>
                    <pre>
                        <code>{`git clone https://github.com/nicklatkovich/framework.git
cd framework/demos
docker compose up`}</code>
                    </pre>
                    <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>
                        This starts the backend, frontend, and PostgreSQL. The
                        frontend is available at{' '}
                        <code>http://localhost:8080</code> and the API at{' '}
                        <code>http://localhost:3000</code>.
                    </p>
                </div>

                {/* ── Demo features ──────────────────────────────── */}
                <div className="card">
                    <h2>Demo features</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>What it demonstrates</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>CRUD endpoints</td>
                                    <td>
                                        Pagination, conflict detection
                                        (If-Match), soft delete
                                    </td>
                                </tr>
                                <tr>
                                    <td>Auth</td>
                                    <td>
                                        JWT login/register, Google OAuth, RBAC
                                        (user/admin)
                                    </td>
                                </tr>
                                <tr>
                                    <td>Export/Import</td>
                                    <td>
                                        CSV file download, bulk import with 207
                                        Multi-Status
                                    </td>
                                </tr>
                                <tr>
                                    <td>Webhooks</td>
                                    <td>
                                        OpenAPI 3.1 callbacks via{' '}
                                        <code>.callbacks()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>WebSocket/SSE</td>
                                    <td>
                                        Live todo updates, chat, AsyncAPI spec
                                    </td>
                                </tr>
                                <tr>
                                    <td>Resilience demo</td>
                                    <td>
                                        Slow and flaky endpoints to test
                                        retry/timeout
                                    </td>
                                </tr>
                                <tr>
                                    <td>Batching demo</td>
                                    <td>Client request batching in action</td>
                                </tr>
                                <tr>
                                    <td>Discriminated unions</td>
                                    <td>
                                        Todo events
                                        (assigned/commented/completed)
                                    </td>
                                </tr>
                                <tr>
                                    <td>Object mapping</td>
                                    <td>DB rows → API responses via mapper</td>
                                </tr>
                                <tr>
                                    <td>Schema-driven forms</td>
                                    <td>
                                        Create/edit with auto-validation from
                                        schema
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
