# @cleverbrush/schema-json

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
