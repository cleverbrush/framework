# @cleverbrush/log

Enterprise structured logging for TypeScript — Serilog-style message templates, CLEF format, batching sinks with circuit breaking, ambient correlation IDs.

## Install

```bash
npm install @cleverbrush/log
```

## Quick Start

```ts
import { createLogger, consoleSink } from '@cleverbrush/log';

const logger = createLogger({
    minimumLevel: 'information',
    sinks: [consoleSink({ theme: 'dark' })],
    enrichers: ['hostname', 'processId'],
});

logger.info('Server started on port {Port}', { Port: 3000 });
logger.error(new Error('oops'), 'Request failed for {UserId}', { UserId: 42 });

await logger.dispose();
```

## Features

- **Message Templates** — `{Named}` properties captured as structured data
- **CLEF Format** — Compact Log Event Format for Seq, ClickHouse, etc.
- **Sinks** — Console, File (with rotation), Seq, ClickHouse, custom
- **Batching** — All network sinks batch with retry & circuit breaking
- **Enrichers** — hostname, processId, environment, application, correlationId, caller, trace _(deprecated; use `@cleverbrush/otel`)_
- **Correlation IDs** — UUID v7, extracted from headers, propagated via AsyncLocalStorage
- **Middleware** — Request logging & correlation ID for `@cleverbrush/server`
- **DI** — `configureLogging()` for `@cleverbrush/di`
- **Sampling** — Per-level sampling filters

## License

BSD-3-Clause
