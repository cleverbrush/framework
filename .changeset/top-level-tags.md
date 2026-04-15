---
'@cleverbrush/server-openapi': minor
---

Add top-level `tags` with descriptions to OpenAPI spec generation

New `OpenApiTag` interface and optional `tags` field on `OpenApiOptions`:

```ts
generateOpenApiSpec({
    registrations,
    info: { title: 'My API', version: '1.0.0' },
    tags: [
        { name: 'users',  description: 'User management endpoints' },
        { name: 'orders', description: 'Order management endpoints' }
    ]
});
// spec.tags → [{ name: 'users', description: '...' }, { name: 'orders', description: '...' }]
```

When `tags` is omitted, unique tag names are still auto-collected from all registered endpoints and emitted as name-only entries. Explicit tag entries take precedence; any endpoint tag names not covered by the explicit list are appended alphabetically.
