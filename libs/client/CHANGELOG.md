# @cleverbrush/client

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

### Minor Changes

- 47133eb: Preserve structured server validation issues through typed clients and form
  submissions. Add transport-independent external form issues, typed indexed array
  fields, and precise indexed validation paths without changing existing form APIs.
- 32240e4: Add contract-declared mutation replay with typed async request preparation,
  explicit authorization scopes, and consistent endpoint error policies. Generate
  client keys and coordinate HTTP retries/batching from the contract without
  changing ordinary client calls. Document replay headers and framework errors in
  OpenAPI while preserving domain response schemas.
- e788a0d: Add schema-based single and multiple file upload contracts, typed multipart client
  serialization, and matching OpenAPI schemas. Enforce multipart body, file, field,
  and part limits, reject truncated or duplicate singleton uploads, and support
  file-only endpoints. Existing options-only uploads retain their single-file
  shape and explicit MIME rejection reporting.
  
  Add lossless JSONB object reads and writes using native object schemas with
  `.acceptUnknownProps().jsonb()`. Preserve nested extension data through returning
  rows and projections, validate JSON extensions in the database layer, align
  nullable object column DDL with reads, and track nested edits independently in
  the ORM. Fix the PostgreSQL
  upsert returning path exercised by document round trips.

### Patch Changes

- 6d7e982: Respect maxEvents: 0 in useSubscription by retaining only lastEvent and leaving the event history empty.
- Updated dependencies [6d7e982]
- Updated dependencies [54a3d43]
- Updated dependencies [d916566]
- Updated dependencies [0a08509]
- Updated dependencies [a90a491]
- Updated dependencies [efe2f2f]
- Updated dependencies [f9b1f56]
- Updated dependencies [c5b4dbc]
- Updated dependencies [47133eb]
- Updated dependencies [32240e4]
- Updated dependencies [e788a0d]
  - @cleverbrush/server@5.0.0
  - @cleverbrush/schema@5.0.0

## 4.5.0

### Minor Changes

- f7c65ae: Use one browser-safe, deterministic `ct2:` cache key encoder across server and client helpers, response caches, and external invalidation. Selected properties and plain-object keys are sorted, values retain their types, and dates retain millisecond precision. Unsupported values fail explicitly. **Breaking:** every computed key changes, including property-free tags. Upgrade external cache writers and invalidators together, and flush or expire previous entries; literal base invalidation names and TTL settings remain unchanged. Successful mutations invalidate cached aliases and prevent older in-flight reads from refilling them; failed writes preserve entries.

  Synchronize mounted schema-form fields with form/field setters and reset baselines, using descriptor identities and stable external-store subscriptions. Discard obsolete async validation after value changes or reset. Add `handleSubmit`, reactive `submitting`/`error`, duplicate-submit protection, explicit success/failure results and opt-in error translation. Add `defineFieldRenderer` and `createFormSystem` for typed renderer values, variants, props and composable registries while retaining existing form APIs. See the cache/form migration guide for semantics and examples.

  Add reusable `deepClone` for plain objects, arrays and Dates with cycle/shared-reference preservation, sparse-array lengths, null prototypes and safe enumerable own string/symbol properties. React forms now use `deepClone` and `deepEqual` from `@cleverbrush/deep` for snapshots and dirty checks. **Breaking:** correct existing `deepEqual` semantics for null/type mismatches, equivalent cycles and shared references, signed zero, invalid Dates, symbol keys and sparse arrays. Opaque values such as Files, Maps, Sets and custom instances compare only by identity and remain references when cloned. Unordered arrays preserve duplicate/hole counts without hash-based matching or input mutation. Review consumers relying on the old outcomes; `deepExtend`, `HashObject` and `Transaction` are unchanged.

### Patch Changes

- Updated dependencies [f7c65ae]
  - @cleverbrush/server@4.5.0
  - @cleverbrush/schema@4.5.0

## 4.4.3

### Patch Changes

