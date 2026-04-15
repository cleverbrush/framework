---
'@cleverbrush/schema': minor
'@cleverbrush/schema-json': minor
'@cleverbrush/server': minor
'@cleverbrush/server-openapi': minor
---

Add `.example()` to `SchemaBuilder` and `.example()` / `.examples()` to `EndpointBuilder`

**Schema-level examples:**
- New `.example(value)` method on `SchemaBuilder` stores a typed example value
- `toJsonSchema()` emits the value as a JSON Schema `examples` array
- Flows through to OpenAPI parameter and response schemas automatically

**Endpoint-level examples:**
- New `.example(value)` method on `EndpointBuilder` sets a single request body example
- New `.examples(map)` method sets named examples with `{ summary?, description?, value }`
- Both emit on the OpenAPI Media Type Object (`application/json`)
- Pre-fills "Try it out" in Swagger UI without manual editing
