---
'@cleverbrush/schema': major
'@cleverbrush/schema-json': major
---

Emit the OpenAPI `discriminator` keyword for discriminated unions

**`@cleverbrush/schema`** — `UnionSchemaBuilder.introspect()` now exposes
`discriminatorPropertyName: string | undefined`. When all union branches are
object schemas sharing a required property with unique literal values, this
field returns the property name (e.g. `'type'`). Otherwise it is `undefined`.

**`@cleverbrush/schema-json`** — `toJsonSchema()` emits
`discriminator: { propertyName }` alongside `anyOf` for discriminated unions.
When a `nameResolver` is provided and union branches resolve to `$ref` pointers,
a `mapping` object is also emitted mapping each discriminator value to its
corresponding `$ref` path.

This enables code-generation consumers (openapi-generator, orval, etc.) to
produce proper tagged union types from the generated OpenAPI specs.

`@cleverbrush/server-openapi` benefits automatically — no code changes needed
in that package.
