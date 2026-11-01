# @cleverbrush/log
<!-- coverage-badge-start -->
![Unit coverage](https://img.shields.io/badge/unit_coverage-98.5%25-brightgreen)
<!-- coverage-badge-end -->

Enterprise structured logging for TypeScript — Serilog-style message templates, CLEF format, batching sinks with circuit breaking, ambient correlation IDs.

## Install

```bash
npm install @cleverbrush/log
```

## Quick Start

```ts
import {
    createLogger,
    consoleSink,
    hostnameEnricher,
    processIdEnricher,
} from '@cleverbrush/log';

const logger = createLogger({
    minimumLevel: 'information',
    sinks: [consoleSink({ theme: 'dark' })],
    enrichers: [hostnameEnricher(), processIdEnricher()],
});

logger.info('Server started on port {Port}', { Port: 3000 });
logger.error(new Error('oops'), 'Request failed for {UserId}', { UserId: 42 });

await logger.dispose();
```

## Features

- **Message Templates** — `{Named}` properties captured as structured data
- **Typed Templates** — `TypedTemplate<T>` via `@cleverbrush/schema` for compile-time checked, groupable log events
- **CLEF Format** — Compact Log Event Format for Seq, ClickHouse, etc.
- **Sinks** — Console, File (with rotation), Seq, ClickHouse, custom
- **Batching** — All network sinks batch with retry & circuit breaking
- **Enrichers** — hostname, processId, environment, application, correlationId, caller
- **Correlation IDs** — UUID v7, extracted from headers, propagated via AsyncLocalStorage
- **Middleware** — Request logging & correlation ID for `@cleverbrush/server`
- **DI** — `configureLogging()` for `@cleverbrush/di`
- **Sampling** — Per-level sampling filters

## Typed Templates

Pass a `ParseStringSchemaBuilder` (from `@cleverbrush/schema`) directly to any log method. The logger uses the raw `{Property}` pattern as `messageTemplate` so all events of the same shape are grouped in Seq, SigNoz, ClickHouse, etc., while the rendered message is interpolated as usual.

```ts
import { s } from '@cleverbrush/schema';
import { createLogger, consoleSink } from '@cleverbrush/log';

// Define once — compile-time checked parameter types
const TodoCreated = s.parseString('Todo #{TodoId} "{Title}" created by {UserId}');

const logger = createLogger({ sinks: [consoleSink()] });

// TypeScript enforces { TodoId, Title, UserId }
logger.info(TodoCreated, { TodoId: 1, Title: 'Buy milk', UserId: 'u-42' });
```

## Correlation Middleware

```ts
import { useLogging } from '@cleverbrush/log';

// Returns [correlationIdMiddleware, requestLoggingMiddleware]
const [correlationId, requestLogging] = useLogging(logger, {
    excludePaths: ['/health'],
    // Set to false when OTel traceparent already provides traceability
    correlationResponseHeader: false,
});

server.useRequest(correlationId).useRequest(requestLogging);
```

`correlationResponseHeader: false` suppresses `X-Correlation-Id` when OTel's
`X-Trace-Id` response header already provides traceability.

With current `@cleverbrush/server`, request logging observes one final response
completion, including serialization, streamed data, authentication/CORS failures,
and disconnects. Logs include `Outcome` and `Elapsed`; `StatusCode` is absent if
no headers were sent. `getLevel` receives status `0` in that case. Completion
callbacks retain the context captured when middleware registered them. Structural
contexts without completion hooks retain middleware-scoped observation.

## OpenTelemetry Integration

Trace correlation, OTLP log export, and the `traceEnricher` (which copies the active span's `traceId` / `spanId` onto every log event) live in [`@cleverbrush/otel`](https://www.npmjs.com/package/@cleverbrush/otel). Wire them up like this:

```ts
import { createLogger, consoleSink } from '@cleverbrush/log';
import { otelLogSink, traceEnricher } from '@cleverbrush/otel';

const logger = createLogger({
    sinks: [consoleSink(), otelLogSink()],
    enrichers: [traceEnricher()],
});
```

`@cleverbrush/log` itself stays free of any OpenTelemetry runtime dependency.

`createLogEvent` and the pipeline capture execution context before queuing, so
enrichers observe the originating request even when a batch contains multiple
requests. `LogEvent.runInContext` is optional function metadata; JSON and standard
formatters do not serialize it. Preserve it when custom code copies events or
buffers them. The pipeline preserves it across enricher transformations.

`otelLogSink` uses this captured context for top-level OTel trace correlation and
supports exception policies plus final body/attribute sanitization. Other sinks
continue to use their configured formats and privacy behavior.

## License

BSD-3-Clause
