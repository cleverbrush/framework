# `@cleverbrush/log` — Enterprise Structured Logging Library

## Overview

Serilog-inspired structured logging library that leverages `ParseStringSchemaBuilder` for typed message templates, integrates with the existing DI/server/middleware stack, and ships with production sinks for **Console**, **File** (CLEF), **Seq** (HTTP/CLEF), and **ClickHouse** (batch insert via `@cleverbrush/knex-clickhouse`).

Zero-dependency on sink targets (tree-shakeable), batched for network sinks, correlation ID propagation via `AsyncLocalStorage`.

---

## Phase 1: Core Logger Engine

### Log Levels & LogEvent Model

Log levels use a plain `const` object and a derived type — no TS `enum`s (consistent with framework conventions).

```ts
export const LogLevel = {
    Trace: 0,
    Debug: 1,
    Information: 2,
    Warning: 3,
    Error: 4,
    Fatal: 5,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export interface LogEvent {
    timestamp: Date;
    level: LogLevel;
    messageTemplate: string;      // raw template with {property} holes
    renderedMessage: string;      // fully interpolated human-readable string
    properties: Record<string, unknown>;  // structured fields
    exception?: Error;
    eventId?: string;             // deterministic hex hash of messageTemplate (→ CLEF @i)
}
```

### Message Template Engine

Two modes — both produce the same `LogEvent` shape:

**Plain templates** (Serilog-style string with `{property}` holes):

```ts
// Simple property interpolation
logger.info('User {UserId} signed in from {IpAddress}', {
    UserId: 'usr_abc123',
    IpAddress: '192.168.1.42',
});
// renderedMessage: "User usr_abc123 signed in from 192.168.1.42"
// messageTemplate: "User {UserId} signed in from {IpAddress}"
// properties: { UserId: 'usr_abc123', IpAddress: '192.168.1.42' }

// Destructuring: {@obj} captures the full object structure, {obj} calls toString()
logger.info('Order received: {@Order}', {
    Order: { id: 42, items: ['widget', 'gadget'], total: 99.95 },
});
// properties.Order = { id: 42, items: ['widget', 'gadget'], total: 99.95 }

logger.info('Order received: {Order}', {
    Order: { id: 42, toString: () => 'Order#42' },
});
// renderedMessage: "Order received: Order#42"
// properties.Order = "Order#42"
```

**Typed templates** via `ParseStringSchemaBuilder` — compile-time type safety:

```ts
import { parseString, object, string, number } from '@cleverbrush/schema';

// Define a typed log message — schema validates the property bag at compile time
const OrderPlaced = parseString(
    object({
        userId: string(),
        orderId: number(),
        amount: number(),
    }),
    ($t) => $t`User ${(t) => t.userId} placed order #${(t) => t.orderId} for $${(t) => t.amount}`
);

// Type-safe: TS will error if you misspell a property or pass wrong type
logger.info(OrderPlaced, { userId: 'abc', orderId: 42, amount: 99.99 });
// renderedMessage: "User abc placed order #42 for $99.99"

// Also works with exceptions
logger.error(err, OrderPlaced, { userId: 'abc', orderId: 42, amount: 99.99 });
```

Parsed templates are cached internally (LRU on string key) for zero allocation on hot paths.

### Sink, Enricher, and Filter Interfaces

```ts
export interface LogSink extends AsyncDisposable {
    emit(events: LogEvent[]): Promise<void>;
    flush?(): Promise<void>;
}

export type Enricher = (event: LogEvent) => LogEvent;

export type LogFilter = (event: LogEvent) => boolean;
```

### Logger Class

```ts
const logger = createLogger({
    minimumLevel: 'information',
    sinks: [consoleSink({ theme: 'dark' })],
    enrichers: [hostnameEnricher(), processIdEnricher()],
});

// Per-level methods
logger.trace('Entering {Method}', { Method: 'processOrder' });
logger.debug('Cache hit ratio: {Ratio}', { Ratio: 0.85 });
logger.info('Server started on port {Port}', { Port: 3000 });
logger.warn('Slow query detected: {ElapsedMs}ms', { ElapsedMs: 2500 });
logger.error(err, 'Failed to process payment for order {OrderId}', { OrderId: 42 });
logger.fatal(err, 'Unrecoverable state — shutting down');

// Fast level check — avoids template parsing when disabled
if (logger.isEnabled(LogLevel.Debug)) {
    logger.debug('Detailed state: {@State}', { State: computeExpensiveState() });
}

// Child loggers with additional context
const orderLogger = logger
    .forContext('SourceContext', 'OrderService')
    .forContext({ TenantId: 'acme-corp', Region: 'eu-west-1' });

orderLogger.info('Processing order {OrderId}', { OrderId: 42 });
// All events from orderLogger carry SourceContext, TenantId, Region automatically
```

### Logger Pipeline

Events flow: caller → level check → template render → enrichers → filters → level overrides → fan-out to sinks.

Log methods are **synchronous and fire-and-forget** — they push events into an internal async microtask pipeline. Callers never `await`.

```ts
const logger = createLogger({
    minimumLevel: 'debug',

    // Namespace-level overrides (like Serilog's MinimumLevel.Override)
    levelOverrides: {
        'Microsoft.EntityFramework': 'warning',
        'MyApp.OrderService': 'debug',
    },

    // Back-pressure configuration
    maxQueueSize: 10_000,
    dropPolicy: 'dropOldest',   // 'dropOldest' | 'dropNewest' | 'block'

    sinks: [
        consoleSink({ minimumLevel: 'information' }),
        seqSink({ serverUrl: 'http://seq:5341' }),
    ],
    enrichers: [
        hostnameEnricher(),
        processIdEnricher(),
        correlationIdEnricher(),
    ],
});
```

---

## Phase 2: Built-in Enrichers

Enrichers are pure functions that add properties to every event passing through the pipeline.

```ts
import {
    hostnameEnricher,
    processIdEnricher,
    environmentEnricher,
    applicationEnricher,
    correlationIdEnricher,
    callerEnricher,
} from '@cleverbrush/log';

