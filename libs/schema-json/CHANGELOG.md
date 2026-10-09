# @cleverbrush/schema-json

## 5.0.0

### Major Changes

- d916566: Make Framework query builders immutable and infer row schemas automatically.
  
  Retain returned query builders, return synchronous builders from scopes and grouped predicates, and supply an explicit Framework object output schema for opaque raw SELECTs. Ordinary, aliased, polymorphic and ORM queries expose their row schemas directly. Projections replace scalar selections, and projected/aggregate/raw queries cannot perform entity writes. Reads and write-returning rows consistently preserve exact decimal/bigint strings, Date objects and SQL nulls.
  
  All published Framework packages advance together to the next major version. Tracked entity objects remain mutable.
  
  ### Migrating from v4.x to v5
  
  Remove `withRowSchema()` calls and retain each configured query instead of relying on mutation. Replace raw base-query overloads with explicit output contracts. See `libs/knex-schema/MIGRATION-v5.md` for the complete migration guide.
- c5b4dbc: Require Node.js 24+ consistently across all published packages. Correct the root and all published-package license files to BSD-3-Clause, matching package metadata and documentation, and verify license consistency in source and npm tarballs. See docs/MIGRATION-v5.md for migration guidance.
  
  Harden JWT key/algorithm and claim validation, cookie parsing/serialization, and request-body lifecycle handling. Require explicit authorization scope for bounded server idempotency; coalesce concurrent retries and capture full response bodies. Bound response caching and bypass private, no-store and cookie-setting responses.
  
  Preserve DI scope validation through factories and propagate registered optional-service failures. Fix batch response status/header capture, timeout abort-listener cleanup, concurrent deduplication response cloning, CLI database cleanup on validation/production-guard failures, and the missing client idempotency JavaScript export. Update security-sensitive dependencies and ensure OpenTelemetry disable flags override SDK defaults.
  
  Add regression tests, package-consumer smoke checks, package-level unit coverage floors, migration/security documentation and release validation gates.

### Minor Changes

- f9b1f56: Add optional-aware fallbacks and preprocessing, and automatic named schema
  references through ordinary immutable use-site modifiers, without a wrapper API.
  Shape, validation-rule, default, fallback and extension changes clear inherited
  names; apply schemaName after those edits to establish a new named definition.
  Preserve one canonical definition in JSON
  Schema, OpenAPI and AsyncAPI with strict name collision checks. Keep existing
  type inference and optional null acceptance unchanged.

### Patch Changes

- efe2f2f: Preserve original property declarations and JSDoc through derived types so
  editors can navigate to definitions and show property documentation. This covers
  query selectors, rows, projections and write payloads; declared relation includes;
  mapper targets; JSON Schema inferred values; composed API groups and injected
  services; and merged object properties. Runtime behavior is unchanged.
- Updated dependencies [d916566]
- Updated dependencies [a90a491]
- Updated dependencies [f9b1f56]
- Updated dependencies [c5b4dbc]
- Updated dependencies [47133eb]
  - @cleverbrush/schema@5.0.0

## 4.5.0

## 4.4.3

## 4.4.2

## 4.4.1

## 4.4.0

## 4.3.2

### Patch Changes

- 1556ad1: Prepare a patch release with website SEO, AI-readiness, accessibility, and
  privacy compliance updates.

## 4.3.1

## 4.3.0

## 4.2.0

## 4.1.0

### Minor Changes

- 733b6f4: Add `intersection()` schema builder for combining two schemas (both must pass)

  - New `IntersectionSchemaBuilder` class with `intersection(left, right)` factory
  - Validates both schemas against the input and merges outputs
  - Maps to `allOf` in JSON Schema (to/from bidirectional)
  - Supports all standard modifiers: `.optional()`, `.nullable()`, `.default()`, `.catch()`, `.brand()`, `.readonly()`, `.addValidator()`, `.addPreprocessor()`, etc.

## 4.0.0

### Patch Changes

- Updated dependencies [3bfc1e1]
- Updated dependencies [cbdfa69]
  - @cleverbrush/schema@4.0.0

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