- @cleverbrush/schema@4.4.3
- @cleverbrush/server@4.4.3

## 4.4.2

### Patch Changes

- Updated dependencies [ce6e0a0]
  - @cleverbrush/server@4.4.2
  - @cleverbrush/schema@4.4.2

## 4.4.1

### Patch Changes

- @cleverbrush/schema@4.4.1
- @cleverbrush/server@4.4.1

## 4.4.0

### Minor Changes

- c75bff4: Add reusable environment, HTTP, cache, database and migration capabilities:

  - `@cleverbrush/env`: add `envBoolean()` for environment-style boolean values
    such as `1`, `0`, `yes`, `no`, `on`, and `off`.
  - `@cleverbrush/server`: parse `application/x-www-form-urlencoded` request
    bodies by default, add `ActionResult.raw()`, and allow ordered
    authentication fallback with `trySchemes`.
  - `@cleverbrush/client`: add `externalCacheTags()` to
    `@cleverbrush/client/cache` for framework-agnostic external cache tag
    invalidation, including Next.js `revalidateTag()` as one supported callback.
  - `@cleverbrush/knex-schema` / `@cleverbrush/orm`: add
    `InferDatabaseRow` / `InferDatabaseValue` row typing helpers and support raw
    update expressions plus conditional `where` callbacks in
    `onConflict().merge()`.
  - `@cleverbrush/orm-cli`: add read-only `cb-orm validate` for live schema drift
    checks.

  Docs and package READMEs were updated; see https://docs.cleverbrush.com.

### Patch Changes

- Updated dependencies [c75bff4]
  - @cleverbrush/server@4.4.0
  - @cleverbrush/schema@4.4.0

## 4.3.2

### Patch Changes

- 1556ad1: Prepare a patch release with website SEO, AI-readiness, accessibility, and
  privacy compliance updates.
- Updated dependencies [1556ad1]
  - @cleverbrush/schema@4.3.2
  - @cleverbrush/server@4.3.2

## 4.3.1

### Patch Changes

- Updated dependencies [0bc2959]
  - @cleverbrush/server@4.3.1
  - @cleverbrush/schema@4.3.1

## 4.3.0

### Patch Changes

- @cleverbrush/schema@4.3.0
- @cleverbrush/server@4.3.0

## 4.2.0

### Minor Changes

- c0bd823: Add `.public()` method to `EndpointBuilder`, `ScopedEndpointFactory`, and `SubscriptionBuilder` to explicitly mark endpoints as public (no authentication required). The server's authentication middleware now skips costly `authenticate()` calls for public endpoints, and the client skips sending `Authorization` headers and WS `?token=` query parameters for endpoints with `authRoles === null`.

### Patch Changes

- Updated dependencies [c0bd823]
  - @cleverbrush/server@4.2.0
  - @cleverbrush/schema@4.2.0

## 4.1.0

### Minor Changes

- 4609106: feat(client): optimistic update + offline support + tag-based cache invalidation

  - Add `optimisticUpdate()` middleware — tags mutations with IDs and tracks network failures
  - Add `offlineQueue()` middleware — queues mutations when offline, replays on reconnect
  - Add `useOptimisticMutation()` React hook — automatic TanStack Query cache snapshot/rollback
  - Add `OfflineError` class extending `NetworkError`
  - Extend `PerCallOverrides` with `optimisticUpdate` and `offlineQueue` keys

  feat(server, client): tag-based cache invalidation via `.clearsCacheTag()` endpoint annotations

  - Add `.clearsCacheTag(name[, selector])` to `EndpointBuilder` — declare cache tags with optional property selectors
  - Add `CacheTagDefinition`, `CacheTagPropertyAccessor`, `createCacheTagTree`, `serializeTag`, `computeCacheKey` to `@cleverbrush/server`
  - Add `cacheTags()` middleware to `@cleverbrush/client/cache` — tag-keyed HTTP caching with automatic invalidation on mutations
  - Add `CacheTagMiddlewareOptions` with `ttlByTag`, `defaultTtl`, `condition`
  - Add `cacheTags` and `headers` fields to `EndpointMeta` for middleware introspection
  - Add implicit TanStack Query invalidation in `useMutation` when endpoint declares cache tags
  - Add `CacheTagSelector` type for IDE autocomplete in `.clearsCacheTag()` selector callbacks

  feat(server, client): request idempotency middleware

  - Add `idempotency()` server middleware — stores responses keyed by `X-Idempotency-Key` header, replays stored response on duplicate keys
  - Add `idempotency()` client middleware — auto-generates UUID v4 as `X-Idempotency-Key` header for mutating requests, preserves key across retries
  - Export `IdempotencyOptions` (client) and `ServerIdempotencyOptions` (server)
  - Add `cacheResponse()` server middleware — tag-based server-side response caching with handler-level invalidation