const logger = createLogger({
    minimumLevel: 'information',
    enrichers: [
        // Machine/process identity — cached, zero-cost after first call
        hostnameEnricher(),                     // adds { Hostname: 'prod-web-03' }
        processIdEnricher(),                    // adds { ProcessId: 12345 }

        // Application metadata
        environmentEnricher('production'),      // adds { Environment: 'production' }
        applicationEnricher('order-service'),   // adds { Application: 'order-service' }

        // Reads from AsyncLocalStorage — zero-cost when no context is active
        correlationIdEnricher(),                // adds { CorrelationId: '...' }

        // Source location (opt-in, uses Error.captureStackTrace — expensive)
        callerEnricher(),                       // adds { SourceFile: '...', SourceLine: 42 }
    ],
    sinks: [consoleSink()],
});

// Custom enricher — just a function
const tenantEnricher: Enricher = (event) => ({
    ...event,
    properties: { ...event.properties, TenantId: getCurrentTenantId() },
});
```

---

## Phase 3: Sinks

### BatchingSink (Base Wrapper)

All network/file sinks use this internally. Provides buffering, retry, and circuit breaking.

```ts
import { BatchingSink } from '@cleverbrush/log';

// Wrap any emit function with production-grade batching
const mySink = new BatchingSink({
    batchSize: 100,              // flush after 100 events
    flushInterval: 2_000,        // or after 2 seconds of inactivity
    maxQueueSize: 50_000,        // max buffered events before dropping
    maxRetries: 5,               // retry failed flushes
    retryDelay: 1_000,           // initial retry delay (exponential backoff)
    circuitBreakerThreshold: 3,  // after 3 consecutive failures, enter cooldown

    emit: async (batch: LogEvent[]) => {
        await fetch('https://my-service/logs', {
            method: 'POST',
            body: JSON.stringify(batch),
        });
    },
});
```

### ConsoleSink

```ts
import { consoleSink } from '@cleverbrush/log';

// Pretty mode — colored, human-readable (default for development)
const devConsole = consoleSink({
    theme: 'dark',          // 'dark' | 'light' | 'none'
    minimumLevel: 'debug',
});
// Output:
// [2026-04-20 14:30:00.123 INF] Server started on port 3000
//   Hostname: "prod-web-03"
//   ProcessId: 12345

// JSON/CLEF mode — machine-parseable (for production / container logs)
const prodConsole = consoleSink({
    mode: 'json',
    minimumLevel: 'information',
});
// Output:
// {"@t":"2026-04-20T14:30:00.123Z","@mt":"Server started on port {Port}","Port":3000}
```

### FileSink

```ts
import { fileSink } from '@cleverbrush/log';

// CLEF newline-delimited JSON with daily rotation
const logFile = fileSink({
    path: './logs/app.log',
    minimumLevel: 'information',
    rotation: {
        strategy: 'time',       // 'size' | 'time' | 'hybrid'
        interval: 'daily',      // 'hourly' | 'daily'
        retainCount: 30,        // keep 30 rotated files
    },
});

// Size-based rotation
const sizedLogFile = fileSink({
    path: './logs/app.log',
    rotation: {
        strategy: 'size',
        maxBytes: 50 * 1024 * 1024,  // 50 MB per file
        retainCount: 10,
    },
});

// Hybrid: rotate daily OR at 100MB, whichever comes first
const hybridLogFile = fileSink({
    path: './logs/app.log',
    rotation: {
        strategy: 'hybrid',
        interval: 'daily',
        maxBytes: 100 * 1024 * 1024,
        retainCount: 14,
    },
});
```

### SeqSink

Sends events to [Seq](https://datalust.co/seq) via HTTP in [CLEF format](https://clef-json.org/). Batched, with dynamic level filtering based on Seq's `MinimumLevelAccepted` response.

```ts
import { seqSink } from '@cleverbrush/log';

const seq = seqSink({
    serverUrl: 'https://seq.mycompany.com',
    apiKey: process.env.SEQ_API_KEY,    // sent as X-Seq-ApiKey header

    // Batching (inherits from BatchingSink)
    batchSize: 100,
    flushInterval: 2_000,

    // Resilience
    maxRetries: 5,
    retryDelay: 1_000,

    // Dynamic level filtering: if Seq responds with MinimumLevelAccepted,
    // the sink will automatically stop sending events below that level,
    // reducing bandwidth without changing your logger configuration.
});

