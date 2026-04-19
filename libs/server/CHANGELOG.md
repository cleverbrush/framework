# @cleverbrush/server

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/auth@3.0.1
  - @cleverbrush/di@3.0.1
  - @cleverbrush/schema@3.0.1

## 3.0.0

### Major Changes

- ed31f46: Add request batching support.

  **Client** (`@cleverbrush/client/batching`): new `batching()` middleware that coalesces concurrent HTTP requests into a single `POST /__batch`, then fans responses back to each caller transparently. Options: `maxSize`, `windowMs`, `batchPath`, `skip`.

  **Server** (`@cleverbrush/server`): new `ServerBuilder.useBatching(options?)` method that registers the `/__batch` endpoint. Sub-requests are processed through the full middleware and handler pipeline. Options: `path`, `maxSize`, `parallel`.

- 4f266be: Add `@cleverbrush/server` — schema-first HTTP server framework

  A new HTTP server library built on Node.js `http`/`https` that integrates tightly with `@cleverbrush/schema` for request validation and `@cleverbrush/di` for dependency injection.

  ### Key Features

  - **Endpoint builder** — fluent `endpoint.get('/users').body(schema).query(schema).authorize()` API; fully typed handler context inferred from the builder.
  - **Action results** — `ActionResult.ok()`, `.created()`, `.noContent()`, `.redirect()`, `.file()`, `.stream()`, `.status()` — no manual `res.end()`.
  - **Content negotiation** — pluggable `ContentTypeHandler` registry; JSON registered by default; honours the `Accept` header.
  - **Middleware pipeline** — `server.use(middleware)` for global middleware; per-endpoint middleware via `handle(ep, handler, { middlewares })`.
  - **DI integration** — `endpoint.inject({ db: IDbContext })` resolves services per-request from `@cleverbrush/di`.
  - **Authentication & authorization** — `server.useAuthentication()` / `server.useAuthorization()` wired to `@cleverbrush/auth` schemes and policies.
  - **RFC 9457 Problem Details** — validation errors and HTTP errors are serialized as `application/problem+json`.
  - **`route()` helper** — typed path builder using `ParseStringSchemaBuilder` segments for fully type-safe path parameters.
  - **Health check** — optional `/healthz` endpoint via `server.withHealthcheck()`.
  - **OpenAPI-ready** — `getRegistrations()` exposes endpoint metadata consumed by `@cleverbrush/server-openapi`.

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

- 3473d7e: Add `.producesFile()` to `EndpointBuilder` for binary / file response metadata

  - New `.producesFile(contentType?, description?)` method on `EndpointBuilder`
  - When set, OpenAPI spec emits `content: { '<contentType>': { schema: { type: 'string', format: 'binary' } } }` instead of a JSON schema entry
  - Defaults to `application/octet-stream` when no content type is specified
  - Takes precedence over `.returns()` for response schema emission
  - File download endpoints now show proper response bodies in generated docs

- 190e2fe: Add `externalDocs`, `links`, and `callbacks` to `EndpointBuilder`.

  - `.externalDocs(url, description?)` — attaches external documentation to an operation; emitted as `externalDocs` on the OpenAPI Operation Object.
  - `.links(defs)` — declares follow-up links from a response; emitted under the primary 2xx response's `links` map. Parameters can be raw runtime expression strings or a typed callback `(response) => Record<string, unknown>` that resolves property descriptors to `$response.body#/<pointer>` expressions automatically.
  - `.callbacks(defs)` — declares async out-of-band callbacks; emitted as `callbacks` on the OpenAPI Operation Object. The callback URL can be a raw `expression` string or a typed `urlFrom` callback that resolves to a `{$request.body#/<pointer>}` expression from the request body schema.

  All three fields are surfaced in `EndpointMetadata` and exported as `PropertyRefTree<T>`, `LinkDefinition<TResponse>`, and `CallbackDefinition<TBody>` types from `@cleverbrush/server`.

- 5516e40: Add `.produces()` to `EndpointBuilder` for declaring multiple response content types. The OpenAPI generator now emits a multi-entry `content` map when additional MIME types are declared. An optional per-type schema override is supported; when absent, the default JSON response schema is reused. `producesFile` takes precedence when both are set.
- 5516e40: Add `.responseHeaders()` to `EndpointBuilder` for documenting response headers. The OpenAPI generator now emits a `headers` map on every response code when a header schema is declared. Each property in the object schema becomes a named header entry with its sub-schema and optional description.
- 3473d7e: Add `.example()` to `SchemaBuilder` and `.example()` / `.examples()` to `EndpointBuilder`

  **Schema-level examples:**

  - New `.example(value)` method on `SchemaBuilder` stores a typed example value
  - `toJsonSchema()` emits the value as a JSON Schema `examples` array
  - Flows through to OpenAPI parameter and response schemas automatically

  **Endpoint-level examples:**

  - New `.example(value)` method on `EndpointBuilder` sets a single request body example
  - New `.examples(map)` method sets named examples with `{ summary?, description?, value }`
  - Both emit on the OpenAPI Media Type Object (`application/json`)
  - Pre-fills "Try it out" in Swagger UI without manual editing

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

- 190e2fe: Add webhook support via `defineWebhook` and `ServerBuilder.webhook()`.

  - `defineWebhook(name, options)` — creates a `WebhookDefinition` describing an async out-of-band request your API sends to subscribers.
  - `ServerBuilder.webhook(def)` — registers a webhook definition for documentation purposes (webhooks are not served as HTTP routes).
  - `ServerBuilder.getWebhooks()` — returns all registered webhook definitions.
  - `generateOpenApiSpec` now accepts a `webhooks` option and emits a top-level `webhooks` map in the generated OpenAPI 3.1 document.

  `WebhookDefinition` is exported from `@cleverbrush/server`.

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

- Updated dependencies [4f266be]
- Updated dependencies [60efc99]
- Updated dependencies [346bcdd]
- Updated dependencies [2f06dc4]
- Updated dependencies [f0f93ba]
- Updated dependencies [0df3d59]
- Updated dependencies [0cc7cbe]
- Updated dependencies [181f89e]
- Updated dependencies [8979127]
- Updated dependencies [b8f1285]
- Updated dependencies [44077df]
- Updated dependencies [3473d7e]
- Updated dependencies [308c9ea]
- Updated dependencies [26a7d85]
  - @cleverbrush/auth@3.0.0
  - @cleverbrush/schema@3.0.0
  - @cleverbrush/di@3.0.0
