---
'@cleverbrush/client': major
'@cleverbrush/server': major
'@cleverbrush/schema': major
---

Add typed HTTP client (`@cleverbrush/client`) and API contract system.

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