// Wire format sent to POST /ingest/clef:
// Content-Type: application/vnd.serilog.clef
//
// {"@t":"2026-04-20T14:30:00.123Z","@mt":"User {UserId} signed in","@l":"Information","@i":"a1b2c3d4","UserId":"usr_abc","Hostname":"prod-web-03"}
// {"@t":"2026-04-20T14:30:00.456Z","@mt":"Order {OrderId} processed","OrderId":42,"Amount":99.99}
```

**CLEF field mapping:**

| LogEvent field       | CLEF property | Notes                                           |
| -------------------- | ------------- | ----------------------------------------------- |
| `timestamp`          | `@t`          | ISO 8601                                        |
| `messageTemplate`    | `@mt`         | Raw template with `{Property}` holes            |
| `renderedMessage`    | `@m`          | Only included if differs from `@mt`             |
| `level`              | `@l`          | Omitted for `Information` (CLEF default)        |
| `exception.stack`    | `@x`          | Full stack trace string                         |
| `eventId`            | `@i`          | Deterministic hex hash of template              |
| `properties.*`       | top-level     | All properties spread as top-level JSON fields  |

Level mapping: `Trace`→`Verbose`, `Debug`→`Debug`, `Information`→(omitted), `Warning`→`Warning`, `Error`→`Error`, `Fatal`→`Fatal`.

### ClickHouseSink

Batch insert into ClickHouse via `@cleverbrush/knex-clickhouse`. Ships as a **separate entrypoint** (`@cleverbrush/log/clickhouse`) to avoid forcing the peer dependency.

```ts
import { clickHouseSink, createLogsTable } from '@cleverbrush/log/clickhouse';
import { getClickhouseConnection } from '@cleverbrush/knex-clickhouse';

const ch = getClickhouseConnection({
    connection: { url: 'http://clickhouse:8123', database: 'logs' },
});

// One-time: create the logs table with recommended schema
await createLogsTable(ch, 'application_logs', {
    engine: 'MergeTree',
    partitionBy: 'toYYYYMM(timestamp)',
    orderBy: ['timestamp', 'level'],
    ttl: 'timestamp + INTERVAL 90 DAY',     // auto-expire after 90 days
});

// The sink
const chSink = clickHouseSink({
    connection: ch,
    table: 'application_logs',

    // High-throughput batching
    batchSize: 1_000,
    flushInterval: 5_000,

    // Optional: customize column mapping
    columns: {
        timestamp: 'timestamp',
        level: 'level',
        messageTemplate: 'message_template',
        renderedMessage: 'rendered_message',
        properties: 'properties',       // JSON-serialized
        exception: 'exception',
        correlationId: 'correlation_id',
        traceId: 'trace_id',
        spanId: 'span_id',
        sourceContext: 'source_context',
    },
});
```

**Default ClickHouse table DDL** generated by `createLogsTable()`:

```sql
CREATE TABLE IF NOT EXISTS application_logs (
    timestamp       DateTime64(3, 'UTC'),
    level           LowCardinality(String),
    message_template String,
    rendered_message String,
    source_context  LowCardinality(String)  DEFAULT '',
    properties      String                  DEFAULT '{}',
    exception       Nullable(String),
    correlation_id  Nullable(String),
    trace_id        Nullable(String),
    span_id         Nullable(String)
) ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, level)
TTL timestamp + INTERVAL 90 DAY;
```

### Custom Sinks

```ts
import { createSink } from '@cleverbrush/log';

// Quick custom sink — just provide an emit function
const slackAlertSink = createSink({
    minimumLevel: 'error',
    emit: async (events) => {
        for (const event of events) {
            await fetch(SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `🚨 *${levelToString(event.level)}*: ${event.renderedMessage}`,
                }),
            });
        }
    },
});

// Or implement the full LogSink interface for advanced control
class DatadogSink implements LogSink {
    async emit(events: LogEvent[]): Promise<void> { /* ... */ }
    async flush(): Promise<void> { /* ... */ }
    async [Symbol.asyncDispose](): Promise<void> {
        await this.flush();
    }
}
```

---

## Phase 4: CLEF Serialization

The CLEF formatter is used internally by `SeqSink` and `FileSink` but is also exported for custom use.

```ts
import { formatClef, formatClefBatch } from '@cleverbrush/log';

// Single event → CLEF JSON string
const clefLine = formatClef(event);
// '{"@t":"2026-04-20T14:30:00.123Z","@mt":"User {UserId} signed in","UserId":"usr_abc"}'

// Batch → newline-delimited CLEF (for Seq ingestion or file output)
const clefPayload = formatClefBatch(events);
// '{"@t":"...","@mt":"...",...}\n{"@t":"...","@mt":"...",...}'

// Safe serialization options
const clefLine = formatClef(event, {
    maxDepth: 10,                // property nesting depth limit
    maxStringLength: 32_768,     // truncate long string values
});
```

---

## Phase 5: AsyncLocalStorage & Correlation

### LogContext

Ambient logger context using `AsyncLocalStorage`. Zero overhead when not used — the `AsyncLocalStorage` instance is only created once, and `getStore()` is a near-zero-cost operation.

```ts
import { LogContext } from '@cleverbrush/log';

// Set a logger as the ambient context
LogContext.run(logger, async () => {
    // Anywhere in this async call tree, retrieve the contextual logger:
    const log = LogContext.current()!;
    log.info('Inside context');

    // Add enrichment for a sub-operation
    await LogContext.enrichWith({ OrderId: 42, CustomerId: 'cust_xyz' }, async () => {
        const log = LogContext.current()!;
        log.info('Processing order');
        // This event carries OrderId and CustomerId automatically

        await processPayment();
        // Even deeply nested async calls see the enriched logger
    });
});
```

### Correlation ID

```ts
import { generateCorrelationId, extractCorrelationId } from '@cleverbrush/log';

// Generate a new correlation ID (UUID v7 — time-sortable, K-sortable)
const id = generateCorrelationId(); // UUID v7 via uuidv7()

