# @cleverbrush/log

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

Pass a `ParseStringSchemaBuilder` (from `@cleverbrush/schema`) directly to any log method. The logger uses the raw `{Property}` pattern as `messageTemplate` so all events of the same shape are grouped in Seq, ClickStack, ClickHouse, etc., while the rendered message is interpolated as usual.

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
```

`correlationResponseHeader: false` suppresses the `X-Correlation-Id` response header entirely — useful when `@cleverbrush/otel`'s tracing middleware already sets a `traceparent` / `traceresponse` header and a second ID would be redundant.

## License

BSD-3-Clause
