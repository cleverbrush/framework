# @cleverbrush/react-form

## 4.5.0

### Minor Changes

- f7c65ae: Use one browser-safe, deterministic `ct2:` cache key encoder across server and client helpers, response caches, and external invalidation. Selected properties and plain-object keys are sorted, values retain their types, and dates retain millisecond precision. Unsupported values fail explicitly. **Breaking:** every computed key changes, including property-free tags. Upgrade external cache writers and invalidators together, and flush or expire previous entries; literal base invalidation names and TTL settings remain unchanged. Successful mutations invalidate cached aliases and prevent older in-flight reads from refilling them; failed writes preserve entries.

  Synchronize mounted schema-form fields with form/field setters and reset baselines, using descriptor identities and stable external-store subscriptions. Discard obsolete async validation after value changes or reset. Add `handleSubmit`, reactive `submitting`/`error`, duplicate-submit protection, explicit success/failure results and opt-in error translation. Add `defineFieldRenderer` and `createFormSystem` for typed renderer values, variants, props and composable registries while retaining existing form APIs. See the cache/form migration guide for semantics and examples.

  Add reusable `deepClone` for plain objects, arrays and Dates with cycle/shared-reference preservation, sparse-array lengths, null prototypes and safe enumerable own string/symbol properties. React forms now use `deepClone` and `deepEqual` from `@cleverbrush/deep` for snapshots and dirty checks. **Breaking:** correct existing `deepEqual` semantics for null/type mismatches, equivalent cycles and shared references, signed zero, invalid Dates, symbol keys and sparse arrays. Opaque values such as Files, Maps, Sets and custom instances compare only by identity and remain references when cloned. Unordered arrays preserve duplicate/hole counts without hash-based matching or input mutation. Review consumers relying on the old outcomes; `deepExtend`, `HashObject` and `Transaction` are unchanged.

- 0d480e9: Accept defaulted schema properties in typed Field, headless useField, and renderer schema bounds without losing value inference. Return a named TypedFormSystem so shared UI packages can export inferred registries while emitting declarations.

### Patch Changes

- Updated dependencies [f7c65ae]
  - @cleverbrush/deep@4.5.0
  - @cleverbrush/schema@4.5.0

## 4.4.3

### Patch Changes

- @cleverbrush/schema@4.4.3

## 4.4.2

### Patch Changes

- @cleverbrush/schema@4.4.2

## 4.4.1

### Patch Changes

- @cleverbrush/schema@4.4.1

## 4.4.0

### Patch Changes

- @cleverbrush/schema@4.4.0

## 4.3.2

### Patch Changes

- 1556ad1: Prepare a patch release with website SEO, AI-readiness, accessibility, and
  privacy compliance updates.
- Updated dependencies [1556ad1]
  - @cleverbrush/schema@4.3.2

## 4.3.1

### Patch Changes

- @cleverbrush/schema@4.3.1

## 4.3.0

### Patch Changes

- @cleverbrush/schema@4.3.0

## 4.2.0

### Patch Changes

- @cleverbrush/schema@4.2.0

## 4.1.0

### Patch Changes

- Updated dependencies [9e9bb4c]
- Updated dependencies [733b6f4]
  - @cleverbrush/schema@4.1.0

## 4.0.0

### Patch Changes

- Updated dependencies [3bfc1e1]
- Updated dependencies [cbdfa69]
  - @cleverbrush/schema@4.0.0

## 3.1.0

### Patch Changes

- @cleverbrush/schema@3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/schema@3.0.1

## 3.0.0

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

  ***