// Extract from incoming request headers (checks multiple standard headers)
const id = extractCorrelationId(req.headers);
// Checks: X-Correlation-Id → X-Request-Id → traceparent (W3C) → generates new
```

---

## Phase 6: Server Integration

### ILogger DI Service

```ts
import { ILogger, configureLogging } from '@cleverbrush/log';

const server = new ServerBuilder()
    .services((svc) => {
        // Register the root logger as a singleton
        svc.addSingletonInstance(ILogger, logger);

        // Or use configureLogging() which also registers a scoped logger
        // that auto-enriches with request context (RequestId, Method, Path)
        configureLogging(svc, logger);
    })
    .build();

// In endpoint handlers — inject the scoped logger
const getOrder = endpoint
    .get('/orders/:id')
    .inject({ logger: ILogger })
    .handle(async ({ params }, { logger }) => {
        logger.info('Fetching order {OrderId}', { OrderId: params.id });
        // This logger already carries CorrelationId, RequestId, Method, Path
        // from the middleware pipeline
    });
```

### Request Logging Middleware

```ts
import { requestLoggingMiddleware } from '@cleverbrush/log';

const server = new ServerBuilder()
    .use(
        requestLoggingMiddleware({
            // Customize log level based on response
            getLevel: (statusCode, elapsedMs) => {
                if (statusCode >= 500) return 'error';
                if (statusCode >= 400) return 'warning';
                if (elapsedMs > 3000) return 'warning';
                return 'information';
            },

            // Skip noisy health check endpoints
            excludePaths: ['/health', '/healthz', '/readyz'],

            // Add custom properties from request context
            enrichRequest: (ctx) => ({
                TenantId: ctx.items.get('tenantId'),
                UserId: ctx.principal?.value?.id,
            }),

            // Security: don't log request/response bodies by default
            logRequestBody: false,
            logResponseBody: false,
            logRequestStart: false,   // only log on completion
        })
    )
    .build();

// Produces log events like:
// [2026-04-20 14:30:00.456 INF] HTTP GET /orders/42 responded 200 in 23ms
//   Method: "GET"
//   Path: "/orders/42"
//   StatusCode: 200
//   Elapsed: 23
//   ContentLength: 1847
//   UserAgent: "Mozilla/5.0..."
//   CorrelationId: "a1b2c3d4-..."
//   RequestId: "req_xyz789"
//   TenantId: "acme-corp"
```

### Correlation ID Middleware

```ts
import { correlationIdMiddleware } from '@cleverbrush/log';

const server = new ServerBuilder()
    // Order matters: correlation ID should be first so all subsequent
    // middleware and handlers see it
    .use(
        correlationIdMiddleware({
            // Header to read from incoming request (checked in order)
            requestHeaders: ['X-Correlation-Id', 'X-Request-Id'],
            // Header to set on response
            responseHeader: 'X-Correlation-Id',
            // Generator for new IDs when none found in request (UUID v7 by default)
            generate: () => uuidv7(),
        })
    )
    .use(requestLoggingMiddleware())
    .build();
```

### Full Server Setup (Convenience)

```ts
import {
    createLogger,
    consoleSink,
    seqSink,
    useLogging,
    hostnameEnricher,
    processIdEnricher,
    environmentEnricher,
    correlationIdEnricher,
} from '@cleverbrush/log';
import { clickHouseSink } from '@cleverbrush/log/clickhouse';

// 1. Create the logger with all sinks
const logger = createLogger({
    minimumLevel: process.env.LOG_LEVEL ?? 'information',
    levelOverrides: {
        'HttpClient': 'warning',          // suppress noisy HTTP client logs
        'Database': 'warning',            // suppress routine query logs
        'MyApp.OrderService': 'debug',    // verbose logging for debugging
    },
    enrichers: [
        hostnameEnricher(),
        processIdEnricher(),
        environmentEnricher(process.env.NODE_ENV ?? 'development'),
        correlationIdEnricher(),
    ],
    sinks: [
        // Dev: pretty console
        consoleSink({
            theme: 'dark',
            minimumLevel: 'debug',
        }),

        // Seq: structured log aggregation and search
        seqSink({
            serverUrl: process.env.SEQ_URL ?? 'http://localhost:5341',
            apiKey: process.env.SEQ_API_KEY,
            batchSize: 100,
            flushInterval: 2_000,
        }),

        // ClickHouse: long-term storage and analytics
        clickHouseSink({
            connection: chConnection,
            table: 'application_logs',
            batchSize: 1_000,
            flushInterval: 5_000,
        }),
    ],
});

// 2. Wire into server — one call sets up DI + correlation + request logging
const server = new ServerBuilder()
    .use(...useLogging(logger, {
        excludePaths: ['/health'],
        getLevel: (status, elapsed) =>
            status >= 500 ? 'error' :
            status >= 400 ? 'warning' :
            elapsed > 3000 ? 'warning' :
            'information',
    }))
    .handle(getOrder)
    .handle(createOrder)
    .build();

// 3. Graceful shutdown — flushes all sinks
await using _ = logger;  // or: process.on('SIGTERM', () => logger.dispose());
await server.listen(3000);
```

---

## Phase 7: Self-Diagnostics & Resilience

### SelfLog

Internal diagnostic channel for the logging library's own errors. Sinks use this when they fail, instead of throwing and crashing the application.

```ts
import { SelfLog } from '@cleverbrush/log';

// By default, writes to process.stderr
// Customize:
SelfLog.setOutput(fs.createWriteStream('./logs/selflog.txt'));
SelfLog.disable();  // suppress all internal diagnostics

