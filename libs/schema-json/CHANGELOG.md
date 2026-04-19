# @cleverbrush/schema-json

## 3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/schema@3.0.1

## 3.0.0

### Major Changes

- b8f1285: Emit the OpenAPI `discriminator` keyword for discriminated unions

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

- 537605c: Add recursive / lazy schema support via `$ref`

  `@cleverbrush/schema-json`: `toJsonSchema` now handles `lazy()` schemas. When the
  resolved inner schema carries a name registered with the `nameResolver`, the output
  is a `$ref` pointer — breaking recursive cycles. Schemas without a registered name
  are inlined as-is.

  `@cleverbrush/server-openapi`: `generateOpenApiSpec` now traverses through `lazy()`
  boundaries during the schema-registry pre-pass so that self-referential schemas (e.g.
  tree nodes) are registered in `components.schemas`. The body / response schema
  conversion then emits the correct `$ref` pointers to break recursive cycles, and
  the component definition itself is expanded exactly once.

- 3473d7e: Add `.example()` to `SchemaBuilder` and `.example()` / `.examples()` to `EndpointBuilder`

  **Schema-level examples:**

  - New `.example(value)` method on `SchemaBuilder` stores a typed example value
  - `toJsonSchema()` emits the value as a JSON Schema `examples` array
  - Flows through to OpenAPI parameter and response schemas automatically

  **Endpoint-level examples:**

  - New `.example(value)` method on `EndpointBuilder` sets a single request body example
  - New `.examples(map)` method sets named examples with `{ summary?, description?, value }`
  - Both emit on the OpenAPI Media Type Object (`application/json`)
  - Pre-fills "Try it out" in Swagger UI without manual editing

- 308c9ea: Add `.schemaName()` and `components/schemas` `$ref` deduplication

  ### `@cleverbrush/schema`

  New method `.schemaName(name: string)` on every schema builder. Attaches an OpenAPI component name to the schema as runtime metadata (accessible via `.introspect().schemaName`). Has no effect on validation. Follows the same immutable-builder pattern as `.describe()`.

  ```ts
  import { object, string, number } from "@cleverbrush/schema";

  export const UserSchema = object({
    id: number(),
    name: string(),
  }).schemaName("User");

  UserSchema.introspect().schemaName; // 'User'
  ```

  ### `@cleverbrush/schema-json`

  New optional `nameResolver` option on `toJsonSchema()`. When provided, it is called for every schema node during recursive conversion. Returning a non-null string short-circuits conversion and emits a `$ref` pointer instead:

  ```ts
  toJsonSchema(schema, {
    $schema: false,
    nameResolver: (s) => s.introspect().schemaName ?? null,
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

### Patch Changes

- Updated dependencies [60efc99]
- Updated dependencies [2f06dc4]
- Updated dependencies [f0f93ba]
- Updated dependencies [0df3d59]
- Updated dependencies [0cc7cbe]
- Updated dependencies [181f89e]
- Updated dependencies [8979127]
- Updated dependencies [b8f1285]
- Updated dependencies [3473d7e]
- Updated dependencies [308c9ea]
- Updated dependencies [26a7d85]
  - @cleverbrush/schema@3.0.0

## 2.0.0

### Major Changes

- 13ce119: # Release 2.0.0

  ## @cleverbrush/schema-json

  ### New Package

  Bidirectional JSON Schema (Draft 7 / 2020-12) interop for `@cleverbrush/schema`.

  - **`toJsonSchema(builder, options?)`** — converts any `@cleverbrush/schema` builder to a JSON Schema object. The output conforms to JSON Schema Draft 2020-12 and includes a `$schema` field. Optional `ToJsonSchemaOptions` control how the output is generated.
  - **`fromJsonSchema(jsonSchema)`** — converts a JSON Schema literal to a fully-typed `@cleverbrush/schema` builder. The input must be annotated with `as const` for precise TypeScript type inference. The returned builder is typed as `JsonSchemaNodeToBuilder<S>`, giving compile-time knowledge of the resulting schema type.
  - **`withStandardJsonSchema(schema)`** — wraps any `@cleverbrush/schema` builder to also conform to the `StandardJSONSchemaV1` interface from `@standard-schema/spec`. Useful for tooling that expects both a schema validator and a JSON Schema descriptor.
  - **Types** — `JsonSchemaNode` (union of all supported JSON Schema node shapes), `JsonSchemaNodeToBuilder<S>` (maps a JSON Schema type-literal to the corresponding builder type at compile time), `InferFromJsonSchema<S>` (infers the TypeScript type from a JSON Schema literal), `ToJsonSchemaOptions`.
  - **Re-exports** `StandardJSONSchemaV1` and `StandardTypedV1` from `@standard-schema/spec` for convenience.
  - **Peer dependencies**: `@cleverbrush/schema@^2.0.0`, `@standard-schema/spec@^1.1.0`.

  ***
