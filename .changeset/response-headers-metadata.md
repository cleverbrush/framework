---
'@cleverbrush/server': minor
'@cleverbrush/server-openapi': minor
---

Add `.responseHeaders()` to `EndpointBuilder` for documenting response headers. The OpenAPI generator now emits a `headers` map on every response code when a header schema is declared. Each property in the object schema becomes a named header entry with its sub-schema and optional description.
