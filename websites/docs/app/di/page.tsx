/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function DiPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/di</h1>
                    <p className="subtitle">
                        .NET-style dependency injection for TypeScript —
                        schema-driven service registration, three lifetimes,
                        function injection.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    command="npm install @cleverbrush/di"
                    note={
                        <>
                            Uses <code>@cleverbrush/schema</code> for
                            schema-driven service registration.
                        </>
                    }
                />

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/di?</h2>

                    <h3>The Problem</h3>
                    <p>
                        As applications grow, manually wiring dependencies
                        becomes painful. You end up threading configuration,
                        loggers, and database connections through constructor
                        chains. Lifetimes are managed ad-hoc — some services
                        need to be shared, others need to be fresh per request,
                        and keeping track of when to create and dispose them is
                        error-prone.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/di</code> brings .NET&apos;s proven
                        dependency injection model to TypeScript. Instead of
                        inventing a new token system, it uses{' '}
                        <strong>schema instances as service keys</strong> — the
                        same <code>@cleverbrush/schema</code> objects that
                        describe your data also identify your services. Register
                        with a lifetime, build a provider, and resolve — fully
                        typed, no decorators, no magic strings.
                    </p>

                    <h3>Three Lifetimes</h3>
                    <ul>
                        <li>
                            <strong>Singleton</strong> — one instance for the
                            entire application lifetime. Created on first
                            resolution, reused from then on.
                        </li>
                        <li>
                            <strong>Scoped</strong> — one instance per scope
                            (e.g. per HTTP request). Ideal for database
                            connections and unit-of-work patterns.
                        </li>
                        <li>
                            <strong>Transient</strong> — a fresh instance on
                            every resolution. Use for lightweight, stateless
                            services.
                        </li>
                    </ul>

                    <h3>Function Injection</h3>
                    <p>
                        Use <code>FunctionSchemaBuilder</code> to describe a
                        function&apos;s dependencies as parameter schemas. The
                        container resolves each parameter and calls your
                        implementation with the resolved values — fully typed
                        via <code>InferType</code>.
                    </p>

                    <h3>Automatic Disposal</h3>
                    <p>
                        Scoped services that implement{' '}
                        <code>Symbol.dispose</code> or{' '}
                        <code>Symbol.asyncDispose</code> are automatically
                        cleaned up when the scope exits. Works with the{' '}
                        <code>using</code> keyword for zero-boilerplate resource
                        management.
                    </p>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <div className="card">
                    <h2>Quick Start</h2>
                    <p>
                        Schemas are immutable — they work as safe, typed DI
                        keys. Use <code>.hasType()</code> to brand a schema with
                        a real class type for full autocomplete:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { ServiceCollection } from '@cleverbrush/di';
import { object, string, number } from '@cleverbrush/schema';
import { Logger } from './Logger';
import { AppConfig } from './AppConfig';

// Schema instances as service keys — .hasType() gives real class typing
const ILogger = object().hasType<typeof Logger>();
const IConfig = object({ port: number(), host: string() });

const services = new ServiceCollection();
services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
services.addSingleton(ILogger, () => new Logger());

const provider = services.buildServiceProvider();
const config = provider.get(IConfig); // typed: { port: number, host: string }
const logger = provider.get(ILogger); // typed: Logger`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── DI with Endpoint Handlers ───────────────────── */}
                <div className="card">
                    <h2>DI with Endpoint Handlers</h2>
                    <p>
                        The real power of <code>@cleverbrush/di</code> shows
                        when paired with <code>@cleverbrush/server</code>. Use{' '}
                        <code>.inject()</code> on an endpoint to declare
                        services — they are resolved per request and passed as
                        the second handler argument:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { endpoint, createServer } from '@cleverbrush/server';
import { object, number } from '@cleverbrush/schema';
import { UserRepository } from './UserRepository';
import { EmailService } from './EmailService';

// Schema keys branded with real types
const IUserRepo = object().hasType<typeof UserRepository>();
const IEmailSvc = object().hasType<typeof EmailService>();

const GetUser = endpoint
    .get('/api/users')
    .query(object({ id: number().coerce() }))
    .inject({ repo: IUserRepo });

const CreateUser = endpoint
    .post('/api/users')
    .body(object({ name: string(), email: string() }))
    .inject({ repo: IUserRepo, email: IEmailSvc });

const server = createServer();

server
    .services(svc => {
        svc.addSingleton(IUserRepo, () => new UserRepository());
        svc.addSingleton(IEmailSvc, () => new EmailService());
    })
    .handle(GetUser, ({ query }, { repo }) => {
        // repo is typed as UserRepository
        return repo.findById(query.id);
    })
    .handle(CreateUser, async ({ body }, { repo, email }) => {
        // repo: UserRepository, email: EmailService
        const user = await repo.create(body);
        await email.sendWelcome(user.email);
        return user;
    });`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Scoped Services ──────────────────────────────── */}
                <div className="card">
                    <h2>Scoped Services — Per-Request Lifecycle</h2>
                    <p>
                        Register services as <strong>scoped</strong> to get a
                        fresh instance per HTTP request. The server creates a
                        scope automatically for each request and disposes it
                        when the response is sent:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object } from '@cleverbrush/schema';
import { DbContext } from './DbContext';

const IDbContext = object().hasType<typeof DbContext>();

server
    .services(svc => {
        // Fresh connection per request, disposed on response
        svc.addScoped(IDbContext, () => {
            const db = new DbContext();
            return Object.assign(db, {
                [Symbol.asyncDispose]: () => db.close()
            });
        });
    })
    .handle(
        endpoint
            .post('/api/orders')
            .body(OrderSchema)
            .inject({ db: IDbContext }),
        async ({ body }, { db }) => {
            // db is a fresh DbContext for this request
            return db.orders.create(body);
        }
    );`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Three Lifetimes ─────────────────────────────── */}
                <div className="card">
                    <h2>Three Lifetimes</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const services = new ServiceCollection();

// Singleton — one instance for the entire app
services.addSingleton(IConfig, { port: 3000, host: 'localhost' });

// Scoped — one instance per scope (per HTTP request)
services.addScoped(IDbContext, () => new DbContext());

// Transient — fresh instance on every resolution
services.addTransient(IRequestId, () => ({ id: crypto.randomUUID() }));`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Function Injection ───────────────────────────── */}
                <div className="card">
                    <h2>Function Injection</h2>
                    <p>
                        Describe a function&apos;s dependencies using{' '}
                        <code>FunctionSchemaBuilder</code>. The container
                        resolves each parameter schema and calls your
                        implementation:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { func } from '@cleverbrush/schema';

const handler = func()
    .addParameter(ILogger)
    .addParameter(IConfig)
    .hasReturnType(string());

// All parameters are resolved from the container
const result = provider.invoke(handler, (logger, config) => {
    logger.info(\`Running on port \${config.port}\`);
    return 'ok';
});
// result is typed as string`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}
