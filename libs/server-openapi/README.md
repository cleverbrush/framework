# @cleverbrush/server-openapi

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)

OpenAPI 3.1 specification generation for [`@cleverbrush/server`](../server). Converts endpoint registrations, schema definitions, and authentication configuration into a fully-formed OpenAPI document — no annotations, no decorators.

## Features

- **`generateOpenApiSpec()`** — converts `@cleverbrush/server` endpoint registrations into an OpenAPI 3.1 document.
- **Schema conversion** — maps `@cleverbrush/schema` builders to JSON Schema Draft 2020-12 via `@cleverbrush/schema-json`.
- **Path resolution** — converts both colon-style paths (`:id`) and `ParseStringSchemaBuilder` templates to OpenAPI `{param}` format with per-parameter schemas.
- **Security mapping** — translates `@cleverbrush/auth` authentication schemes to OpenAPI `securitySchemes`; maps per-endpoint `authorize()` to `security` arrays. Auto-detects OAuth 2.0 flows (`authorizationCodeScheme`, `clientCredentialsScheme`) and OpenID Connect (`oidcScheme`).
- **Top-level tags** — pass `tags: [{ name, description?, externalDocs? }]` to `OpenApiOptions`; tag names are also auto-collected from endpoint registrations.
- **Request body examples** — emit `example` / `examples` on Media Type Objects via `.example()` and `.examples()` on `EndpointBuilder`. Schema-level examples propagate automatically.
- **Binary / file responses** — `.producesFile(contentType?, description?)` emits binary content types instead of JSON schemas for file download endpoints.
- **Multiple content types** — `.produces({ 'text/csv': {}, 'application/xml': { schema } })` emits a multi-entry `content` map for content-negotiated endpoints; an optional per-type schema override is supported.
- **Response headers** — `.responseHeaders(schema)` documents response headers (`X-Total-Count`, rate-limit, cache-control, etc.) across every response code; each property becomes a named header entry with schema and description.
- **External docs** — `.externalDocs(url, description?)` attaches an `externalDocs` object to the OpenAPI Operation Object.
- **Links** — `.links(defs)` declares follow-up links from a response; emitted under the primary 2xx response's `links` map. Parameters can be raw runtime expression strings or a type-safe callback `(response) => Record<string, unknown>` where property accesses are resolved to `$response.body#/<pointer>` expressions automatically.
- **Callbacks** — `.callbacks(defs)` declares async out-of-band callbacks on the Operation Object. The callback URL can be a raw `expression` string or a type-safe `urlFrom` callback resolved from the request body schema via property descriptors.
- **Webhooks** — pass `webhooks: [defineWebhook('name', options)]` to `OpenApiOptions` (and register via `ServerBuilder.webhook(def)`) to emit a top-level `webhooks` map in the OpenAPI document.
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
        server,
        info: { title: 'My API', version: '1.0.0' }
    }))
    .handle(GetUser, ({ params }) => ({ id: params.id }));

await server.listen(3000);
// GET /openapi.json → OpenAPI 3.1 document
```

When `server` is provided, endpoint registrations, authentication config, and webhooks are derived automatically. You can still pass `getRegistrations`, `authConfig`, or `webhooks` explicitly to override any server-derived value.

## Generating the Spec

### As middleware (recommended)

```ts
import { serveOpenApi } from '@cleverbrush/server-openapi';

server.use(serveOpenApi({
    server,
    info: { title: 'My API', version: '1.0.0' },
    servers: [{ url: 'https://api.example.com', description: 'Production' }],
    path: '/openapi.json'   // default
}));
```

### As a registered endpoint

```ts
import { createOpenApiEndpoint } from '@cleverbrush/server-openapi';

