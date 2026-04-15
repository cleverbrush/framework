# OpenAPI Spec Generation — Improvement Plan

## TL;DR

Enhance `@cleverbrush/server-openapi` to produce richer, more accurate OpenAPI 3.1 specs by leveraging existing schema capabilities that are currently ignored and adding new metadata hooks in `@cleverbrush/server`. Prioritized by impact-to-effort ratio across 3 phases.

---

## Phase 1: Schema & OpenAPI improvements (no server changes)

These items only touch `libs/schema-json` and `libs/server-openapi`. High impact, low effort — start here.

### 1.1 Discriminated union → `discriminator` keyword - DONE

- **What**: The schema library already auto-detects discriminated unions (a shared field with unique literal values per branch). Neither `schema-json.toJsonSchema()` nor the OpenAPI generator emits the `discriminator` keyword.
- **Where**: `libs/schema-json/src/toJsonSchema.ts` — in the union branch of conversion, detect discriminated unions from introspect data and emit `discriminator: { propertyName: '...' }` alongside the `anyOf`.
- **Impact**: Critical for code-generation consumers (openapi-generator, orval, etc.) which use discriminators to produce proper tagged unions.

### 1.2 Component schemas with `$ref` deduplication - DONE

- **What**: All schemas are currently inlined recursively. Repeated schemas (e.g., the same `User` object in multiple endpoints) are duplicated in full. Add a `components.schemas` section with `$ref` pointers.
- **Where**: `libs/server-openapi/src/generateOpenApiSpec.ts` — add a schema registry that collects named schemas during generation and emits them under `components.schemas`. Reference via `$ref: '#/components/schemas/...'`.
- **Naming strategy**: Accept an explicit name via a schema extension (`.withExtension('openapi:name', 'User')`); fall back to the schema's `.describe()` text if it looks like a type name; otherwise skip registration and inline.
- **Impact**: Dramatically reduces spec size, improves readability, enables code generators to produce named types instead of anonymous inline objects.

### 1.3 Verify default values flow end-to-end - DONE

- **What**: `schema-json` already emits `default` for literal values. Add test coverage in the server-openapi layer to confirm the value reaches the generated spec for parameters and body schemas.
- **Where**: `libs/server-openapi/src/schemaConverter.test.ts`
- **Impact**: Low-effort confidence boost; uncovers any silent gaps.

### 1.4 Top-level tags with descriptions - DONE

- **What**: OpenAPI supports a top-level `tags` array with `name`, `description`, and optional `externalDocs`. Currently only operation-level tag strings are emitted; there is no way to attach a description to a tag group.
- **Where**: `libs/server-openapi/src/generateOpenApiSpec.ts` — add an optional `tags` field to `OpenApiOptions` (array of `{ name, description?, externalDocs? }`). Emit as the top-level `tags` array. Auto-collect unique tag names from registered endpoints as a fallback.
- **Impact**: Better documentation structure in Swagger UI / Redoc; consumer-facing docs look polished without extra tooling.

### 1.5 Recursive / circular schema support via `$ref`

- **What**: `LazySchemaBuilder` exists for self-referential schemas, but `schema-json` inlines everything, causing infinite recursion on conversion. Lazy schemas must be detected and emitted as `$ref` to a named entry in `components.schemas`.
- **Where**: `libs/schema-json/src/toJsonSchema.ts` — detect `type === 'lazy'`, resolve once, register under a generated name, return `$ref`. `libs/server-openapi/src/generateOpenApiSpec.ts` — collect these into `components`.
- **Depends on**: Step 1.2 ($ref infrastructure).
- **Impact**: Unblocks recursive data models — trees, linked lists, comment threads.

---

## Phase 2: Server + OpenAPI changes (medium effort, high impact)

These items require new metadata fields on `EndpointBuilder` / `EndpointMetadata` in `libs/server/src/Endpoint.ts` and corresponding consumers in `libs/server-openapi`.

### 2.1 `.example()` / `.examples()` on endpoints and schemas - DONE

- **Server**: Add `.example(value)` and `.examples(Record<string, { summary?, value }>)` to `EndpointBuilder`. Store in `EndpointMetadata`.
- **Schema**: Add `.example(value)` to `SchemaBuilder` base; store in `introspect()` output so it propagates through parameter and body schema conversion.
- **OpenAPI**: Emit `example` / `examples` on request body objects, response objects, and individual parameters.
- **Files**: `libs/server/src/Endpoint.ts`, `libs/schema/src/SchemaBuilder.ts`, `libs/server-openapi/src/generateOpenApiSpec.ts`
- **Impact**: Self-documenting APIs; Swagger UI "Try it out" gets pre-filled values without manual editing.

### 2.2 Binary / file / stream response metadata - DONE

- **Server**: Add `.producesFile(contentType?, description?)` to `EndpointBuilder`. Store in metadata.
- **OpenAPI**: When file metadata is present, emit `content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } }` rather than a JSON schema entry.
- **Files**: `libs/server/src/Endpoint.ts`, `libs/server-openapi/src/generateOpenApiSpec.ts` → `buildResponses()`
- **Impact**: File download endpoints currently show no response body in generated docs.

### 2.3 Multiple content types in responses - DONE