// Used internally by sinks:
// SelfLog.write('SeqSink flush failed after 5 retries', err);
// SelfLog.write('ClickHouseSink circuit breaker opened — backing off 30s');
```

### Graceful Shutdown

```ts
// Option A: explicit dispose
await logger.dispose();
// Flushes all sinks (up to shutdownTimeout), then closes them

// Option B: using declaration (TS 5.2+)
{
    await using logger = createLogger({ ... });
    // logger is auto-disposed when the block exits
}

// Option C: automatic process exit handling
const logger = createLogger({
    sinks: [seqSink({ ... })],
    handleProcessExit: true,  // hooks SIGTERM + beforeExit to flush
});
```

---

## Phase 8: Property Serialization Safety

All structured properties are passed through a safe serializer before being written to any sink.

```ts
// These are all handled safely — no crashes, no leaks, no infinite loops:

logger.info('State: {@State}', {
    State: (() => {
        const obj: any = { name: 'root' };
        obj.self = obj;                        // circular reference → "[Circular]"
        return obj;
    })(),
});

logger.info('Data: {@Data}', {
    Data: {
        deeply: { nested: { to: { level: { ten: { and: { beyond: true }}}}}} // depth limited
    },
});

logger.info('Payload: {Payload}', {
    Payload: Buffer.alloc(1024 * 1024),        // → "[Buffer(1048576 bytes)]"
});

logger.info('BigNum: {Value}', {
    Value: 9007199254740993n,                   // BigInt → "9007199254740993"
});

logger.info('Handler: {Fn}', {
    Fn: () => console.log('hello'),             // → "[Function: Fn]"
});
```

Configurable limits:
- `maxDepth`: 10 (default)
- `maxStringLength`: 32,768 characters (default)
- Circular references → `"[Circular]"`
- `Error` objects → `{ message, stack, name, ...ownEnumerableProperties }`

---

## Advanced Features

### Log Sampling (High-Throughput)

For services handling millions of requests, sample verbose levels to reduce volume without losing visibility.

```ts
import { samplingFilter } from '@cleverbrush/log';

const logger = createLogger({
    minimumLevel: 'debug',
    filters: [
        // Keep only 1% of debug events, 10% of trace events
        samplingFilter({ debug: 0.01, trace: 0.001 }),
        // All other levels pass through unfiltered
    ],
    sinks: [seqSink({ ... })],
});
```

### Dynamic Level Reconfiguration

Change the minimum log level at runtime without restarting the process — useful for production debugging.

```ts
// Flip to debug temporarily via API endpoint
adminEndpoint.post('/log-level').handle(async ({ body }) => {
    logger.setMinimumLevel(body.level);  // 'debug' | 'trace' | etc.
    logger.info('Log level changed to {Level} by {User}', {
        Level: body.level,
        User: ctx.principal.value.name,
    });
});

// Or watch an environment variable
logger.watchLevel('LOG_LEVEL');  // polls process.env.LOG_LEVEL every 30s
```

### OpenTelemetry Trace Correlation

When used alongside `@cleverbrush/telemetry` (or any W3C-compatible tracing), log events automatically carry trace and span IDs.

```ts
import { traceEnricher } from '@cleverbrush/log';

const logger = createLogger({
    enrichers: [
        // Reads trace_id and span_id from the active OpenTelemetry span
        traceEnricher(),
    ],
    sinks: [seqSink({ ... })],
});

// Events will include @tr and @sp in CLEF output:
// {"@t":"...","@mt":"...","@tr":"abc123...","@sp":"def456..."}
// Seq and ClickHouse can correlate logs with distributed traces
```

---

## Package Structure

```
libs/log/
├── package.json                # @cleverbrush/log
├── README.md                   # comprehensive README with badges, install, quick start, API overview
├── tsconfig.build.json
├── src/
│   ├── index.ts                # main public API exports
│   ├── clickhouse.ts           # @cleverbrush/log/clickhouse entrypoint
│   ├── LogEvent.ts
│   ├── LogLevel.ts
│   ├── Logger.ts
│   ├── LoggerPipeline.ts
│   ├── MessageTemplate.ts
│   ├── LogContext.ts
│   ├── SelfLog.ts
│   ├── correlation.ts          # UUID v7 generation
│   ├── serialization.ts
│   ├── createLogger.ts
│   ├── di.ts
│   ├── Sink.ts
│   ├── Enricher.ts
│   ├── Filter.ts
│   ├── formatters/
│   │   └── ClefFormatter.ts
│   ├── enrichers/
│   │   ├── index.ts
│   │   ├── hostname.ts
│   │   ├── processId.ts
│   │   ├── environment.ts
│   │   ├── application.ts
│   │   ├── correlationId.ts
│   │   ├── trace.ts
│   │   └── caller.ts
│   ├── sinks/
│   │   ├── index.ts
│   │   ├── BatchingSink.ts
│   │   ├── ConsoleSink.ts
│   │   ├── FileSink.ts
│   │   ├── SeqSink.ts
│   │   ├── ClickHouseSink.ts
│   │   └── createSink.ts
│   └── middleware/
│       ├── requestLogging.ts
│       └── correlationId.ts
└── tests/
    ├── Logger.test.ts
    ├── MessageTemplate.test.ts
    ├── ClefFormatter.test.ts
    ├── BatchingSink.test.ts
    ├── ConsoleSink.test.ts
    ├── SeqSink.test.ts
    ├── ClickHouseSink.test.ts
    ├── middleware.test.ts
    ├── serialization.test.ts
    ├── LogContext.test.ts
    └── correlation.test.ts
