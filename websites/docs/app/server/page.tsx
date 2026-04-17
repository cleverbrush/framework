/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function ServerPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/server</h1>
                    <p className="subtitle">
                        Schema-first HTTP server for Node.js — typed endpoints,
                        content negotiation, DI integration, and auth wiring out
                        of the box.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    command="npm install @cleverbrush/server @cleverbrush/schema"
                    note={
                        <>
                            Pair with <code>@cleverbrush/di</code> for
                            dependency injection and{' '}
                            <code>@cleverbrush/auth</code> for authentication.
                        </>
                    }
                />

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/server?</h2>

                    <h3>The Problem</h3>
                    <p>
                        Most Node.js frameworks leave request validation,
                        dependency injection, and authentication as separate
                        concerns that you wire together yourself. The result is
                        boilerplate: parse the body, validate it, inject
                        services, check auth — before the handler even runs.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/server</code> integrates{' '}
                        <strong>schema validation</strong>, <strong>DI</strong>,
                        and <strong>authentication</strong> into a single fluent
                        endpoint builder. You declare what an endpoint expects
                        and the framework handles the rest — fully typed, no
                        decorators, no magic strings.
                    </p>

                    <h3>Key Features</h3>
                    <ul>
                        <li>
                            <strong>Fluent endpoint builder</strong> —{' '}
                            <code>.body()</code>, <code>.query()</code>,{' '}
                            <code>.headers()</code>, <code>.inject()</code>,{' '}
                            <code>.authorize()</code>: all type-safe.
                        </li>
                        <li>
                            <strong>Action results</strong> —{' '}
                            <code>ActionResult.ok()</code>,{' '}
                            <code>.created()</code>, <code>.file()</code>,{' '}
                            <code>.stream()</code>: no manual{' '}
                            <code>res.end()</code>.
                        </li>
                        <li>
                            <strong>Content negotiation</strong> — honours the{' '}
                            <code>Accept</code> header; pluggable handlers.
                        </li>
                        <li>
                            <strong>RFC 9457 Problem Details</strong> —
                            validation errors and HTTP errors become structured
                            JSON automatically.
                        </li>
                        <li>
                            <strong>OpenAPI-ready</strong> —{' '}
                            <code>getRegistrations()</code> feeds{' '}
                            <code>@cleverbrush/server-openapi</code> for spec
                            generation.
                        </li>
                    </ul>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <div className="card">
                    <h2>Quick Start</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { ServerBuilder, endpoint, ActionResult } from '@cleverbrush/server';
import { object, string, number } from '@cleverbrush/schema';

const CreateUserBody = object({ name: string(), age: number() });

const createUser = endpoint
    .post('/api/users')
    .body(CreateUserBody);

const server = new ServerBuilder();

server.handle(createUser, ({ body }) => {
    // body is typed: { name: string; age: number }
    return ActionResult.created({ id: 1, ...body }, '/api/users/1');
});