- **Server**: Add `.produces(...mediaTypes: string[])` to `EndpointBuilder`. Store negotiable content types in metadata.
- **OpenAPI**: Emit multiple entries in the `content` map for the relevant response code.
- **Files**: Same as 2.2.
- **Depends on**: Step 2.2 (same metadata pipeline).
- **Impact**: Accurately documents content-negotiated endpoints that serve both JSON and, say, CSV or XML.

### 2.4 Response headers metadata - DONE

- **Server**: Add `.responseHeaders(schema: ObjectSchemaBuilder)` to `EndpointBuilder` (same pattern as `.headers()`). Store in metadata.
- **OpenAPI**: Emit a `headers` map on response objects, with per-header name, schema, and description.
- **Files**: `libs/server/src/Endpoint.ts` (new metadata field), `libs/server-openapi/src/generateOpenApiSpec.ts` → `buildResponses()`
- **Impact**: Documents pagination headers (`X-Total-Count`), rate-limit headers, cache control, etc.

### 2.5 OAuth 2.0 / OpenID Connect security scheme support ✅ DONE

- **What**: Only JWT Bearer and cookie-based schemes are auto-detected today. OAuth 2.0 and OIDC are entirely unsupported.
- **OpenAPI**: Extend `mapSecuritySchemes()` to detect OAuth scheme types and emit `type: 'oauth2'` with the appropriate flows (authorizationCode, clientCredentials, password, implicit) and their scopes. Detect OIDC → `type: 'openIdConnect'` with `openIdConnectUrl`.
- **Auth library**: May require new OAuth/OIDC scheme types or configuration interfaces in `libs/auth`.
- **Files**: `libs/server-openapi/src/securityMapper.ts`, possibly `libs/auth/`
- **Impact**: Essential for any public-facing API using OAuth (e.g., social login, B2B tokens).

---

## Phase 3: Nice-to-have / Future (higher effort, niche impact)

| # | Feature | Notes |
|---|---------|-------|
| 3.1 | **Webhooks** (OpenAPI 3.1) ✅ | `defineWebhook()` + `ServerBuilder.webhook()` + `OpenApiOptions.webhooks`; emitted under top-level `webhooks` key |
| 3.2 | **Links between operations** ✅ | `.links(defs)` on `EndpointBuilder`; type-safe descriptor callback support |
| 3.3 | **Callbacks** ✅ | `.callbacks(defs)` on `EndpointBuilder`; `urlFrom` descriptor resolution |
| 3.4 | **API versioning strategy** | Version prefix in paths, or header/query versioning with spec-level hints |
| 3.5 | **`externalDocs` on operations** ✅ | `.externalDocs(url, description?)` on `EndpointBuilder` |

---

## Relevant Files

| File | Changes |
|------|---------|
| `libs/server-openapi/src/generateOpenApiSpec.ts` | `$ref` registry, tag descriptions, examples emission, file response handling, response headers |
| `libs/server-openapi/src/securityMapper.ts` | OAuth 2.0 / OIDC scheme detection |
| `libs/schema-json/src/toJsonSchema.ts` | Discriminator emission, lazy schema `$ref`, `$defs` collection |
| `libs/server/src/Endpoint.ts` | New `EndpointMetadata` fields + `EndpointBuilder` methods for examples, produces, responseHeaders |
| `libs/schema/src/SchemaBuilder.ts` | `.example(value)` on the base builder |

---

## Verification Checklist

1. Run existing tests after each step:
   ```
   npx turbo test --filter=@cleverbrush/server-openapi --filter=@cleverbrush/schema-json --filter=@cleverbrush/server
   ```
2. Add new tests for each feature (discriminator output, `$ref` deduplication, examples, file responses, OAuth schemes).
3. Generate a spec from `libs/todo-app` and validate with `swagger-cli validate` or the Swagger Editor.
4. Visually inspect the spec in Swagger UI / Redoc for correctness.
5. Test with `openapi-generator` or `orval` to verify client code generation with discriminators and `$ref`.

---

## Decisions

- **`$ref` naming**: prefer explicit `.withExtension('openapi:name', '...')` over magic derivation; fall back to the schema's `.describe()` text only if it looks like a PascalCase type name.
- **`$ref` deduplication ownership**: `server-openapi` does post-processing; `schema-json` continues to inline. This keeps `schema-json` general-purpose.
- **No `allOf` merging**: too complex, low ROI.
- **New `EndpointMetadata` fields**: all nullable (`| null`) with `null` defaults — non-breaking for existing consumers.
- **Phase 1 is self-contained**: can be done without touching `libs/server` at all.
- **Phase 2 items are independent of each other** and can be delivered incrementally.

## Open Questions

1. **`$ref` naming fallback** — Should auto-derivation from `.describe()` be supported, or require an explicit extension always? *Recommendation: support both; prefer explicit.*
2. **Schema-level `.example()`** — Worth the surface area on `SchemaBuilder`, or are endpoint-level examples sufficient? *Recommendation: add it — cheap, broadly useful, already part of JSON Schema.*
3. **Structural deduplication** — Should schemas without explicit names be deduplicated by structural equality (hashing)? *Recommendation: skip for now; explicit names only, to avoid fragile auto-generated names.*
