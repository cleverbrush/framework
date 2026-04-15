---
'@cleverbrush/server': minor
'@cleverbrush/server-openapi': minor
---

Add `.produces()` to `EndpointBuilder` for declaring multiple response content types. The OpenAPI generator now emits a multi-entry `content` map when additional MIME types are declared. An optional per-type schema override is supported; when absent, the default JSON response schema is reused. `producesFile` takes precedence when both are set.