await server.listen(3000);
console.log('Listening on http://localhost:3000');`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Defining Endpoints ───────────────────────────── */}
                <div className="card">
                    <h2>Defining Endpoints</h2>
                    <p>
                        Use the <code>endpoint</code> singleton to start a
                        builder chain. Chain <code>.body()</code>,{' '}
                        <code>.query()</code>, <code>.headers()</code>, and{' '}
                        <code>.authorize()</code> to build a fully typed handler
                        context:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { endpoint } from '@cleverbrush/server';
import { object, string, number } from '@cleverbrush/schema';

const UserPrincipal = object({ sub: string(), role: string() });

const GetUser = endpoint
    .get('/api/users')
    .query(object({ id: number().coerce() }))
    .authorize(UserPrincipal, 'admin')
    .returns(object({ id: number(), name: string() }))
    .summary('Get a user by ID')
    .tags('users');

server.handle(GetUser, ({ query, principal }) => {
    // query.id   → number (coerced from URL string)
    // principal  → { sub: string; role: string }
    return { id: query.id, name: 'Alice' };
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Route Helper ─────────────────────────────────── */}
                <div className="card">
                    <h2>Type-Safe Path Parameters</h2>
                    <p>
                        Use the <code>route()</code> helper to define path
                        parameters using <code>@cleverbrush/schema</code> types.
                        Parameters are parsed and validated before the handler
                        runs:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { endpoint, route } from '@cleverbrush/server';
import { object, number } from '@cleverbrush/schema';

const GetUser = endpoint.get(
    route(object({ id: number().coerce() }), $t => $t\`/api/users/\${t => t.id}\`)
);

server.handle(GetUser, ({ params }) => {
    params.id; // number — already coerced from the URL segment
    return { id: params.id };
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Action Results ───────────────────────────────── */}
                <div className="card">
                    <h2>Action Results</h2>
                    <p>
                        Return an <code>ActionResult</code> from any handler for
                        full control over status codes, headers, and body
                        serialization:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { ActionResult } from '@cleverbrush/server';

// 200 with content negotiation
return ActionResult.ok(user);

// 201 Created with Location header
return ActionResult.created(user, '/api/users/42');

// 204 No Content
return ActionResult.noContent();

// 302 Redirect
return ActionResult.redirect('/login');

// File download
return ActionResult.file(pdfBuffer, 'report.pdf', 'application/pdf');

// Bare status code
return ActionResult.status(202);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── HTTP Errors ──────────────────────────────────── */}
                <div className="card">
                    <h2>HTTP Errors</h2>
                    <p>
                        Throw any <code>HttpError</code> subclass from a
                        handler. The server automatically serializes it as an
                        RFC 9457 Problem Details response:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import {
    NotFoundError,
    BadRequestError,
    ForbiddenError,
    ConflictError
} from '@cleverbrush/server';

server.handle(GetUser, ({ params }) => {
    const user = db.find(params.id);
    if (!user) throw new NotFoundError(\`User \${params.id} not found\`);
    return user;
});

// Response: 404 application/problem+json
// { "type": "https://httpstatuses.com/404", "status": 404, "title": "Not Found", "detail": "User 99 not found" }`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Middleware ───────────────────────────────────── */}
                <div className="card">
                    <h2>Middleware</h2>
                    <p>
                        Add global middleware with <code>server.use()</code> or
                        per-endpoint middleware via the third argument to{' '}
                        <code>handle()</code>:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import type { Middleware } from '@cleverbrush/server';

const logger: Middleware = async (ctx, next) => {
    const start = Date.now();
    await next();
    console.log(\`\${ctx.method} \${ctx.url.pathname} \${Date.now() - start}ms\`);
};

server.use(logger);

// Per-endpoint
server.handle(AdminEp, handler, { middlewares: [rateLimiter] });`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── DI Integration ───────────────────────────────── */}
                <div className="card">
                    <h2>Dependency Injection</h2>
                    <p>
                        Use <code>.inject()</code> to declare per-request
                        services. They are resolved from the{' '}
                        <code>@cleverbrush/di</code> container and passed as the
                        second handler argument:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { ServiceCollection } from '@cleverbrush/di';
import { object, func } from '@cleverbrush/schema';

const IUserRepo = object({ findById: func() });

const GetUser = endpoint
    .get('/api/users')
    .query(object({ id: number().coerce() }))
    .inject({ repo: IUserRepo });

server
    .services(svc => svc.addSingleton(IUserRepo, () => new UserRepository()))
    .handle(GetUser, ({ query }, { repo }) => {
        // repo is fully typed: { findById: Function }
        return repo.findById(query.id);
    });`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Auth ─────────────────────────────────────────── */}
                <div className="card">
                    <h2>Authentication &amp; Authorization</h2>
                    <p>
                        Wire <code>@cleverbrush/auth</code> schemes and policies
                        through <code>useAuthentication()</code> and{' '}
                        <code>useAuthorization()</code>:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { jwtScheme } from '@cleverbrush/auth';

server
    .useAuthentication({
        defaultScheme: 'jwt',
        schemes: [
            jwtScheme({
                secret: process.env.JWT_SECRET!,
                mapClaims: claims => ({
                    sub: claims.sub as string,
                    role: claims.role as string
                })
            })
        ]
    })
    .useAuthorization();

// Protect an endpoint
const AdminEp = endpoint
    .delete('/api/users/:id')
    .authorize(UserPrincipal, 'admin');`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── WebSocket Subscriptions ──────────────────────── */}
                <div className="card">
                    <h2>WebSocket Subscriptions</h2>
                    <p>
                        Define real-time endpoints with{' '}
                        <code>endpoint.subscription()</code>. Handlers are async
                        generators — yield events to push them to the client,
                        and consume the <code>incoming</code> iterable for
                        bidirectional messaging.
                    </p>

                    <h3>Contract</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { endpoint, defineApi } from '@cleverbrush/server/contract';
