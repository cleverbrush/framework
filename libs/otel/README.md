# @cleverbrush/otel

OpenTelemetry instrumentation for the Cleverbrush framework — traces, logs, and metrics over OTLP for `@cleverbrush/server`, `@cleverbrush/orm`, and `@cleverbrush/log`. Designed to ship straight into SigNoz, Grafana Tempo, Jaeger, or any OTLP-compatible backend.

## Install

```bash
npm install @cleverbrush/otel @opentelemetry/api
# Optional auto-instrumentations (only if you want them):
npm install @opentelemetry/instrumentation-http \
            @opentelemetry/instrumentation-undici \
            @opentelemetry/instrumentation-runtime-node
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
    .use(tracingMiddleware({ excludePaths: ['/health'] })) // first!
    .use(corsMiddleware)
    // ... rest of the chain
```

A `SpanKind.SERVER` span is opened per request, named `operationId` or `METHOD route` and tagged with the standard HTTP semantic-convention attributes. W3C `traceparent` is extracted, so spans link to upstream callers.

### 3. Trace SQL queries

```ts
import { instrumentKnex } from '@cleverbrush/otel';
import knex from 'knex';

const db = instrumentKnex(
    knex({ client: 'pg', connection: '...' })
);
```

Every Knex query becomes a `SpanKind.CLIENT` span with `db.system.name`, `db.namespace`, `db.operation.name`, `db.query.text`, and parented under the active server span automatically.

### 4. Send logs as OTLP records (with trace correlation)

```ts
import { createLogger, consoleSink } from '@cleverbrush/log';
import { otelLogSink, traceEnricher } from '@cleverbrush/otel';

const logger = createLogger({
    minimumLevel: 'information',
    sinks: [consoleSink({ theme: 'dark' }), otelLogSink()],
    enrichers: [traceEnricher()] // attaches TraceId/SpanId to every event
});
```

## API

| Export                            | Purpose                                                   |
| --------------------------------- | --------------------------------------------------------- |
| `setupOtel(config)`               | Boot the Node SDK; returns `{ shutdown(), sdk }`          |
| `tracingMiddleware(opts?)`        | `@cleverbrush/server` middleware; opens SERVER span       |
| `instrumentKnex(knex, opts?)`     | Hook a Knex instance; emits CLIENT span per query         |
| `otelLogSink(opts?)`              | `@cleverbrush/log` sink → OTLP log records                |
| `traceEnricher()`                 | `@cleverbrush/log` enricher → adds `TraceId` / `SpanId`   |
| `configureOtel(services, opts?)`  | Register `ITracer` / `IMeter` in `@cleverbrush/di`        |
| `outboundHttpInstrumentations()`  | Lazy-load HTTP / undici client auto-instrumentations      |
| `runtimeMetrics()`                | Lazy-load Node runtime metrics                            |
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

`tracingMiddleware` does **not** record query strings (`recordQuery: false` by default) and `instrumentKnex` lets you redact SQL via `sanitizeStatement`. `otelLogSink` accepts a `sanitizeAttribute` hook to drop sensitive fields per event.

## License

BSD-3-Clause
