# @cleverbrush/schema-json

## 2.0.0

### Major Changes

- **New package** — Bidirectional JSON Schema (Draft 7 / 2020-12) interop for `@cleverbrush/schema`.
- **`toJsonSchema(builder, options?)`** — converts any `@cleverbrush/schema` builder to a JSON Schema object. Output conforms to JSON Schema Draft 2020-12 and includes a `$schema` field. Optional `ToJsonSchemaOptions` control how the output is generated.
- **`fromJsonSchema(jsonSchema)`** — converts a JSON Schema literal to a fully-typed `@cleverbrush/schema` builder. Input must be annotated with `as const` for precise TypeScript type inference. The returned builder is typed as `JsonSchemaNodeToBuilder<S>`.
- **`withStandardJsonSchema(schema)`** — wraps any `@cleverbrush/schema` builder to also conform to the `StandardJSONSchemaV1` interface from `@standard-schema/spec`.
- **Types** — `JsonSchemaNode`, `JsonSchemaNodeToBuilder<S>`, `InferFromJsonSchema<S>`, `ToJsonSchemaOptions`.
- **Re-exports** `StandardJSONSchemaV1` and `StandardTypedV1` from `@standard-schema/spec` for convenience.
- Requires `@cleverbrush/schema@^2.0.0` and `@standard-schema/spec@^1.1.0`.