import { object, string, number } from '@cleverbrush/schema';

export const api = defineApi({
    live: {
        // Server-push only
        events: endpoint
            .subscription('/ws/events')
            .outgoing(object({ action: string(), id: number() })),

        // Bidirectional
        chat: endpoint
            .subscription('/ws/chat')
            .incoming(object({ text: string() }))
            .outgoing(object({ user: string(), text: string(), ts: number() })),
    },
});`)
                            }}
                        />
                    </pre>

                    <h3>Handler — Server Push</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import type { SubscriptionHandler } from '@cleverbrush/server';

const eventsHandler: SubscriptionHandler<typeof EventsSubscription> =
    async function* ({ context, signal }) {
        while (!signal.aborted) {
            yield { action: 'heartbeat', id: Date.now() };
            await new Promise(r => setTimeout(r, 2000));
        }
    };`)
                            }}
                        />
                    </pre>

                    <h3>Handler — Bidirectional</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const chatHandler: SubscriptionHandler<typeof ChatSubscription> =
    async function* ({ incoming }) {
        for await (const msg of incoming) {
            // Echo back with server timestamp
            yield { user: 'server', text: msg.text, ts: Date.now() };
        }
    };`)
                            }}
                        />
                    </pre>

                    <h3>Tracked Events</h3>
                    <p>
                        Wrap events with <code>tracked(id, data)</code> to
                        include a correlation ID for client-side
                        acknowledgement:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { tracked } from '@cleverbrush/server';

async function* handler({ signal }) {
    yield tracked('evt-001', { action: 'created', id: 1 });
    yield tracked('evt-002', { action: 'updated', id: 2 });
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── AsyncAPI Documentation ──────────────────────── */}
                <div className="card">
                    <h2>AsyncAPI Documentation</h2>
                    <p>
                        Generate an <strong>AsyncAPI 3.0</strong> document from
                        your WebSocket subscription registrations — no
                        annotations required. Use <code>serveAsyncApi()</code>{' '}
                        from <code>@cleverbrush/server-openapi</code> to serve
                        it as middleware alongside your OpenAPI spec.
                    </p>

                    <h3>Serving the spec</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { serveAsyncApi } from '@cleverbrush/server-openapi';

server
    .use(serveAsyncApi({
        server,
        info: { title: 'My API', version: '1.0.0' },
        servers: {
            production: { host: 'api.example.com', protocol: 'wss' },
        },
    }))
    .handle(/* ... */);

// GET /asyncapi.json → AsyncAPI 3.0 document`)
                            }}
                        />
                    </pre>

                    <h3>Custom path &amp; programmatic use</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { generateAsyncApiSpec } from '@cleverbrush/server-openapi';

// Serve at a custom path
server.use(serveAsyncApi({
    server,
    info: { title: 'My API', version: '1.0.0' },
    path: '/docs/asyncapi.json',
}));

// Or generate programmatically (e.g. write to file):
const spec = generateAsyncApiSpec({
    subscriptions: server.getSubscriptionRegistrations(),
    info: { title: 'My API', version: '1.0.0' },
});
await fs.writeFile('asyncapi.json', JSON.stringify(spec, null, 2));`)
                            }}
                        />
                    </pre>

                    <p>
                        Each subscription is emitted as a{' '}
                        <strong>channel</strong> with its address, and one or
                        two <strong>operations</strong>: a <code>send</code>{' '}
                        operation for server→client events and a{' '}
                        <code>receive</code> operation for client→server
                        messages. Named schemas (set via{' '}
                        <code>.schemaName()</code>) are automatically collected
                        into <code>components.schemas</code> with{' '}
                        <code>$ref</code> pointers.
                    </p>
                </div>
            </div>
        </div>
    );
}
