---
'@cleverbrush/server': major
'@cleverbrush/server-openapi': major
---

Add `externalDocs`, `links`, and `callbacks` to `EndpointBuilder`.

- `.externalDocs(url, description?)` — attaches external documentation to an operation; emitted as `externalDocs` on the OpenAPI Operation Object.
- `.links(defs)` — declares follow-up links from a response; emitted under the primary 2xx response's `links` map. Parameters can be raw runtime expression strings or a typed callback `(response) => Record<string, unknown>` that resolves property descriptors to `$response.body#/<pointer>` expressions automatically.
- `.callbacks(defs)` — declares async out-of-band callbacks; emitted as `callbacks` on the OpenAPI Operation Object. The callback URL can be a raw `expression` string or a typed `urlFrom` callback that resolves to a `{$request.body#/<pointer>}` expression from the request body schema.

All three fields are surfaced in `EndpointMetadata` and exported as `PropertyRefTree<T>`, `LinkDefinition<TResponse>`, and `CallbackDefinition<TBody>` types from `@cleverbrush/server`.