```

### Dependency Graph

| Package                        | Depends on                                                               |
| ------------------------------ | ------------------------------------------------------------------------ |
| `@cleverbrush/log`             | `@cleverbrush/schema`, `@cleverbrush/async`                              |
| `@cleverbrush/log/clickhouse`  | `@cleverbrush/knex-clickhouse` (peer)                                    |
| Server middleware              | `@cleverbrush/server` (peer, types only)                                 |
| DI integration                 | `@cleverbrush/di` (peer)                                                 |

---

## Design Decisions

| Decision                             | Rationale                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| CLEF as wire format                  | Standard, well-documented, bidirectional with Serilog ecosystem, native Seq support        |
| ClickHouse sink as separate entry    | Avoids forcing `@cleverbrush/knex-clickhouse` as a dependency; tree-shakeable              |
| Fire-and-forget log methods          | Callers never await; async pipeline handles delivery — zero latency impact on hot paths    |
| AsyncLocalStorage for correlation    | Zero cost when unused, no explicit logger parameter passing required                       |
| Serilog-compatible level names       | CLEF/Seq compatibility (`Verbose`/`Debug`/`Information`/`Warning`/`Error`/`Fatal`)         |
| ParseStringSchemaBuilder integration | Leverages existing framework primitive for type-safe templates — unique differentiator     |
| No Winston/Pino compatibility        | Clean API design; document migration paths instead of shim layers                          |
| BatchingSink as composable wrapper   | All network sinks share retry, circuit breaking, back-pressure logic — DRY                 |
| UUID v7 for correlation IDs          | Time-sortable, K-sortable — better ClickHouse insert/index performance than UUID v4        |
| No TS enums                          | Use `as const` objects + derived types — consistent with framework conventions, tree-shakes |
| TSDoc JSDoc on all public APIs       | IDE discoverability, auto-generated API docs via TypeDoc                                    |

---

## Changeset

The `@cleverbrush/log` package must be added to the **fixed** group in [.changeset/config.json](../.changeset/config.json) so it releases in lockstep with the rest of the framework.

```jsonc
// .changeset/config.json — add to the fixed array:
"fixed": [
    [
        "@cleverbrush/async",
        "@cleverbrush/auth",
        // ...
        "@cleverbrush/log",          // ← add
        // ...
        "@cleverbrush/server"
    ]
]
```

Initial changeset for the release:

```md
---
"@cleverbrush/log": minor
---

Add `@cleverbrush/log` — enterprise structured logging with typed message templates,
CLEF serialization, and production sinks for Console, File, Seq, and ClickHouse.
```

---

## README.md

The library ships with a comprehensive `libs/log/README.md` following the established framework README pattern:

```md
# @cleverbrush/log

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

Enterprise structured logging for the Cleverbrush framework — Serilog-style
message templates with type-safe property bags via
[@cleverbrush/schema](../schema), production sinks for Console, File, Seq,
and ClickHouse.

## Features

- **Structured message templates** — `"User {UserId} signed in"` with typed
  properties and `{@obj}` destructuring
- **Type-safe templates** — leverage `ParseStringSchemaBuilder` for
  compile-time checked log messages
- **Production sinks** — Console (pretty/JSON), File (CLEF, rotation), Seq
  (HTTP/CLEF), ClickHouse (batch insert)
- **Enrichers** — hostname, processId, environment, correlationId, caller
- **AsyncLocalStorage context** — zero-cost ambient logger with correlation
  ID propagation
- **Server middleware** — request logging, correlation ID extraction/generation
- **DI integration** — scoped `ILogger` per request with auto-enrichment
- **Batching & resilience** — configurable batch size, flush interval, retry,
  circuit breaker
- **Graceful shutdown** — `AsyncDisposable` with configurable flush timeout
- **Safe serialization** — circular refs, depth limits, BigInt, Buffer handling

## Installation

```bash
npm install @cleverbrush/log

# For ClickHouse sink (optional):
npm install @cleverbrush/knex-clickhouse
```

## Quick Start

```ts
import { createLogger, consoleSink, seqSink } from '@cleverbrush/log';

const logger = createLogger({
    minimumLevel: 'information',
    sinks: [
        consoleSink({ theme: 'dark' }),
        seqSink({ serverUrl: 'http://localhost:5341' }),
    ],
});

logger.info('Server started on port {Port}', { Port: 3000 });
```

## Documentation

