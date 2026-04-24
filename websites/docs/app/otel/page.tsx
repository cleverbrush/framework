/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function OtelPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/otel</h1>
                    <p className="subtitle">
                        End-to-end OpenTelemetry instrumentation for the
                        framework — traces, logs, and metrics over OTLP for{' '}
                        <code>@cleverbrush/server</code>,{' '}
                        <code>@cleverbrush/orm</code>, and{' '}
                        <code>@cleverbrush/log</code>.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    command="npm install @cleverbrush/otel @opentelemetry/api"
                    note={
                        <>
                            Optional auto-instrumentations:{' '}
                            <code>@opentelemetry/instrumentation-http</code>,{' '}
                            <code>@opentelemetry/instrumentation-undici</code>,{' '}
                            <code>
                                @opentelemetry/instrumentation-runtime-node
                            </code>
                            .
                        </>
                    }
                />

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/otel?</h2>

                    <h3>The Problem</h3>
                    <p>
                        Wiring OpenTelemetry into a Node.js service involves
                        bootstrapping the SDK before anything else loads,
                        choosing exporters per signal, and finding the right
                        seam to open spans for HTTP requests, database queries,
                        and outbound calls. Doing this consistently across
                        services is repetitive and easy to get wrong.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/otel</code> provides one{' '}
                        <strong>SDK bootstrap</strong> ( <code>setupOtel</code>{' '}
                        ), <strong>middleware</strong> for{' '}
                        <code>@cleverbrush/server</code>, a{' '}
                        <strong>Knex hook</strong> for{' '}
                        <code>@cleverbrush/orm</code>, an{' '}
                        <strong>OTLP log sink</strong> + enricher for{' '}
                        <code>@cleverbrush/log</code>, and DI registration for
                        the active <code>Tracer</code> / <code>Meter</code>. All
                        optional pieces are declared as optional peer
                        dependencies — pull in only what you need.
                    </p>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <h2>🚀 Quick Start</h2>

                <h3>1. Bootstrap the SDK first</h3>
                <p>
                    Create a <code>telemetry.ts</code> module that loads before
                    anything else, then start Node with{' '}
                    <code>--import ./dist/telemetry.js</code>.
                </p>
                <div
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`// telemetry.ts
import { setupOtel } from '@cleverbrush/otel';
import {
    outboundHttpInstrumentations,
    runtimeMetrics
} from '@cleverbrush/otel/instrumentations';

export const otel = setupOtel({
    serviceName: 'todo-backend',
    serviceVersion: '1.0.0',
    environment: process.env.NODE_ENV,
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    instrumentations: [
        ...outboundHttpInstrumentations(),
        ...runtimeMetrics()
    ]
});`)
                    }}
                />

                <h3>2. Trace HTTP requests</h3>
                <div
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { tracingMiddleware } from '@cleverbrush/otel';
import { createServer } from '@cleverbrush/server';

const server = createServer()
    .use(tracingMiddleware({ excludePaths: ['/health'] })) // first!
    .use(corsMiddleware);`)
                    }}
                />
                <p>
                    A <code>SpanKind.SERVER</code> span is opened per request,
                    named from the endpoint metadata (<code>operationId</code>{' '}
                    or <code>METHOD route</code>), and tagged with HTTP
                    semantic-convention attributes. Inbound W3C{' '}
                    <code>traceparent</code> headers are extracted
                    automatically.
                </p>

                <h3>3. Trace SQL queries</h3>
                <div
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { instrumentKnex } from '@cleverbrush/otel';
import knex from 'knex';

const db = instrumentKnex(
    knex({ client: 'pg', connection: '...' })
);`)
                    }}
                />
                <p>
                    Every query becomes a <code>SpanKind.CLIENT</code> span with{' '}
                    <code>db.system.name</code>, <code>db.namespace</code>,{' '}
                    <code>db.operation.name</code>, and{' '}
                    <code>db.query.text</code>, parented under the active server
                    span.
                </p>

                <h3>4. Send logs as OTLP records</h3>
                <div
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { createLogger, consoleSink } from '@cleverbrush/log';
import { otelLogSink, traceEnricher } from '@cleverbrush/otel';

const logger = createLogger({
    minimumLevel: 'information',
    sinks: [consoleSink({ theme: 'dark' }), otelLogSink()],
    enrichers: [traceEnricher()] // attaches TraceId/SpanId
});`)
                    }}
                />

                {/* ── API ──────────────────────────────────────────── */}
                <h2>📚 API</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Export</th>
                            <th>Purpose</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>setupOtel(config)</code>
                            </td>
                            <td>
                                Boot the Node SDK; returns{' '}
                                <code>{'{ shutdown(), sdk }'}</code>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>tracingMiddleware(opts?)</code>
                            </td>
                            <td>
                                <code>@cleverbrush/server</code> middleware;
                                opens <code>SpanKind.SERVER</code> span per
                                request
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>instrumentKnex(knex, opts?)</code>
                            </td>
                            <td>
                                Hook a Knex instance; emits{' '}
                                <code>SpanKind.CLIENT</code> span per query
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>otelLogSink(opts?)</code>
                            </td>
                            <td>
                                <code>@cleverbrush/log</code> sink → OTLP log
                                records (severity, body, attributes, exception
                                info)
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>traceEnricher()</code>
                            </td>
                            <td>
                                Log enricher → adds <code>TraceId</code> /{' '}
                                <code>SpanId</code> / <code>TraceFlags</code>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>configureOtel(services, opts?)</code>
                            </td>
                            <td>
                                Register <code>ITracer</code> /{' '}
                                <code>IMeter</code> in{' '}
                                <code>@cleverbrush/di</code>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>outboundHttpInstrumentations()</code>
                            </td>
                            <td>
                                Lazy-load HTTP / undici client
                                auto-instrumentations
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <code>runtimeMetrics()</code>
                            </td>
                            <td>Lazy-load Node runtime metrics</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Privacy ──────────────────────────────────────── */}
                <h2>🔒 Privacy &amp; Redaction</h2>
                <ul>
                    <li>
                        <code>tracingMiddleware</code> does <strong>not</strong>{' '}
                        record query strings by default (
                        <code>recordQuery: false</code>).
                    </li>
                    <li>
                        <code>instrumentKnex</code> accepts a{' '}
                        <code>sanitizeStatement</code> hook to redact SQL.
                    </li>
                    <li>
                        <code>otelLogSink</code> accepts a{' '}
                        <code>sanitizeAttribute</code> hook to drop or rewrite
                        sensitive fields per event.
                    </li>
                </ul>

                {/* ── Demo ─────────────────────────────────────────── */}
                <h2>🎯 See it in action</h2>
                <p>
                    The <code>todo-backend</code> demo is fully wired and ships
                    traces, logs, and metrics to a HyperDX (ClickStack)
                    container included in <code>demos/docker-compose.yml</code>.
                    Run <code>docker compose up</code> from <code>demos/</code>{' '}
                    and open <code>http://localhost:8080</code> for the HyperDX
                    UI.
                </p>
            </div>
        </div>
    );
}
