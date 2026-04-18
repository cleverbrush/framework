---
'@cleverbrush/server-openapi': major
---

Add `@cleverbrush/server-openapi` — OpenAPI 3.1 spec generation for `@cleverbrush/server`

Generates OpenAPI 3.1 specification documents from `@cleverbrush/server` endpoint registrations and optionally serves the spec as a JSON endpoint.

### Key Features

- **`generateOpenApiSpec(options)`** — converts endpoint registrations, body/query/header/response schemas, and auth config into a full OpenAPI 3.1 document.
- **Schema conversion** — `convertSchema()` maps `@cleverbrush/schema` builders to JSON Schema Draft 2020-12 objects via `@cleverbrush/schema-json`.
- **Path resolution** — `resolvePath()` converts both colon-style paths (`:id`) and `ParseStringSchemaBuilder` templates to OpenAPI `{param}` format with parameter type schemas.
- **Security mapping** — `mapSecuritySchemes()` and `mapOperationSecurity()` translate `@cleverbrush/auth` authentication schemes to OpenAPI `securitySchemes` and per-operation `security` arrays.
- **`serveOpenApi(options)`** — middleware that lazily generates and serves the spec at a configurable path (default `/openapi.json`).
- **`createOpenApiEndpoint(options)`** — alternative to middleware: returns a typed endpoint + handler pair to register with `ServerBuilder.handle()`.
- **CLI** — `writeOpenApiSpec()` writes the spec to a file; usable from build scripts or as a bin command.