### Patch Changes

- Updated dependencies [9e9bb4c]
- Updated dependencies [4609106]
- Updated dependencies [733b6f4]
- Updated dependencies [7527294]
  - @cleverbrush/schema@4.1.0
  - @cleverbrush/server@4.1.0

## 4.0.0

### Patch Changes

- Updated dependencies [9235c76]
- Updated dependencies [3bfc1e1]
- Updated dependencies [cbdfa69]
  - @cleverbrush/server@4.0.0
  - @cleverbrush/schema@4.0.0

## 3.1.0

### Patch Changes

- Updated dependencies [25da8ac]
  - @cleverbrush/server@3.1.0
  - @cleverbrush/schema@3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/schema@3.0.1
  - @cleverbrush/server@3.0.1

## 3.0.0

### Major Changes

- ed31f46: Add request batching support.

  **Client** (`@cleverbrush/client/batching`): new `batching()` middleware that coalesces concurrent HTTP requests into a single `POST /__batch`, then fans responses back to each caller transparently. Options: `maxSize`, `windowMs`, `batchPath`, `skip`.

  **Server** (`@cleverbrush/server`): new `ServerBuilder.useBatching(options?)` method that registers the `/__batch` endpoint. Sub-requests are processed through the full middleware and handler pipeline. Options: `path`, `maxSize`, `parallel`.

- 8979127: Add typed HTTP client (`@cleverbrush/client`) and API contract system.

  ### `@cleverbrush/client` (new package)

  - `createClient(contract, options)` — creates a two-level Proxy-based HTTP client
    from an API contract defined with `defineApi()`. All endpoint arguments (params,
    body, query, headers) and response types are inferred at compile time — zero
    code generation required.
  - `ApiError` — typed error class thrown on non-2xx responses, carrying `status`,
    `message`, and parsed `body`.
  - Type utilities: `EndpointCallArgs<E>`, `EndpointResponse<E>`, `TypedClient<T>`,
    `ClientOptions`.

  ### `@cleverbrush/server`

  - New `@cleverbrush/server/contract` entry point — browser-safe re-exports of
    `endpoint`, `EndpointBuilder`, `route()`, `createEndpoints`, and type helpers
    without pulling in the Node.js server runtime.
  - `defineApi(contract)` — typed identity function that defines a one-level grouped
    API contract. Each group is a record of named `EndpointBuilder` instances.
    The returned contract is frozen to prevent accidental mutation.
  - Exported types: `ApiContract`, `ApiGroup`.

  ### `@cleverbrush/schema`

  - `ParseStringSchemaBuilder.serialize(params)` — reverse of `validate()`.
    Reconstructs a string from the template by substituting parameter values.
    Used by `@cleverbrush/client` to build URL paths at runtime.

