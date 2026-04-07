# @cleverbrush/react-form

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
