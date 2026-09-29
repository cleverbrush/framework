---
"@cleverbrush/schema": minor
"@cleverbrush/schema-json": minor
"@cleverbrush/server-openapi": minor
---

Add optional-aware fallbacks and preprocessing, and automatic named schema
references through ordinary immutable use-site modifiers, without a wrapper API.
Shape, validation-rule, default, fallback and extension changes clear inherited
names; apply schemaName after those edits to establish a new named definition.
Preserve one canonical definition in JSON
Schema, OpenAPI and AsyncAPI with strict name collision checks. Keep existing
type inference and legacy optional null acceptance unchanged.
