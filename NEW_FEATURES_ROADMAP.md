# @cleverbrush Framework: Potential New Features Roadmap

## Context
This roadmap is focused on reworking a legacy Express + Sequelize project to `@cleverbrush/server`, while also proposing broader ecosystem improvements.

Legacy feature set considered:
- REST CRUD API
- File uploads
- Background jobs/queues
- Real-time (WebSockets/SSE)
- Admin panel
- Multi-tenancy
- Email sending
- Rate limiting
- Redis caching
- Session-based auth
- PostgreSQL with preference for ORM-like features on top of Knex

---

## Tier 1: High Impact, Strong Framework Fit

### 1. Structured Logging Library (`@cleverbrush/log`)

**Concept**: Serilog-style structured logging using `ParseStringSchemaBuilder` template + serialize behavior.

**Why it fits**:
- `ParseStringSchemaBuilder.serialize()` already maps typed object fields into a formatted string.
- The same structure can emit both human-readable messages and machine-queryable structured fields.

**Proposed capabilities**:
- Log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`
- Sinks: console (pretty/JSON), file (rotation), HTTP, custom
- Enrichers: timestamp, correlationId, hostname, processId, requestId, userId
- Request middleware: log start/end, latency, status, payload size
- Scoped logger via DI
- Namespace/source level minimum overrides
- Optional destructuring semantics (`{@obj}` vs `{obj}`)

**API sketch**:
```ts
const logger = createLogger({ sinks: [consoleSink(), jsonFileSink("app.log")] });

logger.info("Server started on port {port}", { port: 3000 });

const OrderLog = parseString(
  object({ userId: string(), orderId: number(), amount: number() }),
  $t => $t`User ${t => t.userId} placed order ${t => t.orderId} for $${t => t.amount}`
);

logger.info(OrderLog, { userId: "abc", orderId: 42, amount: 99.99 });
```

---

### 2. ORM-like Extensions for `@cleverbrush/knex-schema`

**Concept**: Add Sequelize-like conveniences as schema extensions while preserving Knex query-builder flexibility.

**Proposed features**:
- Automatic timestamps:
  - `.hasTimestamps()`
  - configurable names via `.hasTimestampColumns(...)`
- Soft deletes (paranoid mode):
  - `.softDelete()`
  - `.withDeleted()`, `.onlyDeleted()`, `.restore()`
- Relation metadata on schemas:
  - `.belongsTo(...)`, `.hasMany(...)`, `.hasOne(...)`, `.belongsToMany(...)`
  - `include(...)` shortcuts built from relation metadata
- Query scopes:
  - `.scope(name, fn)`, `.defaultScope(fn)`, `.unscoped()`
- Lifecycle hooks:
  - `.beforeInsert()`, `.afterInsert()`, `.beforeUpdate()`, `.afterUpdate()`, `.beforeDelete()`, `.afterDelete()`
- Transaction helper:
  - `withTransaction(db, async trx => ...)` with nested/savepoint support
- Pagination:
  - offset pagination: `.paginate({ page, pageSize })`
  - cursor pagination: `.paginateAfter(cursor, limit)`

---

### 3. Rate Limiting Middleware

**Concept**: Built-in, schema-configurable rate limiting middleware for server endpoints.

**Proposed capabilities**:
- Global and per-endpoint limits
- Keys by IP/userId/API key/custom extractor
- Stores: memory + Redis
- Sliding window algorithm
- Standard limit headers
- RFC 9457 Problem Details for `429`

---

### 4. Multi-Tenancy Support

**Concept**: First-class tenant isolation at HTTP and query layers.

**Proposed capabilities**:
- Tenant resolution middleware:
  - header, subdomain, path, JWT claim
- Query-level isolation:
  - `.tenantScoped(t => t.tenantId)` auto-filters every query
  - insert auto-populates tenant key
- Optional schema-per-tenant strategy (PostgreSQL `search_path`)

---

## Tier 2: Medium Impact, Good Fit

### 5. Caching Layer (`@cleverbrush/cache`)
- Schema-driven cache entries
- Stores: memory LRU, Redis
- Endpoint response caching (`.cache({ ttl: "1m" })`)
- Tag/key invalidation
- Stale-while-revalidate

### 6. File Upload Handling
- Streaming multipart parser
- File schema type with size + mime validation
- Endpoint integration via request body schema
- Storage backends: local, S3-compatible

### 7. Background Job Queue (`@cleverbrush/jobs`)
- Event-triggered jobs (distinct from cron scheduler)
- Schema-defined payloads
- Delay, priority, retry, dead-letter, dedupe
- Stores: memory, Redis, PostgreSQL (`SKIP LOCKED`)
- Worker concurrency + graceful shutdown

### 8. Session Management (`@cleverbrush/auth` enhancement)
- Session auth scheme with typed session schema
- Redis/PostgreSQL/in-memory stores
- Session regeneration on login
- Unified `principal` experience with existing auth paths

### 9. Email Sending (`@cleverbrush/email`)
- Schema-driven message model
- Template support (subject/body)
- Providers: SMTP, SendGrid, SES
- Queue integration for resilient delivery

---

## Tier 3: Nice-to-Have Enhancements

### 10. Admin CRUD Auto-Generation
- Generate CRUD endpoints from schema model + options
- Built-in filtering/sorting/pagination
- Per-endpoint overrides

### 11. Validation Enhancements
- i18n-ready error keys
- conditional validation (`when`)
- cross-field refinement (`refine`)

### 12. Health Checks
- `/health`, `/healthz`, `/readyz`
- DB/Redis/custom checks
- Kubernetes-friendly semantics

### 13. Compression Middleware
- gzip/brotli negotiation
- threshold and content-type controls

### 14. Formal CORS Middleware
- Standardized reusable middleware with typed config

### 15. OpenTelemetry Integration (`@cleverbrush/telemetry`)
- Tracing + metrics + propagation
- HTTP/DB/client instrumentation
- correlationId alignment with logging

---

## Priority Matrix

| # | Feature | Migration Need | Framework Novelty | Effort |
|---|---|---|---|---|
| 1 | Structured Logging | High | Very High | Medium |
| 2 | ORM-like knex-schema extensions | Critical | High | Large |
| 3 | Rate Limiting | High | Medium | Small |
| 4 | Multi-Tenancy | High | High | Large |
| 5 | Caching Layer | High | Medium | Medium |
| 6 | File Uploads | High | Medium | Medium |
| 7 | Background Jobs | High | High | Large |
| 8 | Session Management | High | Medium | Small |
| 9 | Email Sending | Medium | Medium | Medium |
| 10 | Admin CRUD Generation | Medium | High | Medium |

---

## Recommended Implementation Phases

### Phase 1: Migration Blockers
1. ORM-like knex-schema extensions (timestamps, soft delete, relations, transactions, pagination)
2. Rate limiting middleware
3. Session management

### Phase 2: Core Infrastructure
1. Structured logging
2. Background job queue
3. File upload handling

### Phase 3: Production Features
1. Multi-tenancy
2. Caching layer
3. Email sending
4. Health checks

### Phase 4: Developer Experience and Observability
1. Admin CRUD auto-generation
2. Validation enhancements (i18n + cross-field)
3. OpenTelemetry integration
4. Compression and formalized CORS
