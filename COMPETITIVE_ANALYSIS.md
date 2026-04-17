# @cleverbrush/framework — Competitive Analysis & Roadmap

## Executive Summary

This document compares the **@cleverbrush/framework** with the most relevant competitors in the "schema-first typed Node.js web server with automated client generation" space. The comparison is honest: we highlight both our strengths and gaps.

**Competitors analyzed:**
| Framework | GitHub Stars | Approach | Schema | Last Active |
|---|---|---|---|---|
| [tRPC](https://trpc.io) | ~36k | RPC (procedures) | Any (Zod popular) | Active |
| [ts-rest](https://ts-rest.com) | ~3.3k | Contract-first REST | Zod / Standard Schema | Active |
| [Hono RPC](https://hono.dev) | ~24k | Framework + RPC mode | Zod (validator) | Active |
| [Elysia + Eden](https://elysiajs.com) | ~12k | Bun-native + typed client | TypeBox (built-in `t`) | Active |
| [Zodios](https://github.com/ecyrbe/zodios) | ~1.9k | API definition + client | Zod | Stale (3y) |
| **@cleverbrush** | — | Schema-first full-stack | Own + Standard Schema | Active |

---

## 1. Feature-by-Feature Comparison

### 1.1 Schema / Validation

| Feature | @cleverbrush | tRPC | ts-rest | Hono | Elysia | Zodios |
|---|---|---|---|---|---|---|
| Own schema system | ✅ Full builder system | ❌ BYO | ❌ BYO | ❌ BYO | ✅ TypeBox (`t`) | ❌ Zod-only |
| Extension mechanism | ✅ `defineExtension()` + `withExtensions()` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Standard Schema interop | ✅ `extern()` wraps Zod/Valibot/ArkType | ✅ v11 | ✅ v3.53 | ❌ | ❌ | ❌ |
| Generic (parameterized) schemas | ✅ `generic()` + `.apply()` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Branded/opaque types | ✅ `Brand<T, Tag>` | ❌ (Zod's `.brand()`) | ❌ (Zod) | ❌ | ❌ | ❌ |
| Bidirectional JSON Schema | ✅ `toJsonSchema()` / `fromJsonSchema()` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lazy/recursive schemas | ✅ `lazy()` | ❌ (Zod's `.lazy()`) | ❌ (Zod) | ❌ | ❌ | ❌ |
| Cross-concern reuse (forms, DI, DB, env) | ✅ Same schema everywhere | ❌ | ❌ | ❌ | ❌ | ❌ |

**Assessment**: Our schema system is the strongest differentiator. No competitor has an extensible, cross-concern schema with Standard Schema interop, generics, and JSON Schema round-tripping. Elysia's TypeBox is the closest (runtime validation + types + OpenAPI), but lacks extension system, generics, and cross-concern reuse.

### 1.2 Server / Endpoint Definition

| Feature | @cleverbrush | tRPC | ts-rest | Hono | Elysia | Zodios |
|---|---|---|---|---|---|---|
| Endpoint builder (fluent API) | ✅ 20+ methods | ❌ Procedures | ✅ Contract | ✅ Chaining | ✅ Chaining | ✅ Definition array |
| REST semantics (HTTP verbs, paths) | ✅ Full | ❌ RPC only | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Per-status-code response types | ✅ `.responses({200, 404})` | ❌ | ✅ Per-status | ✅ `c.json(d, 404)` | ✅ | ✅ Errors array |
| Route tagged templates | ✅ `route(schema)\`/path\`` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Exhaustive handler mapping | ✅ `mapHandlers()` | ❌ | ❌ Partial | ❌ | ❌ | ❌ |
| DI integration | ✅ Schema-as-key, `.inject()` | ❌ Context only | ❌ | ❌ | ✅ `decorate()` | ❌ |
| Auth integration | ✅ `.authorize(schema, roles)` | ❌ Middleware | ❌ Middleware | ❌ Middleware | ✅ Macro/guard | ❌ |
| ActionResult hierarchy | ✅ `.ok()`, `.notFound()`, etc. | ❌ | ❌ Return `{status, body}` | ❌ `c.json()` | ❌ | ❌ |
| Content negotiation | ✅ Pluggable | ❌ JSON only | ❌ JSON only | ✅ | ✅ | ❌ |
| File/stream responses | ✅ `FileResult`, `StreamResult` | ❌ | ❌ | ✅ | ✅ | ❌ |
| Middleware pipeline | ✅ `ServerBuilder.use()` | ✅ | ✅ | ✅ | ✅ Lifecycle hooks | ❌ |
| Multi-runtime (CF Workers, Deno, Bun) | ❌ Node.js only | ✅ Via adapters | ✅ Via adapters | ✅ Native | ✅ Bun-native | ❌ Node.js only |
| Request batching | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Subscriptions / WebSockets | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| ProblemDetails (RFC 7807) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Assessment**: Strong in compile-time safety (`mapHandlers`, route templates, typed DI). Weaker than tRPC/Hono/Elysia in multi-runtime support and real-time features (subscriptions).

### 1.3 OpenAPI

| Feature | @cleverbrush | tRPC | ts-rest | Hono | Elysia | Zodios |
|---|---|---|---|---|---|---|
| OpenAPI generation | ✅ Full 3.1 | ✅ Plugin (trpc-openapi) | ✅ Built-in | ✅ Plugin | ✅ Plugin | ✅ Plugin |
| Links (typed expressions) | ✅ Type-safe `$response.body#/` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Callbacks (typed) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Webhooks | ✅ `defineWebhook()` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Response headers schema | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Security schemes | ✅ Auth-integrated | ❌ | ✅ | ✅ | ✅ | ❌ |
| Per-status responses | ✅ | ❌ | ✅ | Partial | ✅ | ✅ |
| Swagger UI serving | ✅ `serveOpenApi()` | ✅ Plugin | ✅ | ✅ | ✅ | ❌ |

**Assessment**: Our OpenAPI support is the most comprehensive — links, callbacks, webhooks, typed expressions, and response headers are features no competitor offers together. This matters for enterprise API-first development.

### 1.4 Client

| Feature | @cleverbrush | tRPC | ts-rest | Hono | Elysia | Zodios |
|---|---|---|---|---|---|---|
| Typed client generation | ✅ Zero-codegen proxy | ✅ Zero-codegen | ✅ Zero-codegen | ✅ `hc<AppType>()` | ✅ Eden Treaty | ✅ Zero-codegen |
| Proxy-based API | ✅ `client.group.endpoint()` | ✅ `api.path.method()` | ✅ `client.getPost()` | ✅ `client.path.$get()` | ✅ `client.path.get()` | ✅ `client.alias()` |
| Middleware (interceptors) | ✅ Composable chain | ❌ Links | ❌ | ❌ Custom fetch | ❌ | ✅ Plugins |
| Retry (built-in) | ✅ With backoff + jitter | ❌ | ❌ | ❌ | ❌ | ❌ |
| Timeout (built-in) | ✅ `withTimeout()` | ❌ | ❌ | ❌ AbortController | ❌ | ❌ |
| Request deduplication | ✅ `withDeduplication()` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Response caching | ✅ `withCache()` (TTL) | ❌ (React Query) | ❌ (React Query) | ❌ (SWR) | ❌ | ❌ |
| Per-call overrides | ✅ `{ retry: {...}, timeout: 5000 }` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Streaming | ✅ `.stream()` → `AsyncIterable` | ✅ Subscriptions | ❌ | ❌ | ✅ WebSocket | ❌ |
| Error hierarchy | ✅ 4-level typed hierarchy | ❌ `TRPCClientError` | ❌ | ❌ | ❌ | ❌ |
| Hooks (before/after) | ✅ `beforeRequest`, `afterResponse`, `beforeError` | ❌ | ❌ | ❌ | ❌ | ❌ |
| React Query integration | ✅ `@cleverbrush/client/react` | ✅ Built-in | ✅ Built-in | ✅ Via SWR pattern | ❌ | ✅ @zodios/react |
| Response validation (client-side) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Custom fetch | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ (Axios) |

**Assessment**: Our client is the most resilience-focused: built-in retry, timeout, dedup, cache, per-call overrides, and structured error hierarchy. TanStack Query integration is provided via `@cleverbrush/client/react`, putting us on par with tRPC, ts-rest, and Zodios.

### 1.5 Ecosystem / Additional Packages

| Capability | @cleverbrush | tRPC | ts-rest | Hono | Elysia | Zodios |
|---|---|---|---|---|---|---|
| Auth (JWT, OAuth2, OIDC) | ✅ `@cleverbrush/auth` | ❌ | ❌ | ❌ | ✅ JWT plugin | ❌ |
| DI container | ✅ `@cleverbrush/di` | ❌ | ❌ | ❌ | ✅ `decorate()` | ❌ |
| Schema-driven forms (React) | ✅ `@cleverbrush/react-form` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Compile-time mapper | ✅ `@cleverbrush/mapper` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Env parsing (schema-driven) | ✅ `@cleverbrush/env` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Job scheduler | ✅ `@cleverbrush/scheduler` | ❌ | ❌ | ❌ | ✅ Cron plugin | ❌ |
| Async utilities | ✅ `@cleverbrush/async` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Deep utils | ✅ `@cleverbrush/deep` | ❌ | ❌ | ❌ | ❌ | ❌ |
| DB query builder | ✅ `@cleverbrush/knex-schema` | ❌ | ❌ | ❌ | ❌ (Drizzle) | ❌ |
| ClickHouse support | ✅ `@cleverbrush/knex-clickhouse` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Demo apps | ✅ Todo app (full-stack) | ✅ Examples | ✅ Examples | ✅ Examples | ✅ Examples | ✅ Examples |
| Documentation website | ✅ | ✅ Excellent | ✅ Good | ✅ Excellent | ✅ Excellent | ✅ Decent |

**Assessment**: The breadth of our ecosystem is a major advantage — we're the only framework where the same schema drives forms, DI, env config, DB queries, API contracts, and validation. Competitors typically only cover server + client.

---

## 2. Architecture Comparison

### 2.1 Contract / Type Sharing

| Approach | Frameworks | Pros | Cons |
|---|---|---|---|
| **Contract-first (shared definition)** | @cleverbrush, ts-rest | API shape defined once; client and server both consume it; OpenAPI natural | Need to maintain contract separately |
| **Server-inferred (`typeof app`)** | tRPC, Hono RPC, Elysia/Eden | Zero duplication; write server, client types follow | Tight coupling; TS project references in monorepos; IDE perf issues with many routes |
| **API definition array** | Zodios | Declarative definition; works without server | Verbose; array of objects less ergonomic than builder |

**@cleverbrush** uses contract-first with `defineApi()`. The contract is the single source of truth — both `mapHandlers()` on the server and `createClient()` on the client consume it. The `@cleverbrush/server/contract` subpath is browser-safe (no Node.js imports).

**This is an advantage** over Hono/Elysia's `typeof app` approach, which has documented IDE performance problems with many routes and requires TypeScript project references in monorepos.

### 2.2 Codegen vs Runtime Inference

All analyzed frameworks are **zero-codegen** — types are inferred at compile time. This is a shared advantage over older approaches (OpenAPI generators, GraphQL codegen, etc.).

### 2.3 Schema Ownership

| Strategy | Frameworks | Trade-off |
|---|---|---|
| **Own schema** | @cleverbrush, Elysia (TypeBox) | Full control; cross-concern reuse; but smaller community |
| **BYO schema (Zod popular)** | tRPC, ts-rest, Hono, Zodios | Leverage massive Zod ecosystem; but no cross-concern integration |

Our `extern()` bridge solves the trade-off: use our schema for full integration, or wrap any Standard Schema library for just the validation layer.

---

## 3. Honest Weaknesses

### What competitors do better than us:

| Gap | Who does it | Impact | Priority |
|---|---|---|---|
| ~~React Query / TanStack Query integration~~ | ~~tRPC, ts-rest, Zodios~~ | ~~High~~ | ✅ Done (`@cleverbrush/client/react`) |
| **Multi-runtime (CF Workers, Deno, Bun)** | Hono, Elysia, tRPC | Medium — important for edge deployment | 🟡 Medium |
| **WebSocket / Subscriptions** | tRPC, Elysia, Hono | Medium — real-time is increasingly expected | 🟡 Medium |
| **Request batching** | tRPC | Low–Medium — reduces HTTP overhead | 🟢 Low |
| **Community size / adoption** | tRPC (36k★), Hono (24k★) | High — ecosystem, docs, plugins, hiring | 🟡 Medium |
| **Interactive documentation / playground** | Hono, Elysia | Low — nice-to-have for developer experience | 🟢 Low |
| **Client-side response validation** | Zodios | Low — useful for untrusted APIs | 🟢 Low |
| **Testing utilities** | Elysia, Hono | Low — in-memory test helpers | 🟢 Low |
| **File upload (typed)** | Hono, Elysia | Low — we support it via binary body | 🟢 Low |

### What we do better than everyone:

1. **Single schema across the entire stack** — forms, DI, env, DB, API contract, validation, OpenAPI. No competitor comes close.
2. **Compile-time exhaustiveness** — `mapHandlers()` and `mapper` ensure nothing is forgotten. ts-rest has partial checking; no one else does.
3. **OpenAPI completeness** — typed links, callbacks, webhooks, response headers. Enterprise-grade OpenAPI without manual YAML.
4. **Client resilience** — built-in retry with backoff/jitter, timeout, dedup, cache, per-call overrides, structured error hierarchy. No competitor bundles this.
5. **Extension system** — third-party schema extensions without forking. Unique in the ecosystem.
6. **Route tagged templates** — type-safe path parameters from template literals, with `ParseStringSchemaBuilder` for serialization.

---

## 4. Future Features Roadmap

### Phase 1 — High Priority (Fill Critical Gaps)

#### 1.1 TanStack Query Integration (`@cleverbrush/client/react`) — ✅ IMPLEMENTED
**Status**: Shipped. Provides `createQueryClient()` with auto-generated `useQuery`, `useSuspenseQuery`, `useInfiniteQuery`, `useMutation`, `queryKey`, and `prefetch` for every endpoint. Hierarchical query keys enable group-level invalidation.

#### 1.2 WebSocket / Subscriptions Support
**Why**: Real-time features are increasingly expected. tRPC subscriptions are a key selling point.

**Scope**:
- New endpoint type: `endpoint.subscription()` or `endpoint.ws()`
- Schema-validated messages in both directions
- Client: `client.events.subscribe()` → `AsyncIterable<Event>` with typed events
- Server: handler returns `AsyncGenerator<Event>`
- Reconnection with backoff (leverage existing `@cleverbrush/async` retry)
- OpenAPI: document as AsyncAPI or WebSocket endpoint

#### 1.3 Request Batching (Client)
**Why**: Reduces HTTP overhead for chatty UIs making many parallel requests.

**Scope**:
- `createClient(api, { batching: { maxSize: 10, windowMs: 10 } })`
- Server: `ServerBuilder.useBatching()` middleware to unpack/repack
- Transparent to individual call sites — same `client.todos.list()` API

### Phase 2 — Medium Priority (Expand Reach)

#### 2.1 Multi-Runtime Adapter Layer
**Why**: Edge deployment (Cloudflare Workers, Deno Deploy, Vercel Edge) is growing fast.

**Scope**:
- Abstract `ServerAdapter` interface over Node.js `http.IncomingMessage`
- Adapters: `@cleverbrush/server-node`, `@cleverbrush/server-web` (Web Standard Request/Response for CF Workers, Deno, Bun)
- `ServerBuilder.toFetchHandler()` → standard `(request: Request) => Response`
- Keep `@cleverbrush/server` as the core, adapters are thin wrappers

#### 2.2 Testing Utilities (`@cleverbrush/server-test`)
**Why**: Elysia and Hono have elegant in-process test helpers. Reduces test setup friction.

**Scope**:
- `createTestClient(server)` → typed client that calls handlers in-memory (no HTTP)
- Automatic DI scope per test
- `mockService(IDatabase, mockImpl)` helper
- Snapshot testing for OpenAPI spec changes

#### 2.3 Typed File Upload
**Why**: Hono and Elysia have nice typed multipart handling. Ours works but isn't first-class.

**Scope**:
- `file()` schema builder for `File` / `Blob` types
- `endpoint.post().body(object({ avatar: file().maxSize('5mb').accept('image/*') }))`
- Client: automatic `FormData` construction from typed object
- OpenAPI: proper `multipart/form-data` encoding

### Phase 3 — Lower Priority (Polish & Ecosystem)

#### 3.1 Middleware Presets / Recipes
**Why**: Hono and Elysia have rich middleware ecosystems (CORS, helmet, compression, rate limiting).

**Scope**:
- `@cleverbrush/server-cors` — typed CORS configuration
- `@cleverbrush/server-rate-limit` — rate limiting with pluggable stores
- `@cleverbrush/server-compression` — gzip/brotli response compression
- `@cleverbrush/server-logger` — structured request logging

#### 3.2 CLI Tool
**Why**: Project scaffolding and utility commands (OpenAPI spec generation) via CLI.

**Scope**:
- `npx @cleverbrush/cli init` — scaffold new project with server + client
- `npx @cleverbrush/cli openapi generate` — write OpenAPI spec to file
- `npx @cleverbrush/cli validate` — check contract/handler alignment without building

#### 3.3 Vue / Svelte Query Integrations
**Why**: Extend typed client hooks beyond React.

**Scope**:
- `@cleverbrush/vue-query` — Vue 3 composables wrapping TanStack Query
- `@cleverbrush/svelte-query` — Svelte stores wrapping TanStack Query

#### 3.4 OpenTelemetry Integration
**Why**: Observability is table stakes for production services.

**Scope**:
- `@cleverbrush/server-otel` — automatic span creation per endpoint
- Propagate trace context through DI scopes
- Client: automatic span for outbound requests

#### 3.5 GraphQL Contract Bridge
**Why**: Some teams need GraphQL alongside REST.

**Scope**:
- Generate GraphQL schema from `@cleverbrush/schema` object schemas
- Schema-driven resolvers with same DI/auth integration

---

## 5. Recommended Prioritization

```
Q1: TanStack Query integration (1.1) — immediately addresses #1 gap
Q1: WebSocket subscriptions (1.2) — addresses real-time gap
Q2: Multi-runtime adapters (2.1) — enables edge deployment
Q2: Request batching (1.3) — performance optimization
Q3: Testing utilities (2.2) — developer experience
Q3: Typed file upload (2.3) — completeness
Q4: Middleware presets (3.1) — ecosystem growth
Q4: CLI tool (3.2) — onboarding experience
```

---

## 6. Conclusion

**@cleverbrush/framework occupies a unique position**: it's the only framework where a single schema system drives the entire stack — from database queries and environment parsing through DI and server endpoints to client calls and React forms. This "schema as connective tissue" architecture provides unmatched type safety and consistency.

**Our main competitive gaps are adoption-driven features**: TanStack Query integration, multi-runtime support, and real-time subscriptions. These are the features that teams actively evaluate when choosing a framework. Addressing them (particularly TanStack Query) would eliminate the primary reasons a team might choose tRPC or ts-rest over us.

**Our main competitive advantages are depth features**: exhaustive handler mapping, OpenAPI links/callbacks/webhooks, typed runtime expressions, compile-time mapper, built-in client resilience, and schema extensibility. These are features that teams appreciate after adoption — they prevent bugs and reduce boilerplate in large codebases.

The strategy should be: **close the adoption gaps first (Phase 1), then leverage depth advantages to retain and delight users (Phases 2–3).**
