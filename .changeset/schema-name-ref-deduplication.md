---
'@cleverbrush/schema': major
'@cleverbrush/schema-json': major
'@cleverbrush/server-openapi': major
---

Add `.schemaName()` and `components/schemas` `$ref` deduplication

### `@cleverbrush/schema`

New method `.schemaName(name: string)` on every schema builder. Attaches an OpenAPI component name to the schema as runtime metadata (accessible via `.introspect().schemaName`). Has no effect on validation. Follows the same immutable-builder pattern as `.describe()`.

```ts
import { object, string, number } from '@cleverbrush/schema';

export const UserSchema = object({
    id:   number(),
    name: string(),
}).schemaName('User');

UserSchema.introspect().schemaName; // 'User'
```

### `@cleverbrush/schema-json`

New optional `nameResolver` option on `toJsonSchema()`. When provided, it is called for every schema node during recursive conversion. Returning a non-null string short-circuits conversion and emits a `$ref` pointer instead:

```ts
toJsonSchema(schema, {
    $schema: false,
    nameResolver: s => s.introspect().schemaName ?? null,
});
```

### `@cleverbrush/server-openapi`

Named schemas are now automatically collected into `components.schemas` and referenced via `$ref` throughout the generated OpenAPI document:

```ts
import { object, string, number, array } from '@cleverbrush/schema';
import { generateOpenApiSpec } from '@cleverbrush/server-openapi';
import { endpoint } from '@cleverbrush/server';

export const UserSchema = object({ id: number(), name: string() })
    .schemaName('User');

const GetUser   = endpoint.get('/users/:id').returns(UserSchema);
const ListUsers = endpoint.get('/users').returns(array(UserSchema));

// Both operations emit $ref: '#/components/schemas/User'
// A single components.schemas.User entry holds the full definition.
generateOpenApiSpec({ registrations: [...], info: { title: 'API', version: '1' } });
```

Two different schema instances with the same name throw at generation time — uniqueness is the caller's responsibility.

New exports from `@cleverbrush/server-openapi`:
- `SchemaRegistry` — low-level registry class (for custom tooling)
- `walkSchemas` — recursive schema walker used by the pre-pass