- 8d1a519: Add automatic WebSocket reconnection with exponential backoff and AsyncAPI 3.0 document generation.

  ### `@cleverbrush/client`

  - Add `SubscriptionReconnectOptions` interface with `maxRetries`, `delay`, `jitter`, `backoffLimit`, and `shouldReconnect` fields.
  - Add `subscriptionReconnect` option to `ClientOptions` for setting a global reconnection policy.
  - Add `reconnect` argument to subscription call args for per-call override (`false` disables reconnection even when a global policy is set; `true` uses the global policy; an object provides call-specific options).
  - Export `defaultSubscriptionDelay(attempt)` — the default backoff formula (`300 × 2^(attempt − 1)` ms, capped by `backoffLimit`, with ±25% jitter).
  - Reconnection is never triggered by manual `.close()`, `AbortSignal` aborts, or `iter.return()` — only by unexpected connection drops.
  - The `Subscription.state` transitions to `'reconnecting'` while a reconnect delay is in progress.

  ### `@cleverbrush/server`

  - Add `ServerBuilder.getSubscriptionRegistrations()` method to expose registered WebSocket subscription metadata for use by documentation generators.

  ### `@cleverbrush/server-openapi`

  - Add `generateAsyncApiSpec()` — converts `ServerBuilder` subscription registrations into an **AsyncAPI 3.0** document. Produces `channels` (with `address`, `messages`), `operations` (`send` for server→client events, `receive` for client→server messages), and `components.schemas` for named schemas.
  - Add `serveAsyncApi()` — middleware that lazily generates and caches the AsyncAPI document; serves it at a configurable path (default: `/asyncapi.json`).
  - Export `AsyncApiDocument`, `AsyncApiInfo`, `AsyncApiServerEntry`, `AsyncApiOptions`, and `ServeAsyncApiOptions` types.

- 4ee352a: Added middleware system and lifecycle hooks for request/response interception.
  Added resilience middlewares: retry (with exponential backoff, jitter, Retry-After), timeout, dedupe, and throttling cache — available as subpath exports (`@cleverbrush/client/retry`, `@cleverbrush/client/timeout`, `@cleverbrush/client/dedupe`, `@cleverbrush/client/cache`).
  Added granular error types: WebError, TimeoutError, NetworkError with type guard functions.
  Added per-call override support for middleware options (retry, timeout).
- 2c7b7c6: Add first-class WebSocket subscription support across the server and client libraries.

  ### `@cleverbrush/server`

  - Add `endpoint.subscription()` for defining typed WebSocket subscription endpoints in API contracts.
  - Add `SubscriptionBuilder`, `SubscriptionHandler`, `SubscriptionContext`, `tracked()`, and related subscription exports.
  - Extend `mapHandlers()` and `HandlerMap` to support subscription handlers alongside HTTP handlers.
  - Add WebSocket runtime support to `Server` for upgrade routing, frame parsing, incoming/outgoing validation, and tracked events.

  ### `@cleverbrush/client`

  - Detect subscription endpoints in `createClient()` and return typed `Subscription` handles instead of HTTP callables.
  - Add exported subscription utility types including `Subscription`, `SubscriptionCall`, `SubscriptionCallArgs`, `SubscriptionIncoming`, and `SubscriptionOutgoing`.
  - Add React `useSubscription()` and update the unified React client typing so subscription endpoints do not expose query hooks.
  - Fix proxy property resolution to ignore inherited prototype properties when accessing grouped client members.

### Patch Changes

- Updated dependencies [60efc99]
- Updated dependencies [2f06dc4]
- Updated dependencies [f0f93ba]
- Updated dependencies [0df3d59]
- Updated dependencies [0cc7cbe]
- Updated dependencies [181f89e]
- Updated dependencies [ed31f46]
- Updated dependencies [4f266be]
- Updated dependencies [8979127]
- Updated dependencies [3473d7e]
- Updated dependencies [b8f1285]
- Updated dependencies [190e2fe]
- Updated dependencies [5516e40]
- Updated dependencies [5516e40]
- Updated dependencies [3473d7e]
- Updated dependencies [308c9ea]
- Updated dependencies [8d1a519]
- Updated dependencies [26a7d85]
- Updated dependencies [190e2fe]
- Updated dependencies [2c7b7c6]
  - @cleverbrush/schema@3.0.0
  - @cleverbrush/server@3.0.0