const { endpoint: openApiEp, handler } = createOpenApiEndpoint({
    server,
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

## $ref Deduplication (Named Schemas)

When the same schema definition is used by multiple endpoints, you can mark it with `.schemaName()` from `@cleverbrush/schema` so that `generateOpenApiSpec()` extracts it once into `components/schemas` and replaces every inline occurrence with a `$ref` pointer.

### How it works

1. Call `.schemaName('ComponentName')` on any `@cleverbrush/schema` builder you want to extract.
2. Export the result as a **constant** and reuse the same reference wherever the schema is needed.
3. `generateOpenApiSpec()` detects all named schemas via a pre-pass walk, emits them under `components.schemas`, and replaces inline definitions with `$ref` pointers.

```ts
import { object, string, number, array } from '@cleverbrush/schema';
import { endpoint } from '@cleverbrush/server';
import { generateOpenApiSpec } from '@cleverbrush/server-openapi';

// Mark once — reuse everywhere
const UserSchema = object({
    id:   number(),
    name: string(),
}).schemaName('User');

const GetUser   = endpoint.get('/api/users/:id').returns(UserSchema);
const ListUsers = endpoint.get('/api/users').returns(array(UserSchema));

const spec = generateOpenApiSpec({
    registrations: [GetUser.registration, ListUsers.registration],
    info: { title: 'My API', version: '1.0.0' }
});
// components.schemas.User → { type: 'object', properties: { id: …, name: … } }
// GET /api/users/:id  → responses.200.content['application/json'].schema: { $ref: '#/components/schemas/User' }
// GET /api/users      → responses.200.content['application/json'].schema: { type: 'array', items: { $ref: '…/User' } }
```

Nested named schemas inside request bodies are also resolved:

```ts
const AddressSchema = object({ street: string(), city: string() }).schemaName('Address');

// The wrapper is anonymous — inlined. The nested AddressSchema → $ref.
const CreateUserBody = object({ address: AddressSchema, name: string() });
```

### Conflict rule

Registering **two different schema instances** under the same name throws immediately during spec generation:

```ts
const A = object({ x: string() }).schemaName('Thing');
const B = object({ y: number() }).schemaName('Thing'); // different instance!

generateOpenApiSpec({ registrations: [...], info: { … } });
// Error: Schema name "Thing" is already registered by a different schema instance.
```

Re-registering the **same** instance (because it appears in multiple endpoints) is a no-op.

### `SchemaRegistry` (advanced)

`SchemaRegistry` and `walkSchemas` are also exported from `@cleverbrush/server-openapi` for custom tooling:

```ts
import { SchemaRegistry, walkSchemas } from '@cleverbrush/server-openapi';

const registry = new SchemaRegistry();
walkSchemas(MySchema, registry);

registry.getName(MySchema);    // 'MyComponentName' | null
registry.entries();            // IterableIterator<[name, SchemaBuilder]>
registry.isEmpty;              // boolean
```

## Discriminated Unions

When a request body, response, or parameter schema is a **discriminated union** — all branches are objects sharing a required property with unique literal values — the generated spec automatically includes the OpenAPI `discriminator` keyword alongside `anyOf`.

If the union branches use `.schemaName()` and are extracted as `$ref` components, the `discriminator` also includes a `mapping` from each literal value to its `$ref` path:

```ts
const Cat = object({ type: string('cat'), name: string() }).schemaName('Cat');
const Dog = object({ type: string('dog'), breed: string() }).schemaName('Dog');
const PetBody = union(Cat).or(Dog);

const CreatePet = endpoint.post('/api/pets').body(PetBody);

// Generated spec:
// requestBody.content['application/json'].schema:
// {
//   anyOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
//   discriminator: { propertyName: 'type', mapping: { cat: '#/components/schemas/Cat', dog: '#/components/schemas/Dog' } }
// }
```

Code generators like openapi-generator and orval use the `discriminator` to produce proper tagged union types.

## Recursive Schemas

Self-referential schemas (tree nodes, nested menus, threaded comments) are
supported via `lazy()` from `@cleverbrush/schema`. Call `.schemaName()` on the
root schema and `generateOpenApiSpec` will:

1. Register the named schema in `components.schemas`, expanding its definition
   exactly once.
2. Replace every recursive reference inside the definition with the appropriate
   `$ref` pointer — breaking the cycle automatically.

```ts
import { object, number, array, lazy } from '@cleverbrush/schema';

type TreeNode = { value: number; children: TreeNode[] };

// TypeScript needs an explicit annotation for recursive types
const treeNode: ReturnType<typeof object> = object({
    value: number(),
    children: array(lazy(() => treeNode))
}).schemaName('TreeNode');

// Use treeNode as a body / response schema — no extra configuration needed
const CreateTree = endpoint.post('/api/tree').body(treeNode);
```

Generated spec (abbreviated):

```yaml
components:
  schemas:
    TreeNode:
      type: object
      properties:
        value:  { type: integer }
        children:
          type: array
          items: { $ref: '#/components/schemas/TreeNode' }
paths:
  /api/tree:
    post:
      requestBody:
        content:
          application/json:
            schema: { $ref: '#/components/schemas/TreeNode' }
```

## Request Body Examples

Pre-fill the **Try it out** panel in Swagger UI by attaching examples to endpoints.

### Single example

```ts
const CreateUser = endpoint
    .post('/api/users')
    .body(UserSchema)
    .example({ name: 'Alice', email: 'alice@example.com' });
```

Emits `example` on the OpenAPI Media Type Object:

```yaml
requestBody:
  content:
    application/json:
      schema: { ... }
      example: { name: Alice, email: alice@example.com }
```

### Named examples

```ts
const CreateUser = endpoint
    .post('/api/users')
    .body(UserSchema)
    .examples({
        minimal: { summary: 'Minimal', value: { name: 'Alice' } },
        full: {
            summary: 'Complete',
            description: 'A fully populated user',
            value: { name: 'Alice', email: 'alice@example.com', age: 30 }
        }
    });
```

### Schema-level examples

Examples attached directly to schemas via `.example()` propagate to parameter and response schemas in the generated spec:

```ts
const PageParam = number().example(1);
const UserResponse = object({ id: number(), name: string() }).example({ id: 1, name: 'Alice' });
```

## Binary / File Responses

Use `.producesFile()` to declare that an endpoint returns a binary file instead of JSON. The generated spec emits the appropriate binary content type.

```ts
const ExportCsv = endpoint
    .get('/api/export')
    .producesFile('text/csv', 'CSV export');

const Download = endpoint
    .get('/api/download')
    .producesFile(); // defaults to application/octet-stream
```

Produces:

```yaml
responses:
  '200':
    description: CSV export
    content:
      text/csv:
        schema: { type: string, format: binary }
```

When both `.returns()` and `.producesFile()` are set, the binary response takes precedence.

## Authentication & Security Schemes

When you pass the `server` option, authentication configuration is picked up automatically from `server.getAuthenticationConfig()`. Security schemes and per-operation `security` arrays are generated without any extra configuration:

```ts
import { jwtScheme } from '@cleverbrush/auth';

const server = new ServerBuilder()
    .useAuthentication({
        defaultScheme: 'jwt',
        schemes: [jwtScheme({ secret: '...', mapClaims: c => c })]
    })
    .useAuthorization();

server.use(serveOpenApi({
    server,
    info: { title: 'My API', version: '1.0.0' }
}));
```

You can also pass `authConfig` explicitly (useful when not using the `server` option):

```ts
server.use(serveOpenApi({
    getRegistrations: () => server.getRegistrations(),
    info: { title: 'My API', version: '1.0.0' },
    authConfig: server.getAuthenticationConfig()
}));
```

JWT schemes generate `{ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }`; cookie schemes generate `{ type: 'apiKey', in: 'cookie' }`.

## Top-Level Tags

OpenAPI supports a top-level `tags` array where each entry can carry a `description` and optional `externalDocs`. Pass a `tags` array to `generateOpenApiSpec()` (or any serving helper) to define them:

```ts
generateOpenApiSpec({
    registrations,
    info: { title: 'My API', version: '1.0.0' },
    tags: [
        {
            name: 'users',
            description: 'User management endpoints',
            externalDocs: { url: 'https://docs.example.com/users' }
        },
        { name: 'orders', description: 'Order management endpoints' }
    ]
});
```

When `tags` is omitted, unique tag names are automatically collected from all registered endpoints and emitted as name-only entries — so Swagger UI and Redoc still group operations correctly. Any endpoint tag not present in the explicit list is appended alphabetically.

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
