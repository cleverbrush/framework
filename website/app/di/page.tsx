/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@/app/InstallBanner';
import { highlightTS } from '@/lib/highlight';

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
                            Requires <code>@cleverbrush/schema</code> as a peer
                            dependency.
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
                        Define service contracts as schemas, register
                        implementations, build a provider, and resolve:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { ServiceCollection } from '@cleverbrush/di';
import { object, string, number, func } from '@cleverbrush/schema';

// Define service contracts as schemas
const IConfig = object({ port: number(), host: string() });
const ILogger = object({ info: func().addParameter(string()) });

// Register services
const services = new ServiceCollection();
services.addSingleton(IConfig, { port: 3000, host: 'localhost' });
services.addSingleton(ILogger, () => ({
    info: (msg: string) => console.log(msg)
}));

// Build the provider
const provider = services.buildServiceProvider();

// Resolve — fully typed, no explicit generics needed
const config = provider.get(IConfig);
console.log(config.port); // number
console.log(config.host); // string`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Scoped Services ──────────────────────────────── */}
                <div className="card">
                    <h2>Scoped Services</h2>
                    <p>
                        Create a scope per unit of work (e.g. an HTTP request).
                        Scoped services are cached within the scope and disposed
                        when it exits:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const IDbContext = object({
    query: func().addParameter(string())
});

services.addScoped(IDbContext, () => {
    const conn = createConnection();
    return {
        query: (sql: string) => conn.execute(sql),
        [Symbol.asyncDispose]: () => conn.close()
    };
});

const provider = services.buildServiceProvider();

// Per-request scope — db is disposed when scope exits
await using scope = provider.createScope();
const db = scope.serviceProvider.get(IDbContext);
await db.query('SELECT 1');`)
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

                {/* ── Schema-Driven Factories ──────────────────────── */}
                <div className="card">
                    <h2>Schema-Driven Factories</h2>
                    <p>
                        Register services whose factory dependencies are
                        described by a <code>FunctionSchemaBuilder</code>. The
                        container resolves the factory&apos;s parameters
                        automatically:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const IGreeter = object({
    greet: func().hasReturnType(string())
});

// Describe the factory's dependencies
const greeterDeps = func()
    .addParameter(IConfig)
    .addParameter(ILogger);

// Register — config and logger are auto-resolved
services.addSingletonFromSchema(
    IGreeter,
    greeterDeps,
    (config, logger) => ({
        greet() {
            logger.info(\`Hello from \${config.host}\`);
            return \`Hello from \${config.host}:\${config.port}\`;
        }
    })
);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Circular Detection ───────────────────────────── */}
                <div className="card">
                    <h2>Circular Dependency Detection</h2>
                    <p>
                        The container detects circular dependencies at
                        resolution time and throws a descriptive error showing
                        the full dependency chain:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const IA = object({ value: string() });
const IB = object({ value: string() });

services.addSingleton(IA, (p) => {
    p.get(IB); // IB depends on IA → cycle!
    return { value: 'a' };
});
services.addSingleton(IB, (p) => {
    p.get(IA);
    return { value: 'b' };
});

provider.get(IA);
// Error: Circular dependency detected: object → object`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}
