# @cleverbrush/otel
<!-- coverage-badge-start -->
![Unit coverage](https://img.shields.io/badge/unit_coverage-89%25-green)
<!-- coverage-badge-end -->

OpenTelemetry instrumentation for the Cleverbrush framework — traces, logs, and metrics over OTLP for `@cleverbrush/server`, `@cleverbrush/orm`, and `@cleverbrush/log`. Designed to ship straight into SigNoz, Grafana Tempo, Jaeger, or any OTLP-compatible backend.

## Install

```bash
npm install @cleverbrush/otel @opentelemetry/api
# Optional auto-instrumentations (only if you want them):
npm install @opentelemetry/instrumentation-http@^0.222.0 \
            @opentelemetry/instrumentation-undici@^0.25.0 \
            @opentelemetry/instrumentation-runtime-node@^0.28.0
```

## Quick Start

### 1. Bootstrap the SDK (must run before anything else)

```ts
// telemetry.ts — load FIRST
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
});
```

Run with:

```bash
node --import ./dist/telemetry.js dist/index.js
```

Don't forget to await `otel.shutdown()` on `SIGTERM` / `SIGINT` so batched data flushes.

### 2. Trace HTTP requests

```ts
import { tracingMiddleware } from '@cleverbrush/otel';
import { createServer } from '@cleverbrush/server';

const server = createServer()
    .useRequest(tracingMiddleware({ excludePaths: ['/health'] })) // first!
    .use(corsMiddleware)
    // ... rest of the chain
```

A `SpanKind.SERVER` span is opened per request, named `operationId` or `METHOD route` and tagged with the standard HTTP semantic-convention attributes. W3C `traceparent` is extracted, so spans link to upstream callers.

`useRequest()` includes CORS, authentication and routing rejections. Spans finish
once on response `finish` or premature `close`, after error serialization and
streaming, and record the final status when headers were sent. The
`cleverbrush.http.outcome` attribute is `success`, `rejected`, `failure`,
`interrupted`, `timeout`, or `cancelled`. Expected 4xx responses are not span
errors. Failures, timeouts and interruptions are errors; deliberate cancellation
is not. A disconnect alone is classified as interrupted.

Route metadata is public at `context.route` after matching. Framework contexts
support full response observation; structural/older contexts lacking
`onResponseCompleted` retain middleware-scoped timing.

### 3. Trace typed client calls between services

```ts
import { createClient } from '@cleverbrush/client';
import { clientTracingMiddleware } from '@cleverbrush/otel/client';

const client = createClient(api, {
    baseUrl: 'http://todo-backend:3000',
    middlewares: [clientTracingMiddleware()]
});
```

`clientTracingMiddleware()` opens a `SpanKind.CLIENT` span around each typed client call and injects W3C `traceparent` / `tracestate` / `baggage` headers. When the downstream Cleverbrush service uses `tracingMiddleware()`, SigNoz and other OTel backends show both services under one distributed trace.

Put the tracing middleware first in the client middleware list so it wraps retries, timeouts, and batching. If you use `batching()`, keep batching last so each logical subrequest carries its own trace context.

### 4. Trace SQL queries

```ts
import { instrumentKnex } from '@cleverbrush/otel';
import knex from 'knex';

const db = instrumentKnex(
    knex({ client: 'pg', connection: '...' })
);
```

Every Knex query becomes a `SpanKind.CLIENT` span with `db.system.name`, `db.namespace`, `db.operation.name`, `db.query.text`, and parented under the active server span automatically.

### 5. Send logs as OTLP records (with trace correlation)

```ts
import { createLogger, consoleSink } from '@cleverbrush/log';
import { otelLogSink, traceEnricher } from '@cleverbrush/otel';

const logger = createLogger({
    minimumLevel: 'information',
    sinks: [consoleSink({ theme: 'dark' }), otelLogSink()],
    enrichers: [traceEnricher()] // attaches TraceId/SpanId to every event
});
```

Use matching Framework 5.2+ log/server packages for these lifecycle and queued-log
guarantees. Log events capture their originating execution context before
asynchronous dispatch. The sink passes that context explicitly to the OTel Logs
API, including sampling flags and baggage. Ended spans retain correlation; events
with no originating span cannot inherit another queued request's span. Enriched
`TraceId`/`SpanId` properties are for display, never trusted context inputs. The
OTel SDK already batches exports; an additional `BatchingSink` is optional.

## API

| Export                            | Purpose                                                   |
| --------------------------------- | --------------------------------------------------------- |
| `setupOtel(config)`               | Boot the Node SDK; returns `{ shutdown(), sdk }`          |
| `tracingMiddleware(opts?)`        | `@cleverbrush/server` middleware; opens SERVER span       |
| `clientTracingMiddleware(opts?)`  | `@cleverbrush/client` middleware; opens CLIENT span       |
| `instrumentKnex(knex, opts?)`     | Hook a Knex instance; emits CLIENT span per query         |
| `otelLogSink(opts?)`              | `@cleverbrush/log` sink → OTLP log records                |
| `traceEnricher()`                 | `@cleverbrush/log` enricher → adds `TraceId` / `SpanId`   |
| `configureOtel(services, opts?)`  | Register `ITracer` / `IMeter` in `@cleverbrush/di`        |
| `outboundHttpInstrumentations(opts?)` | Load HTTP / undici peers with safe diagnostics          |
| `runtimeMetrics(opts?)`           | Load the supported Node runtime metrics peer              |
| `OTEL_SPAN_ITEM_KEY`              | `ctx.items` key under which the request span is stashed   |

All optional auto-instrumentations and `knex` are declared as **optional peer dependencies**, so the package is usable with only `@opentelemetry/api` installed.

## Accessing the Request Span from Handlers

`tracingMiddleware` stores the active server span on `ctx.items` under `OTEL_SPAN_ITEM_KEY`. Use this to attach custom attributes or events from inside endpoint handlers:

```ts
import { OTEL_SPAN_ITEM_KEY } from '@cleverbrush/otel';
import type { Span } from '@opentelemetry/api';

// Inside a @cleverbrush/server endpoint handler
const span = ctx.items.get(OTEL_SPAN_ITEM_KEY) as Span | undefined;
span?.setAttribute('app.user_id', userId);
span?.addEvent('cache.miss', { key: cacheKey });
```

## Configuration

`setupOtel` reads `OTEL_EXPORTER_OTLP_ENDPOINT` from the environment by default (recommended). Per-signal endpoints (`tracesEndpoint` / `logsEndpoint` / `metricsEndpoint`) and signal toggles (`disableTraces`, `disableLogs`, `disableMetrics`) let you wire up split collectors. Headers (e.g. for SaaS tokens) are passed via `headers: { authorization: 'Bearer …' }`.

## Privacy

`exceptionPolicy` defaults to `'omit'` in `instrumentKnex`, server/client tracing,
`withSpan` (callback and disposable forms), and `otelLogSink`. Failures still set
error status and application errors retain their original identity. To allowlist
details, reuse a policy callback returning only safe `name`, `message`, or `stack`
strings. `'raw'` deliberately enables original exception fields. Span status
messages never copy raw exception text. Failing policy callbacks omit details.

```ts
import type { ExceptionPolicy } from '@cleverbrush/otel';

const exceptionPolicy: ExceptionPolicy = () => ({
    name: 'OperationFailure',
    message: 'Operation unavailable'
});

instrumentKnex(db, { recordStatement: false, exceptionPolicy });
const sink = otelLogSink({
    exceptionPolicy,
    sanitizeAttribute: (key, value) => key === 'Password' ? undefined : value,
    sanitizeBody: body => body.replaceAll('private-value', '[redacted]')
});
```

`sanitizeAttribute` covers properties and automatic template/event/exception
attributes. Templated bodies are rendered from redacted properties, then
`sanitizeBody` sees the final text, including literal text. Returning `undefined`
or throwing omits that attribute/body. This sanitizes the OTel sink's output;
other sinks and user-supplied strings need their own privacy policy.

Query strings remain excluded by default (`recordQuery: false`). SQL capture is
independent: use `recordStatement: false` or `sanitizeStatement` when needed.

## Optional instrumentation loading

Both helpers return arrays. A missing/incompatible peer, failed load, invalid
export or failed constructor produces a warning with the package name, expected
range and reason code; it never prints the original loader error. Tolerant mode
keeps other successfully loaded peers. Supply `onDiagnostic` to handle safe
diagnostics yourself, or `strict: true` to throw `InstrumentationLoadError`.

```ts
const instrumentations = runtimeMetrics({
    resolveFrom: import.meta.url, // resolve from this application/workspace
    strict: true
});
```

The supported optional peers are HTTP `^0.222.0`, undici `^0.25.0`, and runtime
Node `^0.28.0`, tested with SDK `2.11.x` / SDK Node `0.222.x` and API `1.9.x`.
Do not select an unsupported instrumentation version solely from SDK/API ranges.
These helpers load instrumentation; actual metric collection still requires a
metrics-enabled SDK and exporter. Runtime metrics receive the SDK's resource
attributes configured through `setupOtel`.

## License

BSD-3-Clause
