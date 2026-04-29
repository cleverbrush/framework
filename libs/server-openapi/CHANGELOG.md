# @cleverbrush/server-openapi

## 4.0.0

### Patch Changes

- Updated dependencies [9235c76]
- Updated dependencies [3bfc1e1]
- Updated dependencies [cbdfa69]
  - @cleverbrush/server@4.0.0
  - @cleverbrush/schema@4.0.0
  - @cleverbrush/schema-json@4.0.0
  - @cleverbrush/auth@4.0.0

## 3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/auth@3.0.1
  - @cleverbrush/schema@3.0.1
  - @cleverbrush/schema-json@3.0.1
  - @cleverbrush/server@3.0.1

## 3.0.0

### Major Changes

- 4f266be: Add `@cleverbrush/server-openapi` — OpenAPI 3.1 spec generation for `@cleverbrush/server`

  Generates OpenAPI 3.1 specification documents from `@cleverbrush/server` endpoint registrations and optionally serves the spec as a JSON endpoint.

  ### Key Features

  - **`generateOpenApiSpec(options)`** — converts endpoint registrations, body/query/header/response schemas, and auth config into a full OpenAPI 3.1 document.
  - **Schema conversion** — `convertSchema()` maps `@cleverbrush/schema` builders to JSON Schema Draft 2020-12 objects via `@cleverbrush/schema-json`.
  - **Path resolution** — `resolvePath()` converts both colon-style paths (`:id`) and `ParseStringSchemaBuilder` templates to OpenAPI `{param}` format with parameter type schemas.
  - **Security mapping** — `mapSecuritySchemes()` and `mapOperationSecurity()` translate `@cleverbrush/auth` authentication schemes to OpenAPI `securitySchemes` and per-operation `security` arrays.
  - **`serveOpenApi(options)`** — middleware that lazily generates and serves the spec at a configurable path (default `/openapi.json`).
  - **`createOpenApiEndpoint(options)`** — alternative to middleware: returns a typed endpoint + handler pair to register with `ServerBuilder.handle()`.
  - **CLI** — `writeOpenApiSpec()` writes the spec to a file; usable from build scripts or as a bin command.

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
- 44077df: Auto-detect OAuth 2.0 and OpenID Connect security schemes from `AuthenticationConfig`. Schemes created with `authorizationCodeScheme()`, `clientCredentialsScheme()`, or `oidcScheme()` are now automatically mapped to the correct OpenAPI `oauth2` or `openIdConnect` security scheme objects, including flow URLs and scopes.
- 537605c: Add recursive / lazy schema support via `$ref`

  `@cleverbrush/schema-json`: `toJsonSchema` now handles `lazy()` schemas. When the
  resolved inner schema carries a name registered with the `nameResolver`, the output
  is a `$ref` pointer — breaking recursive cycles. Schemas without a registered name
  are inlined as-is.

  `@cleverbrush/server-openapi`: `generateOpenApiSpec` now traverses through `lazy()`
  boundaries during the schema-registry pre-pass so that self-referential schemas (e.g.
  tree nodes) are registered in `components.schemas`. The body / response schema
  conversion then emits the correct `$ref` pointers to break recursive cycles, and
  the component definition itself is expanded exactly once.

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

- 308c9ea: Add `.schemaName()` and `components/schemas` `$ref` deduplication

  ### `@cleverbrush/schema`

  New method `.schemaName(name: string)` on every schema builder. Attaches an OpenAPI component name to the schema as runtime metadata (accessible via `.introspect().schemaName`). Has no effect on validation. Follows the same immutable-builder pattern as `.describe()`.

  ```ts
  import { object, string, number } from "@cleverbrush/schema";

  export const UserSchema = object({
    id: number(),
    name: string(),
  }).schemaName("User");

  UserSchema.introspect().schemaName; // 'User'
  ```

  ### `@cleverbrush/schema-json`

  New optional `nameResolver` option on `toJsonSchema()`. When provided, it is called for every schema node during recursive conversion. Returning a non-null string short-circuits conversion and emits a `$ref` pointer instead:

  ```ts
  toJsonSchema(schema, {
    $schema: false,
    nameResolver: (s) => s.introspect().schemaName ?? null,
  });
  ```

  ### `@cleverbrush/server-openapi`

  Named schemas are now automatically collected into `components.schemas` and referenced via `$ref` throughout the generated OpenAPI document:

  ```ts
  import { object, string, number, array } from '@cleverbrush/schema';
  import { generateOpenApiSpec } from '@cleverbrush/server-openapi';
  import { endpoint } from '@cleverbrush/server';

  export const UserSchema = object({ id: number(), name: string() })
      .schemaName('User');

  const GetUser   = endpoint.get('/users/:id').returns(UserSchema);
  const ListUsers = endpoint.get('/users').returns(array(UserSchema));

  // Both operations emit $ref: '#/components/schemas/User'
  // A single components.schemas.User entry holds the full definition.
  generateOpenApiSpec({ registrations: [...], info: { title: 'API', version: '1' } });
  ```

  Two different schema instances with the same name throw at generation time — uniqueness is the caller's responsibility.

  New exports from `@cleverbrush/server-openapi`:

  - `SchemaRegistry` — low-level registry class (for custom tooling)
  - `walkSchemas` — recursive schema walker used by the pre-pass

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

- d8b0ee1: Add top-level `tags` with descriptions to OpenAPI spec generation

  New `OpenApiTag` interface and optional `tags` field on `OpenApiOptions`:

  ```ts
  generateOpenApiSpec({
    registrations,
    info: { title: "My API", version: "1.0.0" },
    tags: [
      { name: "users", description: "User management endpoints" },
      { name: "orders", description: "Order management endpoints" },
    ],
  });
  // spec.tags → [{ name: 'users', description: '...' }, { name: 'orders', description: '...' }]
  ```

  When `tags` is omitted, unique tag names are still auto-collected from all registered endpoints and emitted as name-only entries. Explicit tag entries take precedence; any endpoint tag names not covered by the explicit list are appended alphabetically.

- 190e2fe: Add webhook support via `defineWebhook` and `ServerBuilder.webhook()`.

  - `defineWebhook(name, options)` — creates a `WebhookDefinition` describing an async out-of-band request your API sends to subscribers.
  - `ServerBuilder.webhook(def)` — registers a webhook definition for documentation purposes (webhooks are not served as HTTP routes).
  - `ServerBuilder.getWebhooks()` — returns all registered webhook definitions.
  - `generateOpenApiSpec` now accepts a `webhooks` option and emits a top-level `webhooks` map in the generated OpenAPI 3.1 document.

  `WebhookDefinition` is exported from `@cleverbrush/server`.

### Patch Changes

- Updated dependencies [4f266be]
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
- Updated dependencies [44077df]
- Updated dependencies [537605c]
- Updated dependencies [5516e40]
- Updated dependencies [3473d7e]
- Updated dependencies [308c9ea]
- Updated dependencies [8d1a519]
- Updated dependencies [26a7d85]
- Updated dependencies [190e2fe]
- Updated dependencies [2c7b7c6]
  - @cleverbrush/auth@3.0.0
  - @cleverbrush/schema@3.0.0
  - @cleverbrush/server@3.0.0
  - @cleverbrush/schema-json@3.0.0
