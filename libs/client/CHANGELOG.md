# @cleverbrush/client

## 4.0.0

### Patch Changes

- Updated dependencies [25da8ac]
  - @cleverbrush/server@4.0.0
  - @cleverbrush/schema@4.0.0

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
