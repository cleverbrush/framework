---
"@cleverbrush/schema": major
"@cleverbrush/schema-json": major
"@cleverbrush/deep": major
"@cleverbrush/async": major
"@cleverbrush/scheduler": major
"@cleverbrush/knex-clickhouse": major
"@cleverbrush/mapper": major
"@cleverbrush/react-form": major
---

# Release 2.0.0

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

---

## @cleverbrush/schema-json

### New Package

Bidirectional JSON Schema (Draft 7 / 2020-12) interop for `@cleverbrush/schema`.

- **`toJsonSchema(builder, options?)`** — converts any `@cleverbrush/schema` builder to a JSON Schema object. The output conforms to JSON Schema Draft 2020-12 and includes a `$schema` field. Optional `ToJsonSchemaOptions` control how the output is generated.
- **`fromJsonSchema(jsonSchema)`** — converts a JSON Schema literal to a fully-typed `@cleverbrush/schema` builder. The input must be annotated with `as const` for precise TypeScript type inference. The returned builder is typed as `JsonSchemaNodeToBuilder<S>`, giving compile-time knowledge of the resulting schema type.
- **`withStandardJsonSchema(schema)`** — wraps any `@cleverbrush/schema` builder to also conform to the `StandardJSONSchemaV1` interface from `@standard-schema/spec`. Useful for tooling that expects both a schema validator and a JSON Schema descriptor.
- **Types** — `JsonSchemaNode` (union of all supported JSON Schema node shapes), `JsonSchemaNodeToBuilder<S>` (maps a JSON Schema type-literal to the corresponding builder type at compile time), `InferFromJsonSchema<S>` (infers the TypeScript type from a JSON Schema literal), `ToJsonSchemaOptions`.
- **Re-exports** `StandardJSONSchemaV1` and `StandardTypedV1` from `@standard-schema/spec` for convenience.
- **Peer dependencies**: `@cleverbrush/schema@^2.0.0`, `@standard-schema/spec@^1.1.0`.

---

## @cleverbrush/mapper

### New Package

A type-safe, declarative object mapper for converting objects between different `@cleverbrush/schema` representations.

- **Compile-time completeness** — TypeScript produces an error if any target property is not mapped, auto-mapped, or explicitly ignored.
- **Type-safe selectors** — `.for((t) => t.name).from((s) => s.name)` — fully type-checked, not string-based.
- **Auto-mapping** — properties with the same name and compatible type are mapped automatically.
- **Custom transforms** — `.compute((source) => ...)` for arbitrary source-to-target property conversions.
- **`.ignore()`** — explicitly mark target properties as intentionally unmapped.
- **Nested schema support** — map deeply nested object and array properties.
- **Immutable registry** — `configure()` returns a new registry; safe to share and extend.
- **`mapper()` factory function** — convenient entry point to create and configure mapping registries.
- **Validation of target schema** — the mapper validates that properties referenced in the target schema actually exist.
- **Depends on** `@cleverbrush/schema@^2.0.0`.

---

## @cleverbrush/react-form

### New Package

A headless, schema-driven form system for React based on `@cleverbrush/schema`.

- **`useSchemaForm(schema, options?)`** — core hook that creates a fully typed form instance from an object schema. Returns `useField`, `submit`, `validate`, `reset`, `setValues`, `getValues`, `subscribe`, and `getValue`.
- **`FormSystemProvider`** — context provider for registering field renderers by schema type, enabling application-wide render consistency.
- **`FormProvider`** — context provider scoping a `useSchemaForm` instance so nested components can access it.
- **`useField(selector)`** — hook (also available from form instance) that subscribes to a specific field's state using a property descriptor selector, returns strongly-typed `UseFieldResult<T>`.
- **`Field` component** — declarative component that renders a field using the registered renderer for its schema type.
- **`useFormSystem()`** — hook to access the current `FormSystemConfig` from context.
- **Per-field validation** — validates on every field change with concurrent validation handling (generation counter to discard stale results).
- **Nested object support** — full support for nested object schemas with PropertyDescriptor-based error reporting.
- **Headless by default** — no built-in UI; bring your own renderers via `FormSystemProvider`.
- **Depends on** `@cleverbrush/schema@^2.0.0` and `react@>=18.0.0`.

