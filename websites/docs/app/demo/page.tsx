import Link from 'next/link';

export const metadata = {
    title: 'Demo App — Cleverbrush',
    description:
        'Run a production-style full-stack Todo app built entirely with the Cleverbrush framework — backend, frontend, auth, ORM, OpenAPI, tracing, and more.'
};

export default function DemoPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Demo App</h1>
                    <p className="subtitle">
                        A production-style full-stack Todo application that uses
                        every major part of the Cleverbrush framework — from
                        schema-first REST endpoints and typed client to auth,
                        ORM, OpenAPI, OpenTelemetry tracing, and schema-driven
                        React forms. All services run as Docker containers so
                        you can explore the live app, inspect traces in SigNoz,
                        and browse the database in pgAdmin straight away.
                    </p>
                </div>

                {/* ── Docker Compose setup ─────────────────────────── */}
                <div className="card">
                    <h2>Running the demo</h2>
                    <p>
                        The entire stack — backend, frontend, Postgres, Swagger
                        UI, pgAdmin, OpenTelemetry Collector, ClickHouse, and
                        SigNoz — runs via Docker Compose. Requires Docker.
                    </p>
                    <pre>
                        <code>{`git clone https://github.com/cleverbrush/framework.git
cd framework
docker compose -f demos/docker-compose.yml up`}</code>
                    </pre>
                    <p>
                        On first boot the database migrator, SigNoz provisioner,
                        and ClickHouse init containers run automatically — allow
                        30–60 seconds for everything to become healthy before
                        opening the URLs below.
                    </p>
                </div>

                {/* ── OTel / SigNoz callout ────────────────────────── */}
                <div className="card">
                    <h2>OpenTelemetry instrumentation</h2>
                    <p>
                        The backend is instrumented with{' '}
                        <code>@cleverbrush/otel</code>. Every HTTP request,
                        database query, and background job produces a span that
                        is exported to the bundled{' '}
                        <strong>OpenTelemetry Collector</strong> (OTLP gRPC on
                        port 4317) and stored in{' '}
                        <strong>SigNoz + ClickHouse</strong>. Structured log
                        lines from <code>@cleverbrush/log</code> are forwarded
                        to the same pipeline so traces and logs are correlated
                        by <code>trace_id</code>.
                    </p>
                    <p>
                        Open <strong>SigNoz</strong> at{' '}
                        <code>http://localhost:8082</code> to explore:
                    </p>
                    <ul>
                        <li>
                            <strong>Traces</strong> — end-to-end request
                            waterfalls including DB queries and outbound calls
                        </li>
                        <li>
                            <strong>Logs</strong> — structured log stream with
                            trace correlation
                        </li>
                        <li>
                            <strong>Dashboards</strong> — pre-provisioned HTTP
                            traffic, DB calls, and Node.js runtime metrics
                            dashboards
                        </li>
                    </ul>
                    <p>
                        Login: <code>admin@todo.local.com</code> /{' '}
                        <code>Admin1234!</code>
                    </p>
                </div>

                {/* ── Services ────────────────────────────────────── */}
                <div className="card">
                    <h2>Services &amp; URLs</h2>
                    <p>
                        Once the stack is running, these services are available
                        on <code>localhost</code>:
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Service</th>
                                    <th>URL</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <strong>Frontend app</strong>
                                    </td>
                                    <td>
                                        <code>http://localhost:5173</code>
                                    </td>
                                    <td>
                                        React + Vite — register an account and
                                        try all the features
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Backend API</strong>
                                    </td>
                                    <td>
                                        <code>http://localhost:3000</code>
                                    </td>
                                    <td>
                                        Health check at <code>/health</code>,
                                        OpenAPI spec at{' '}
                                        <code>/openapi.json</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Swagger UI</strong>
                                    </td>
                                    <td>
                                        <code>http://localhost:8090</code>
                                    </td>
                                    <td>
                                        Interactive API explorer — try every
                                        endpoint directly from the browser
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>pgAdmin</strong>
                                    </td>
                                    <td>
                                        <code>http://localhost:8110</code>
                                    </td>
                                    <td>
                                        Postgres GUI — login{' '}
                                        <code>admin@todo.local.com</code> /{' '}
                                        <code>admin</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>SigNoz</strong>
                                    </td>
                                    <td>
                                        <code>http://localhost:8082</code>
                                    </td>
                                    <td>
                                        Traces, logs, and pre-built dashboards —
                                        login <code>admin@todo.local.com</code>{' '}
                                        / <code>Admin1234!</code>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── What the demo covers ─────────────────────────── */}
                <div className="card">
                    <h2>What the demo covers</h2>
                    <p>
                        The Todo app is intentionally comprehensive — it is
                        designed to show how the framework pieces fit together
                        in a real codebase, not as a toy.
                    </p>

                    <h3>Framework packages in use</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Package</th>
                                    <th>Demonstrated by</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/server</code>
                                    </td>
                                    <td>
                                        30+ REST endpoints, middleware chain,
                                        request batching, health check, RFC 9457
                                        error responses
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/schema</code>
                                    </td>
                                    <td>
                                        Shared contract used on both server and
                                        client — body, query, header, and
                                        response schemas
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/client</code>
                                    </td>
                                    <td>
                                        Type-safe frontend client with retry,
                                        timeout, deduplication, throttling
                                        cache, and request batching
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/auth</code>
                                    </td>
                                    <td>
                                        JWT authentication, Google OAuth login,
                                        role-based authorization (user / admin)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/di</code>
                                    </td>
                                    <td>
                                        Dependency injection container wiring
                                        database, config, and services
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/server-openapi</code>
                                    </td>
                                    <td>
                                        Auto-generated OpenAPI 3.1 spec with
                                        tags, webhooks, and security schemes
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/orm</code> +{' '}
                                        <code>@cleverbrush/orm-cli</code>
                                    </td>
                                    <td>
                                        Knex-based ORM with schema-driven
                                        queries and migration management
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/otel</code>
                                    </td>
                                    <td>
                                        OpenTelemetry tracing and metrics
                                        exported to SigNoz via OTLP
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/log</code>
                                    </td>
                                    <td>
                                        Structured logging with console, file,
                                        and OTLP sinks; template-based log
                                        messages
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/react-form</code>
                                    </td>
                                    <td>
                                        Schema-driven form fields with
                                        auto-validation — no manual rules
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/env</code>
                                    </td>
                                    <td>
                                        Typed environment variable parsing at
                                        startup with schema validation
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>@cleverbrush/mapper</code>
                                    </td>
                                    <td>
                                        Object mapping between database rows and
                                        API response shapes
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>API features you can explore</h3>
                    <ul>
                        <li>
                            Full CRUD for todos — create, list (with
                            pagination), update, delete, mark complete
                        </li>
                        <li>
                            Idempotency key header demo (
                            <code>X-Idempotency-Key</code>,{' '}
                            <code>If-Match</code>)
                        </li>
                        <li>
                            CSV export and bulk import (sync 207 / async 202)
                        </li>
                        <li>Binary file attachment download</li>
                        <li>
                            Real-time activity feed via typed WebSocket
                            subscriptions
                        </li>
                        <li>
                            Webhook subscriptions for <code>todo.created</code>{' '}
                            / <code>todo.completed</code>
                        </li>
                        <li>
                            Admin endpoints (user list, delete, raw activity
                            stream)
                        </li>
                        <li>
                            Resilience demo endpoints — slow responses, flaky
                            retries, SQL crash, runtime crash
                        </li>
                    </ul>
                </div>

                {/* ── View source ─────────────────────────────────── */}
                <div className="card">
                    <h2>View source</h2>
                    <p>
                        The entire demo lives in the <code>demos/</code>{' '}
                        directory of the monorepo. Browse it on GitHub to see
                        exactly how each framework package is wired together:
                    </p>
                    <div
                        className="contribute-actions"
                        style={{ marginTop: '1rem' }}
                    >
                        <a
                            href="https://github.com/cleverbrush/framework/tree/master/demos/todo-backend"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hero-btn hero-btn-primary"
                        >
                            Browse backend source →
                        </a>
                        <a
                            href="https://github.com/cleverbrush/framework/tree/master/demos/todo-frontend"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hero-btn hero-btn-secondary"
                        >
                            Browse frontend source →
                        </a>
                    </div>
                    <p style={{ marginTop: '1.5rem' }}>
                        For code patterns and architecture decisions, see the{' '}
                        <Link href="/examples">Examples</Link> page.
                    </p>
                </div>
            </div>
        </div>
    );
}
