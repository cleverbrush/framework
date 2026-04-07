# @cleverbrush/schema

## 2.0.0

### Major Changes

- 13ce119: # Release 2.0.0

  ## @cleverbrush/schema

  ### Major Changes

  - **Property Descriptor system** — new `PropertyDescriptor`, `PropertyDescriptorTree`, and `PropertyDescriptorInner` types that allow programmatic navigation, getting, and setting of values within nested object schemas. Property descriptors act as type-safe pointers to individual properties (similar to expression trees in C# .NET).
  - **`ObjectSchemaBuilder.getPropertiesFor(schema)`** — new static method to obtain a property descriptor tree for any object schema.
  - **`ObjectSchemaBuilder.isValidPropertyDescriptor(descriptor)`** — new static method to validate whether an object is a valid property descriptor.
  - **Enhanced validation error reporting** — `ObjectSchemaValidationResult` now exposes a `getErrorsFor(selector)` method that returns per-property validation results (`PropertyValidationResult`) for any property in the schema tree.
  - **Removed `path` from `ValidationError`** — the `ValidationError` type is now `{ message: string }` instead of `{ path: string; message: string }`. String-based path concatenation was a major performance bottleneck. Use `getErrorsFor()` with PropertyDescriptors for per-property error inspection instead — it is type-safe and zero-cost on the valid path.
  - **Removed `path` from `ValidationContext`** — the `path` field on `ValidationContext` has been removed. It was only used internally to build the now-removed `ValidationError.path` strings.
  - **`ArraySchemaValidationResult.getNestedErrors()`** — returns per-element validation results including element-level errors and root-level array errors.
  - **`PropertyValidationResult` class** — new mutable container for tracking per-property validation errors, child errors, and accumulated error messages during object validation.
  - **Custom error messages on `required()`** — all schema builders (`string`, `number`, `boolean`, `date`, `array`, `object`, `any`, `function`, `union`) now accept an optional `errorMessage` parameter on `.required()` for custom required-field messages.
  - **Custom error messages on validation constraints** — `minLength`, `maxLength`, `min`, `max`, `equals`, and other constraint methods across builders now accept optional custom error message providers.
  - **`TupleSchemaBuilder`** — new `tuple([...schemas])` factory for fixed-length arrays with per-position type checking. Supports an optional `.rest(schema)` for trailing variadic elements. `TupleSchemaValidationResult.getNestedErrors()` returns per-position validation results alongside root-level tuple errors. Exported as the `tuple()` factory and via the `@cleverbrush/schema/tuple` sub-path.
  - **`RecordSchemaBuilder`** — new `record(valueSchema)` factory for `Record<string, V>` validation (unknown keys, uniform value type). Accepts an optional key schema (`record(keySchema, valueSchema)`) to validate key format with a string schema. `RecordSchemaValidationResult.getErrorsFor(key)` returns per-entry validation results. Exported as the `record()` factory and via `@cleverbrush/schema/record`.
  - **`LazySchemaBuilder`** — new `lazy(() => schema)` factory for recursive and self-referential schemas (tree nodes, nested menus, threaded comments). The getter is called once on first validation and the result is cached. TypeScript cannot infer recursive types automatically, so an explicit type annotation is required on the variable holding the schema.
  - **`NullSchemaBuilder`** — new `nul()` factory for schemas that accept exactly `null`. Required by default (rejects `undefined`); `.optional()` accepts `null | undefined`. Useful for discriminated-union branches and JSON payloads that carry an explicit JSON `null`.
  - **`.nullable()` / `.notNullable()`** — new first-class methods on all `SchemaBuilder` instances. `.nullable()` makes the schema accept `null` as a valid value (type-safe via the `TNullable` generic parameter). `.notNullable()` removes the nullable mark.
  - **`.default(value | factory)`** — new method on all builders. Sets a default value returned when the input is `undefined`. A factory function (`() => value`) should be used for mutable defaults such as arrays and objects. `introspect()` exposes `hasDefault`. `.clearDefault()` removes a previously set default. Type-safe via the `THasDefault` generic parameter.
  - **`.catch(value | factory)`** — new method on all builders. Supplies a fallback for _any_ validation failure (not just `undefined`). When set, `parse()` and `parseAsync()` will never throw. Preserves specialized result shapes (`getErrorsFor` / `getNestedErrors`) when the fallback fires.
  - **`parse()` / `parseAsync()`** — new throwing convenience methods on all builders. `parse(value)` returns the validated value directly or throws `SchemaParseError` on failure. `parseAsync(value)` is the async counterpart. When `.catch()` is configured these methods never throw.
  - **`.describe(text)`** — new method on all builders. Attaches a human-readable description to the schema; stored as `description` in `introspect()`.
  - **`.readonly()`** — new method on all builders. Marks a schema as immutable (informational flag surfaced via `introspect().readonly`).
  - **`ObjectSchemaBuilder.deepPartial()`** — recursively makes every property and nested-object property optional. Returns a new builder with the `DeepMakeChildrenOptional<TProperties>` inferred type, suitable for PATCH bodies and partial update payloads.
  - **Sub-path exports** — individual schema builders can now be imported directly. Available sub-paths: `@cleverbrush/schema/string`, `/number`, `/boolean`, `/object`, `/array`, `/date`, `/any`, `/union`, `/tuple`, `/record`, `/function`.
  - **Extension system** — new `defineExtension(config)` and `withExtensions(...descriptors)` API for adding custom fluent methods to any schema builder type. Extensions support auto-inferred metadata, introspection via `schema.introspect().extensions`, method name collision detection, and full compatibility with `InferType`. Extension metadata survives all fluent operations (`.optional()`, `.required()`, `.addProp()`, `.partial()`, etc.). Extended builders remain `instanceof` their base class.
  - **Built-in extension pack** — common validators are now included out of the box via a pre-applied extension pack. String: `.email()`, `.url()`, `.uuid()`, `.ip()`, `.trim()`, `.toLowerCase()`, `.nonempty()`. Number: `.positive()`, `.negative()`, `.finite()`, `.multipleOf(n)`. Array: `.nonempty()`, `.unique(keyFn?)`. Enum: `.oneOf(...values)` on both `StringSchemaBuilder` and `NumberSchemaBuilder` — constrains a string or number to a specific set of allowed literal values; the inferred type narrows to a string/number literal union. Top-level `enumOf(...values)` factory as convenience sugar for `string().oneOf(...)`. All validator extensions accept an optional error message as a separate parameter — either a string or a `ValidationErrorMessageProvider` function, following the same pattern as built-in constraints (e.g. `.minLength(n, errorMessage?)`). The extension descriptors (`stringExtensions`, `numberExtensions`, `arrayExtensions`) are exported for composition with custom extensions.
  - **`/core` sub-path export** — `@cleverbrush/schema/core` exports bare builders without the built-in extension pack, for consumers who want to apply only their own extensions.
  - **Low-level extension API** — `withExtension(key, value)` / `getExtension(key)` methods available on all `SchemaBuilder` instances for manual metadata management.
  - **Standard Schema v1** — all `SchemaBuilder` instances expose a `['~standard']` property implementing the `StandardSchemaV1` interface from `@standard-schema/spec`. This makes every schema directly usable with ecosystem tooling that targets the Standard Schema specification (TanStack Form, T3 Env, etc.). New peer dependency: `@standard-schema/spec@^1.1.0`.
  - **`extern()` / `ExternSchemaBuilder`** — new `extern(standardSchema)` factory that wraps any [Standard Schema v1](https://standardschema.dev/) compatible schema (Zod, Valibot, ArkType, etc.) into a `@cleverbrush/schema` builder. Validation is delegated to the external schema's `['~standard'].validate()` — no reimplementation needed. TypeScript type is inferred from `StandardSchemaV1.InferOutput`. Proxy-based lazy `PropertyDescriptorTree` makes `getErrorsFor(t => t.nested.field)` navigate through extern boundaries. `ExternSchemaBuilder` is exported for advanced use (extending). Available via the main `@cleverbrush/schema` import and the `@cleverbrush/schema/extern` sub-path.
  - **Enhanced schema type branding** — improved type branding and inference for `SchemaBuilder` to enable better compile-time type safety. `.brand<TBrand>()` method available on all builders.
  - **Removed default export** from `@cleverbrush/deep` (used internally) — named exports only.

  ### JSDoc Improvements

  - Comprehensive JSDoc annotations added across all schema builders (`SchemaBuilder`, `StringSchemaBuilder`, `NumberSchemaBuilder`, `BooleanSchemaBuilder`, `DateSchemaBuilder`, `ArraySchemaBuilder`, `ObjectSchemaBuilder`, `UnionSchemaBuilder`, `AnySchemaBuilder`, `FunctionSchemaBuilder`, `TupleSchemaBuilder`, `RecordSchemaBuilder`, `LazySchemaBuilder`, `NullSchemaBuilder`).
  - Added `@example` blocks with usage snippets for `InferType`, validation types, and error message providers.
  - Documented `PropertyValidationResult` class methods and internal validation types.
  - Added JSDoc to `transaction.ts` utility functions.

  ### Build & Tooling

  - Migrated from `tsc` to `tsup` for bundling with sourcemap generation enabled.
  - Added proper `exports` field in `package.json` with `types` and `import` conditions.
  - Migrated tests from Jest to Vitest; replaced `tsd` type assertions with `vitest` `expectTypeOf`.

  ***
