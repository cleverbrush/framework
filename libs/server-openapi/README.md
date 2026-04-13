# @cleverbrush/server-openapi

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)

OpenAPI 3.1 specification generation for [`@cleverbrush/server`](../server). Converts endpoint registrations, schema definitions, and authentication configuration into a fully-formed OpenAPI document — no annotations, no decorators.

## Features

- **`generateOpenApiSpec()`** — converts `@cleverbrush/server` endpoint registrations into an OpenAPI 3.1 document.
- **Schema conversion** — maps `@cleverbrush/schema` builders to JSON Schema Draft 2020-12 via `@cleverbrush/schema-json`.
- **Path resolution** — converts both colon-style paths (`:id`) and `ParseStringSchemaBuilder` templates to OpenAPI `{param}` format with per-parameter schemas.
- **Security mapping** — translates `@cleverbrush/auth` authentication schemes to OpenAPI `securitySchemes`; maps per-endpoint `authorize()` to `security` arrays.
- **`serveOpenApi()`** — middleware that lazily generates and caches the spec; serves it at a configurable path (default: `/openapi.json`).
- **`createOpenApiEndpoint()`** — returns a typed endpoint + handler pair for use with `ServerBuilder.handle()`.
- **CLI / build script** — `writeOpenApiSpec()` writes the spec to a file.

## Installation

```bash
npm install @cleverbrush/server-openapi @cleverbrush/server @cleverbrush/schema
```

## Quick Start

```ts
import { ServerBuilder, endpoint } from '@cleverbrush/server';
import { serveOpenApi } from '@cleverbrush/server-openapi';
import { object, string, number } from '@cleverbrush/schema';

const GetUser = endpoint
    .get('/api/users/:id')
    .summary('Get a user by ID')
    .tags('users');

const server = new ServerBuilder();

server
    .use(serveOpenApi({
        getRegistrations: () => server.getRegistrations(),
        info: { title: 'My API', version: '1.0.0' }
    }))
    .handle(GetUser, ({ params }) => ({ id: params.id }));

await server.listen(3000);
// GET /openapi.json → OpenAPI 3.1 document
```

## Generating the Spec

### As middleware (recommended)

```ts
import { serveOpenApi } from '@cleverbrush/server-openapi';

server.use(serveOpenApi({
    getRegistrations: () => server.getRegistrations(),
    info: { title: 'My API', version: '1.0.0' },
    servers: [{ url: 'https://api.example.com', description: 'Production' }],
    path: '/openapi.json'   // default
}));
```

### As a registered endpoint

```ts
import { createOpenApiEndpoint } from '@cleverbrush/server-openapi';

const { endpoint: openApiEp, handler } = createOpenApiEndpoint({
    getRegistrations: () => server.getRegistrations(),
    info: { title: 'My API', version: '1.0.0' }
});

server.handle(openApiEp, handler);
```

### Generating to a file (build scripts)

```ts
import { writeOpenApiSpec } from '@cleverbrush/server-openapi';

await writeOpenApiSpec({
    registrations: server.getRegistrations(),
    info: { title: 'My API', version: '1.0.0' },
    outputPath: './openapi.json'
});
```

## Authentication & Security Schemes

Pass the server's `AuthenticationConfig` to automatically generate `securitySchemes` and per-operation `security` arrays:

```ts
import { jwtScheme } from '@cleverbrush/auth';

const authConfig = {
    defaultScheme: 'jwt',
    schemes: [jwtScheme({ secret: '...', mapClaims: c => c })]
};

server.use(serveOpenApi({
    getRegistrations: () => server.getRegistrations(),
    info: { title: 'My API', version: '1.0.0' },
    authConfig
}));
```

JWT schemes generate `{ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }`; cookie schemes generate `{ type: 'apiKey', in: 'cookie' }`.

## OpenAPI Info

```ts
const info: OpenApiInfo = {
    title: 'My API',
    version: '2.0.0',
    description: 'Full description of my API.',
    termsOfService: 'https://example.com/tos',
    contact: { name: 'Support', email: 'support@example.com' },
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' }
};
```

## Path Parameters

Both path styles are supported:

```ts
// Colon style — converted to {id}
endpoint.get('/api/users/:id');

// ParseStringSchemaBuilder — type-safe, with schema
import { route } from '@cleverbrush/server';
import { object, number } from '@cleverbrush/schema';

endpoint.get(route(object({ id: number().coerce() }), $t => $t`/api/users/${t => t.id}`));
// produces path "/api/users/{id}" with schema { type: 'number' }
```

## License

BSD-3-Clause — see [LICENSE](../../LICENSE).
