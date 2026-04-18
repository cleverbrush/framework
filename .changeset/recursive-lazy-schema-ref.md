---
'@cleverbrush/schema-json': major
'@cleverbrush/server-openapi': major
---

Add recursive / lazy schema support via `$ref`

`@cleverbrush/schema-json`: `toJsonSchema` now handles `lazy()` schemas. When the
resolved inner schema carries a name registered with the `nameResolver`, the output
is a `$ref` pointer — breaking recursive cycles. Schemas without a registered name
are inlined as-is.

`@cleverbrush/server-openapi`: `generateOpenApiSpec` now traverses through `lazy()`
boundaries during the schema-registry pre-pass so that self-referential schemas (e.g.
tree nodes) are registered in `components.schemas`. The body / response schema
conversion then emits the correct `$ref` pointers to break recursive cycles, and
the component definition itself is expanded exactly once.
