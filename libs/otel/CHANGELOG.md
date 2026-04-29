# @cleverbrush/otel

## 4.0.0

### Major Changes

- cbdfa69: Add `@cleverbrush/otel` — OpenTelemetry instrumentation for the framework.

  ## `@cleverbrush/otel` (new library)

  End-to-end OpenTelemetry support for `@cleverbrush/server`, `@cleverbrush/orm`,
  and `@cleverbrush/log`. Ships traces, logs, and runtime metrics over OTLP/HTTP
  to any compatible backend (ClickStack, Grafana Tempo, Jaeger, …).

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
  a ClickStack container included in `demos/docker-compose.yml`.

  ## `@cleverbrush/log`

  - **`TypedTemplate.template`** — new optional property on the `TypedTemplate<T>`
    interface. When present, the `Logger` uses it as the raw `{Property}` pattern
    string for `messageTemplate`, so log events with the same shape are grouped
    correctly in Seq, ClickStack, and other structured-log UIs. `ParseStringSchemaBuilder`
    now implements this property automatically.
  - **`correlationIdMiddleware` / `useLogging`** — `responseHeader` (and the new
    `UseLoggingOptions.correlationResponseHeader`) now accept `false` to suppress
    the `X-Correlation-Id` response header entirely. Useful when OTel's
    `traceparent` / `traceresponse` header already provides traceability and a
    second correlation header would be redundant.
  - **`traceEnricher` removed** — the `globalThis.opentelemetry`-based enricher
    that was included in earlier builds has been removed. Use `traceEnricher`
    from `@cleverbrush/otel` instead — it reads the active span via
    `@opentelemetry/api` directly and also captures `TraceFlags`.

  ## `@cleverbrush/schema`

  - **`ParseStringSchemaBuilder.template`** — new read-only getter that returns
    the human-readable `{Property}` pattern string (e.g.
    `"Todo created: #{TodoId} \"{Title}\" by user {UserId}"`). This satisfies the
    `TypedTemplate.template` contract, so schema-parsed log templates are
    automatically grouped by shape in structured-log UIs.

### Patch Changes

- Updated dependencies [9235c76]
- Updated dependencies [cbdfa69]
  - @cleverbrush/server@4.0.0
  - @cleverbrush/log@4.0.0
  - @cleverbrush/di@4.0.0
