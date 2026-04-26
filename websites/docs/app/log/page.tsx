/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function LogPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/log</h1>
                    <p className="subtitle">
                        Enterprise structured logging for TypeScript —
                        Serilog-style message templates, CLEF format, batching
                        sinks, correlation tracking.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    command="npm install @cleverbrush/log"
                    note={
                        <>
                            Optional peer dependencies:{' '}
                            <code>@cleverbrush/di</code> for DI integration,{' '}
                            <code>@cleverbrush/server</code> for HTTP
                            middleware.
                        </>
                    }
                />

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/log?</h2>

                    <h3>The Problem</h3>
                    <p>
                        Most Node.js loggers produce unstructured text that is
                        painful to query. <code>console.log</code> and basic
                        loggers lose context across async boundaries, and
                        correlating requests through a distributed system
                        requires custom plumbing.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/log</code> brings .NET&apos;s Serilog
                        model to TypeScript: <strong>message templates</strong>{' '}
                        that preserve named properties, automatic{' '}
                        <strong>CLEF formatting</strong> for machine-readable
                        output, <strong>batching sinks</strong> with retry and
                        circuit breaking, and{' '}
                        <strong>ambient correlation IDs</strong> via{' '}
                        <code>AsyncLocalStorage</code>.
                    </p>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <h2>🚀 Quick Start</h2>

                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { createLogger, consoleSink } from '@cleverbrush/log';

const logger = createLogger({
    minimumLevel: 'information',
    sinks: [consoleSink({ theme: 'dark' })],
    enrichers: ['hostname', 'processId'],
});

logger.info('Server started on port {Port}', { Port: 3000 });
logger.error(new Error('oops'), 'Request failed for {UserId}', { UserId: 42 });

// Graceful shutdown
await logger.dispose();`)
                        }}
                    />
                </pre>

                {/* ── Message Templates ────────────────────────────── */}
                <h2>📝 Message Templates</h2>
                <p>
                    Properties in <code>{'{braces}'}</code> are captured as
                    structured data <em>and</em> rendered into the message. Use{' '}
                    <code>{'@'}</code> to destructure objects.
                </p>

                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// Named properties — queryable in Seq/ClickHouse
logger.info('Order {OrderId} placed by {UserId}', { OrderId: 123, UserId: 'u-42' });

// Destructure with @
logger.info('Config loaded: {@Config}', { Config: { port: 3000, env: 'prod' } });`)
                        }}
                    />
                </pre>

                {/* ── Sinks ────────────────────────────────────────── */}
                <h2>🔌 Sinks</h2>
                <ul>
                    <li>
                        <strong>consoleSink</strong> — Pretty or JSON/CLEF
                        output with configurable themes
                    </li>
                    <li>
                        <strong>FileSink</strong> — CLEF files with size/time
                        rotation
                    </li>
                    <li>
                        <strong>SeqSink</strong> — Ships to Seq with dynamic
                        level control
                    </li>
                    <li>
                        <strong>ClickHouseSink</strong> — Batch insert to
                        ClickHouse (separate entrypoint)
                    </li>
                    <li>
                        <strong>createSink</strong> — Build a custom sink from a
                        simple function
                    </li>
                </ul>

                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { createLogger, consoleSink, SeqSink, FileSink } from '@cleverbrush/log';

const logger = createLogger({
    minimumLevel: 'debug',
    sinks: [
        consoleSink({ theme: 'dark', minimumLevel: 'information' }),
        new SeqSink({ serverUrl: 'http://localhost:5341' }),
        new FileSink({ path: './logs/app.clef', rotationPolicy: 'size', maxFileSize: 10_000_000 }),
    ],
});`)
                        }}
                    />
                </pre>

                {/* ── Typed Templates ─────────────────────────────── */}
                <h2>🔷 Typed Templates</h2>
                <p>
                    Pass a <code>ParseStringSchemaBuilder</code> (from{' '}
                    <code>@cleverbrush/schema</code>) directly to any log
                    method. TypeScript enforces the parameter types at the call
                    site, and the logger uses the raw{' '}
                    <code>{'{Property}'}</code> pattern as{' '}
                    <code>messageTemplate</code> so all events of the same shape
                    are <strong>grouped</strong> in Seq, ClickStack, ClickHouse,
                    etc.
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { s } from '@cleverbrush/schema';
import { createLogger, consoleSink } from '@cleverbrush/log';

// Define once — compile-time checked parameter types
const TodoCreated = s.parseString('Todo #{TodoId} "{Title}" created by {UserId}');

const logger = createLogger({ sinks: [consoleSink()] });

// TypeScript enforces { TodoId, Title, UserId }
logger.info(TodoCreated, { TodoId: 1, Title: 'Buy milk', UserId: 'u-42' });
// messageTemplate → 'Todo #{TodoId} "{Title}" created by {UserId}'
// renderedMessage → 'Todo #1 "Buy milk" created by u-42'`)
                        }}
                    />
                </pre>

                {/* ── Correlation & Middleware ─────────────────────── */}
                <h2>🔗 Correlation & Middleware</h2>

                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { useLogging, createLogger, consoleSink } from '@cleverbrush/log';

const logger = createLogger({
    minimumLevel: 'information',
    sinks: [consoleSink()],
    enrichers: ['correlationId'],
});

// Returns [correlationIdMiddleware, requestLoggingMiddleware]
const [correlationId, requestLogging] = useLogging(logger, {
    excludePaths: ['/health'],
    // Set to false when @cleverbrush/otel's tracingMiddleware already
    // sets a traceparent header — avoids a redundant second ID header
    correlationResponseHeader: false,
});

// Add to your @cleverbrush/server pipeline
// Every request gets a unique correlation ID, logged on completion`)
                        }}
                    />
                </pre>

                {/* ── DI Integration ──────────────────────────────── */}
                <h2>🧩 DI Integration</h2>

                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { ServiceCollection } from '@cleverbrush/di';
import { configureLogging, ILogger, consoleSink } from '@cleverbrush/log';

const services = new ServiceCollection();
configureLogging(services, logger);

const provider = services.buildServiceProvider();
const logger = provider.getService(ILogger);
logger.info('Resolved from DI');`)
                        }}
                    />
                </pre>
            </div>
        </div>
    );
}
