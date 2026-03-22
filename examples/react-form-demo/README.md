# @cleverbrush/react-form — Demo App

A Vite React application showcasing `@cleverbrush/react-form` with several form validation examples.

## Examples Included

1. **Basic Contact Form** — Simple string/number/boolean fields with `<Field>` auto-rendering via `FormSystemProvider`
2. **Validation Showcase** — Custom validators: min-length, regex patterns, numeric range checks
3. **Nested Object Schema** — Deeply nested schemas with selectors like `t => t.customer.address.city`
4. **Headless Form (useField)** — Full rendering control without `<Field>` or `FormSystemProvider`
5. **Advanced Features** — `FormProvider` context-based `useField()`, nested provider overrides, explicit renderer props

## Running

From this directory:

```bash
npm install
npm run dev
```

Or from the repository root:

```bash
cd examples/react-form-demo
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Building

```bash
npm run build
npm run preview
```

## Prerequisites

The `@cleverbrush/schema` and `@cleverbrush/react-form` packages must be built first:

```bash
# From repo root
npm run build_schema
npm run build_react-form
```