---

## @cleverbrush/deep

### Breaking Changes

- **Removed default export** — only named exports (`deepEqual`, `deepExtend`, `deepFlatten`, `Merge`) are available. Update `import deep from '@cleverbrush/deep'` to `import { deepEqual, deepExtend, deepFlatten } from '@cleverbrush/deep'`.

### Build & Tooling

- Migrated to `tsup` for bundling with sourcemap generation.
- Added `exports` field in `package.json`.
- Migrated tests from Jest to Vitest.

---

## @cleverbrush/async

### Build & Tooling

- Migrated to `tsup` for bundling with sourcemap generation.
- Added `exports` field in `package.json`.
- Migrated tests from Jest to Vitest; replaced `jest.fn()` with `vi.fn()`.
- Fixed `Collector` test that incorrectly expected a rejection.

---

## @cleverbrush/knex-clickhouse

### Breaking Changes

- **Removed `preQueryCallback` parameter** from `getClickhouseConnection()` — the third parameter for pre-query callbacks is no longer supported. If you relied on this to wake idle servers before queries, implement that logic externally.
- **Removed `ClickHouseClient` re-export** — import `ClickHouseClient` directly from `@clickhouse/client` instead.

### Changes

- Updated `@clickhouse/client` dependency from `^1.7.0` to `^1.18.2`.
- Cleaned up internal type casts (`as any` removals).
- Changed `null` return to `undefined` for absent retry options.

### Build & Tooling

- Migrated to `tsup` for bundling with sourcemap generation.
- Added `exports` field in `package.json`.

---

## @cleverbrush/scheduler

### Build & Tooling

- Migrated to `tsup` for bundling with sourcemap generation.
- Added `exports` field in `package.json`.
- Migrated tests from Jest to Vitest.
- Updated `@cleverbrush/schema` dependency to `^2.0.0`.
- Added `@types/node@^25.4.0` as dev dependency.

---

## @cleverbrush/mapper

### Dependency Updates

- Replaced `__unmapped` property with `SYMBOL_UNMAPPED` for better type tracking in mapping registry.

---

## All Packages — Common Changes

- Version bumped from `1.1.11` to `2.0.0`.
- Build system migrated from plain `tsc` to `tsup` + `tsc --emitDeclarationOnly`.
- Added `tsconfig.build.json` for declaration-only builds.
- Added `clean` script for build artifact removal.
- Added `sideEffects: false` for better tree-shaking.
- Sourcemap generation enabled across all packages.
- Test runner migrated from Jest to Vitest with type checking.
- Added Turbo integration for build orchestration.

### Dependency Updates

- **TypeScript** upgraded from `^5.5.4` to `^6.0.2`.
- **Vitest** `^4.1.2` replaced Jest `^29.7.0` and `ts-jest` as the test runner.
- **@vitest/coverage-v8** `^4.1.2` added for code coverage.
- **Biome** `^2.4.9` replaced ESLint + Prettier for linting and formatting.
- **tsup** `^8.5.1` added as the bundler (replaces plain `tsc` builds).
- **turbo** `^2.8.21` added for monorepo build orchestration.
- **typedoc** upgraded from earlier version to `^0.28.18`.
- **@changesets/cli** `^2.30.0` added for release management.
- **@testing-library/react** `^16.3.2` added for React component testing.
- **jsdom** `^29.0.1` added for DOM testing environment.
- **@types/node** upgraded from `^20.11.30` to `^25.4.0` (in async, scheduler).
- **@clickhouse/client** upgraded from `^1.7.0` to `^1.18.2` (in knex-clickhouse).
- **@types/react** `^19.0.0` and **react** `^19.0.0` added as dev dependencies (in react-form).
- Removed: `@types/jest`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-airbnb`, `prettier`, `tsd`.
