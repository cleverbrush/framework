---
'@cleverbrush/otel': minor
'@cleverbrush/log': patch
---

Add `@cleverbrush/otel` — OpenTelemetry instrumentation for the framework.

## `@cleverbrush/otel` (new library)

End-to-end OpenTelemetry support for `@cleverbrush/server`, `@cleverbrush/orm`,
and `@cleverbrush/log`. Ships traces, logs, and runtime metrics over OTLP/HTTP
to any compatible backend (HyperDX / ClickStack, Grafana Tempo, Jaeger, …).

- **`setupOtel(config)`** — bootstraps the Node SDK (traces + logs + metrics)
  with sensible defaults and a single `shutdown()` hook for graceful exit.
- **`tracingMiddleware()`** — `@cleverbrush/server` middleware that opens a
  `SpanKind.SERVER` span per request, names it from the endpoint metadata
  (`operationId` or `METHOD route`), tags it with HTTP semantic-convention
  attributes, and extracts inbound W3C `traceparent` headers.
- **`instrumentKnex(knex)`** — wires Knex `query` / `query-response` /
  `query-error` events into `SpanKind.CLIENT` spans with `db.system.name`,
  `db.namespace`, `db.operation.name`, and `db.query.text`. Spans are
  automatically parented under the active request span.
- **`otelLogSink()`** — `@cleverbrush/log` sink that emits OTLP log records
  with severity, body, structured attributes, and exception info.
- **`traceEnricher()`** — log enricher that attaches `TraceId` / `SpanId` /
  `TraceFlags` to every event when a span is active.
- **`configureOtel(services)`** — registers `ITracer` and `IMeter` in
  `@cleverbrush/di`.
- **`outboundHttpInstrumentations()` / `runtimeMetrics()`** — opt-in
  lazy loaders for HTTP / undici / Node runtime metrics auto-instrumentation
  (declared as optional peer dependencies).

The `todo-backend` demo is fully wired and ships traces / logs / metrics to
a HyperDX container included in `demos/docker-compose.yml`.

## `@cleverbrush/log`

- **Deprecation:** `traceEnricher` from `@cleverbrush/log/enrichers/trace`
  is deprecated. Use `traceEnricher` from `@cleverbrush/otel` instead — it
  reads the active span via `@opentelemetry/api` directly rather than via
  the `globalThis.opentelemetry` shim.
