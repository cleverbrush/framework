# @cleverbrush/otel

## 5.0.0

### Major Changes

- d916566: Make Framework query builders immutable and infer row schemas automatically.
  
  Retain returned query builders, return synchronous builders from scopes and grouped predicates, and supply an explicit Framework object output schema for opaque raw SELECTs. Ordinary, aliased, polymorphic and ORM queries expose their row schemas directly. Projections replace scalar selections, and projected/aggregate/raw queries cannot perform entity writes. Reads and write-returning rows consistently preserve exact decimal/bigint strings, Date objects and SQL nulls.
  
  All published Framework packages advance together to the next major version. Tracked entity objects remain mutable.
  
  ### Migrating from v4.x to v5
  
  Remove `withRowSchema()` calls and retain each configured query instead of relying on mutation. Replace raw base-query overloads with explicit output contracts. See `libs/knex-schema/MIGRATION-v5.md` for the complete migration guide.
- c5b4dbc: Require Node.js 24+ consistently across all published packages. Correct the root and all published-package license files to BSD-3-Clause, matching package metadata and documentation, and verify license consistency in source and npm tarballs. See docs/MIGRATION-v5.md for migration guidance.
  
  Harden JWT key/algorithm and claim validation, cookie parsing/serialization, and request-body lifecycle handling. Require explicit authorization scope for bounded server idempotency; coalesce concurrent retries and capture full response bodies. Bound response caching and bypass private, no-store and cookie-setting responses.
  
  Preserve DI scope validation through factories and propagate registered optional-service failures. Fix batch response status/header capture, timeout abort-listener cleanup, concurrent deduplication response cloning, CLI database cleanup on validation/production-guard failures, and the missing client idempotency JavaScript export. Update security-sensitive dependencies and ensure OpenTelemetry disable flags override SDK defaults.
  
  Add regression tests, package-consumer smoke checks, package-level unit coverage floors, migration/security documentation and release validation gates.

### Patch Changes

- Updated dependencies [6d7e982]
- Updated dependencies [54a3d43]
- Updated dependencies [d916566]
- Updated dependencies [0a08509]
- Updated dependencies [a90a491]
- Updated dependencies [efe2f2f]
- Updated dependencies [c5b4dbc]
- Updated dependencies [47133eb]
- Updated dependencies [32240e4]
- Updated dependencies [e788a0d]
  - @cleverbrush/server@5.0.0
  - @cleverbrush/di@5.0.0
  - @cleverbrush/log@5.0.0

## 4.5.0

## 4.4.3

## 4.4.2

## 4.4.1

## 4.4.0

## 4.3.2

### Patch Changes

- 1556ad1: Prepare a patch release with website SEO, AI-readiness, accessibility, and
  privacy compliance updates.

## 4.3.1

### Patch Changes

- 0bc2959: Trace batched requests as a parent batch span with child spans for each
  sub-request.

## 4.3.0

### Minor Changes

- 33630e2: Add `@cleverbrush/otel/client` with typed-client tracing middleware that creates outbound CLIENT spans and injects W3C trace context for distributed service-to-service traces.

## 4.2.0

## 4.1.0

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