See the full documentation at
[cleverbrush.com/log](https://cleverbrush.com/log).
```

---

## JSDoc Standards

All public APIs must have TSDoc-style JSDoc comments following the framework's established conventions.

### Required JSDoc coverage

| Export type         | Requirements                                                       |
| ------------------- | ------------------------------------------------------------------ |
| Factory functions   | `@param` for each parameter, `@returns`, `@example`                |
| Interfaces/Types    | Summary + per-property doc comments                                |
| Class methods       | Summary, `@param`, `@returns`, `@example` for non-trivial methods  |
| Type aliases        | Summary describing the contract                                    |
| Constants           | Summary describing values and usage                                |

### Examples

```ts
/**
 * Creates a structured logger with the specified configuration.
 *
 * The logger uses fire-and-forget semantics — log methods are synchronous
 * and push events into an internal async pipeline. Events flow through
 * enrichers, filters, and level overrides before being dispatched to sinks.
 *
 * @param config - logger configuration including sinks, enrichers, and filters
 * @returns a configured `Logger` instance that implements `AsyncDisposable`
 *
 * @example
 * ```ts
 * const logger = createLogger({
 *     minimumLevel: 'information',
 *     sinks: [consoleSink({ theme: 'dark' })],
 *     enrichers: [hostnameEnricher()],
 * });
 *
 * logger.info('Server started on port {Port}', { Port: 3000 });
 * ```
 *
 * @see {@link Logger} for the full Logger API
 * @see {@link LoggerConfig} for configuration options
 */
export function createLogger(config: LoggerConfig): Logger { ... }

/**
 * A sink that writes log events to a Seq server via HTTP using the CLEF format.
 *
 * Events are batched and sent to `POST {serverUrl}/ingest/clef`. The sink
 * respects Seq's `MinimumLevelAccepted` response to dynamically reduce
 * bandwidth when the server applies level filtering.
 *
 * @param options - Seq connection and batching configuration
 * @param options.serverUrl - the base URL of the Seq server (e.g. `http://localhost:5341`)
 * @param options.apiKey - optional API key sent as `X-Seq-ApiKey` header
 * @param options.batchSize - number of events per batch (default: 100)
 * @param options.flushInterval - max milliseconds between flushes (default: 2000)
 * @returns a `LogSink` that batches and sends events to Seq
 *
 * @example
 * ```ts
 * const sink = seqSink({
 *     serverUrl: 'https://seq.mycompany.com',
 *     apiKey: process.env.SEQ_API_KEY,
 * });
 * ```
 */
export function seqSink(options: SeqSinkOptions): LogSink { ... }

/**
 * Represents a single structured log event in the pipeline.
 *
 * Log events carry both a human-readable rendered message and the original
 * message template with structured property values, enabling both
 * human-friendly display and machine-queryable structured search.
 */
export interface LogEvent {
    /** ISO timestamp when the event occurred. */
    timestamp: Date;
    /** Severity level of the event. */
    level: LogLevel;
    /** The raw message template with `{Property}` holes. */
    messageTemplate: string;
    /** The fully interpolated, human-readable message. */
    renderedMessage: string;
    /** Structured properties extracted from the template and enrichers. */
    properties: Record<string, unknown>;
    /** The exception associated with this event, if any. */
    exception?: Error;
    /** Deterministic hex hash of `messageTemplate` — maps to CLEF `@i`. */
    eventId?: string;
}

/**
 * Log severity levels as a const object.
 *
 * Use as values (`LogLevel.Information`) or as a type (`LogLevel`).
 * Levels are ordered numerically — higher values indicate greater severity.
 *
 * @example
 * ```ts
 * if (logger.isEnabled(LogLevel.Debug)) {
 *     logger.debug('Expensive computation: {@Result}', { Result: compute() });
 * }
 * ```
 */
export const LogLevel = { ... } as const;
```

---

## Website Documentation Section

Add a new page at `websites/docs/app/log/page.tsx` and register it in the navigation.

### Navigation update

Add `{ href: '/log', label: 'Log' }` to the `Packages` dropdown in `websites/docs/app/layout.tsx`:

```tsx
{
    href: '#',
    label: 'Packages',
    children: [
        { href: '/server', label: 'Server' },
        { href: '/client', label: 'Client' },
        { href: '/auth', label: 'Auth' },
        { href: '/di', label: 'DI' },
        { href: '/log', label: 'Log' },             // ← add
        { href: '/server-openapi', label: 'OpenAPI' },
        { href: '/env', label: 'Env' },
        // ...
    ]
}
```

### Page structure (`websites/docs/app/log/page.tsx`)

Follows the established pattern:

```tsx
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
                        Enterprise structured logging with typed message templates,
                        CLEF serialization, and production sinks for Console, File,
                        Seq, and ClickHouse.
                    </p>
                </div>

                <InstallBanner
                    command="npm install @cleverbrush/log"
                    note={<>Optional: <code>npm install @cleverbrush/knex-clickhouse</code> for ClickHouse sink</>}
                />

                <div className="why-box">
                    <h2>Why @cleverbrush/log?</h2>
                    <h3>The Problem</h3>
                    <p>Most Node.js loggers output flat strings or untyped JSON.
                       You lose the ability to query structured fields, correlate
                       across services, or catch template mismatches at compile time.</p>
                    <h3>The Solution</h3>
                    <p>Serilog-style structured logging powered by the same schema
                       system you already use for endpoints — type-safe message
                       templates, CLEF format for Seq, batch inserts for ClickHouse,
                       correlation IDs via AsyncLocalStorage.</p>
                </div>

                {/* Quick Start card */}
                <div className="card">
                    <h2>Quick Start</h2>
                    <pre><code dangerouslySetInnerHTML={{ __html: highlightTS(`
import { createLogger, consoleSink, seqSink } from '@cleverbrush/log';

const logger = createLogger({
    minimumLevel: 'information',
    sinks: [
        consoleSink({ theme: 'dark' }),
        seqSink({ serverUrl: 'http://localhost:5341' }),
    ],
});

logger.info('Server started on port {Port}', { Port: 3000 });
                    `) }} /></pre>
                </div>

                {/* Typed Templates card */}
                <div className="card">
                    <h2>Type-Safe Message Templates</h2>
                    <pre><code dangerouslySetInnerHTML={{ __html: highlightTS(`
import { parseString, object, string, number } from '@cleverbrush/schema';

const OrderPlaced = parseString(
    object({ userId: string(), orderId: number(), amount: number() }),
    ($t) => $t\`User \${(t) => t.userId} placed order #\${(t) => t.orderId}\`,
);

// Compile-time type safety — TS errors on wrong property names or types
logger.info(OrderPlaced, { userId: 'abc', orderId: 42, amount: 99.99 });
                    `) }} /></pre>
                </div>

                {/* Sinks card */}
                <div className="card">
                    <h2>Production Sinks</h2>
                    <p>Console (pretty/JSON) · File (CLEF, rotation) · Seq (HTTP/CLEF) · ClickHouse (batch insert)</p>
                    {/* ... code examples for each sink ... */}
                </div>

                {/* Server Integration card */}
                <div className="card">
                    <h2>Server Integration</h2>
                    <p>Request logging middleware, correlation ID propagation,
                       scoped DI logger — one call to wire it all up.</p>
                    {/* ... useLogging() example ... */}
                </div>
            </div>
        </div>
    );
}
```

---

## Test Coverage Requirements

Target: **≥90% line coverage** across all source files, measured via the existing Vitest + `coverage-summary.json` pipeline.

### Coverage matrix

| Module                  | Key scenarios to cover                                                                                           | Target  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ------- |
| `MessageTemplate`       | Plain template parsing, `{@obj}` destructuring, typed template via `ParseStringSchemaBuilder`, template caching   | ≥95%    |
| `Logger`                | All level methods, `isEnabled()`, `forContext()`, exception overloads, level override matching, disabled levels    | ≥95%    |
| `LoggerPipeline`        | Enricher chain, filter chain, fan-out to multiple sinks, back-pressure (queue full + each drop policy)            | ≥90%    |
| `BatchingSink`          | Count-based flush, time-based flush, explicit `flush()`, dispose flush, retry on failure, circuit breaker open/close, queue overflow | ≥95% |
| `ConsoleSink`           | Pretty mode output, JSON/CLEF mode output, stderr routing for warn+, minimumLevel filtering                      | ≥90%    |
| `FileSink`              | Write + read-back CLEF, size rotation, time rotation, hybrid rotation, retain count pruning                       | ≥90%    |
| `SeqSink`               | CLEF payload format, API key header, `MinimumLevelAccepted` dynamic filtering, error handling, batch boundaries   | ≥90%    |
| `ClickHouseSink`        | Column mapping, batch insert call shape, DDL generation, error handling, custom column config                     | ≥90%    |
| `ClefFormatter`         | All CLEF fields (`@t`, `@mt`, `@m`, `@l`, `@x`, `@i`), level omission for Information, property spread, edge cases | ≥95%  |
| `serialization`         | Circular refs, depth limit, string truncation, BigInt, Buffer, Error, Symbol, Function, null/undefined            | ≥95%    |
| `LogContext`            | `run()` / `current()` / `enrichWith()`, nested contexts, async boundary propagation, no-context fallback          | ≥90%    |
| `correlation`           | UUID v7 format validation, header extraction priority, fallback generation                                        | ≥95%    |
| `enrichers/*`           | Each enricher adds expected properties, caching behavior (hostname, processId)                                    | ≥90%    |
| `middleware/*`          | Request logging (happy path, error, excluded paths, custom level), correlation ID (extract, generate, propagate)  | ≥90%    |
| `di`                    | Singleton registration, scoped resolution, scoped enrichment                                                      | ≥90%    |
| `createLogger`          | Config validation, wiring verification, invalid config errors                                                     | ≥90%    |
| `SelfLog`               | Write to stderr, custom output, disable, enable                                                                   | ≥90%    |

### Test organization

- **Unit tests** (`tests/*.test.ts`): fast, isolated, mock sinks and dependencies. Run in CI on every PR.
- **Integration tests** (`tests/integration/`): require Docker services (Seq, ClickHouse). Run in CI via `docker-compose` or tagged as `@integration` for selective runs.
- Coverage is collected via `vitest --coverage` and reported in `coverage/coverage-summary.json`. The existing `scripts/update-coverage-badges.js` pipeline will pick up `@cleverbrush/log` automatically.

---

## Verification Plan

1. **Unit tests**: `MessageTemplate` parsing/rendering (plain + `ParseStringSchemaBuilder`)
2. **Unit tests**: CLEF serialization (field mapping, level omission for Information, edge cases)
3. **Unit tests**: `BatchingSink` (count flush, time flush, retry, circuit breaker, dispose flush)
4. **Unit tests**: Safe serializer (circular refs, depth, BigInt, Buffer, Symbol, Function)
5. **Integration test**: `SeqSink` against real Seq (`docker-compose`, verify events in Seq UI)
6. **Integration test**: `ClickHouseSink` against ClickHouse (existing `docker-compose.yml`)
7. **Integration test**: Request logging middleware (mock server, verify log events)
8. **Integration test**: Correlation ID propagation across async boundaries
9. **Manual**: Run `todo-backend` demo with full logging → Seq + ClickHouse
10. **Bundle size**: Verify importing only `consoleSink` doesn't pull in ClickHouse or Seq dependencies
11. **Coverage gate**: All modules meet ≥90% line coverage (≥95% for core modules)
12. **JSDoc completeness**: Every public export has TSDoc with `@param`, `@returns`, `@example`
13. **Changeset**: `.changeset/config.json` updated with `@cleverbrush/log` in the fixed group
14. **README**: `libs/log/README.md` passes review (badges, install, quick start, feature list)
15. **Website**: `websites/docs/app/log/page.tsx` renders correctly, appears in nav dropdown
