# @cleverbrush/react-form

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)
<!-- coverage-badge-start -->
![Unit coverage](https://img.shields.io/badge/unit_coverage-95.5%25-brightgreen)
<!-- coverage-badge-end -->

A headless, schema-driven form system for React based on `@cleverbrush/schema`. Uses PropertyDescriptors for type-safe field binding, supports global UI renderer configuration via a provider, and is completely UI-agnostic — works with plain HTML, MUI, Ant Design, or any component library.

## Server validation issues

Return `{ ok: false, error: string, issues }` from `handleSubmit` to apply a
submission message and field issues together. An issue is plain
`{ pointer: string, detail: string }` data: `pointer` is a **form-relative JSON
Pointer**, not a dotted path. `''` means a form-level error. No HTTP, client, or
Next.js dependency is needed by this package.

### A multi-file client/action/form example

The API contract, server handler, action and component remain separate. The
following assumes your application exports a configured typed `client` for
`api`; authentication, persistence and safe fallback messages stay application-owned.

```ts
// profile-contract.ts (shared)
import { object, string } from '@cleverbrush/schema';
import { defineApi, endpoint } from '@cleverbrush/server/contract';
export const Profile = object({ name: string().minLength(2) });
export const api = defineApi({ profiles: {
    save: endpoint.post('/profiles').body(Profile).responses({ 200: Profile })
} });
```

```ts
// profile-handler.ts (server)
import type { Handler } from '@cleverbrush/server';
import { api } from './profile-contract';
export const saveProfileHandler: Handler<typeof api.profiles.save> =
    async ({ body }) => body; // Replace with application persistence.
// Register this handler with your application's implementation scope.
```

```ts
// save-profile.ts (server action / application boundary)
import { decodeValidationIssues } from '@cleverbrush/client';
import type { InferType } from '@cleverbrush/schema';
import { Profile } from './profile-contract';
import { client } from './api-client';
export async function saveProfile(values: InferType<typeof Profile>) {
    try {
        return { ok: true as const, data: await client.profiles.save({ body: values }) };
    } catch (error) {
        const issues = decodeValidationIssues(error, { source: 'body' });
        if (issues) return { ok: false as const, error: 'Check your input.', issues };
        // Add application-owned handling for expected general errors here.
        throw error;
    }
}
```

```tsx
// ProfileForm.tsx (browser; add your framework's client directive if needed)
import { useSchemaForm } from '@cleverbrush/react-form';
import { Profile } from './profile-contract';
import { saveProfile } from './save-profile';
export function ProfileForm() {
    const form = useSchemaForm(Profile);
    const name = form.useField(t => t.name);
    return <form onSubmit={form.handleSubmit(saveProfile)}>
        <label>Name <input value={name.value ?? ''}
            onChange={e => name.onChange(e.target.value)} onBlur={name.onBlur}
            aria-invalid={name.touched && !!name.error} aria-describedby="name-error" /></label>
        <span id="name-error">{name.touched && name.error}</span>
        {form.error && <p role="alert">{form.error}</p>}
        <button disabled={form.submitting}>Save</button>
    </form>;
}
```

Ordinary shared-schema errors are already caught locally. This bridge handles
structured server rejections (including schema-version differences); it does
not manufacture field errors from business-error strings. Never serialize an
`ApiError` instance to the browser. Only its decoded issue data crosses the action
boundary. A form with different property names must explicitly map the returned
pointers to its own paths before returning the failure result.

### Manual issues, indexed fields and lifecycle

Use `form.setIssues(issues)` for custom flows; it replaces the external issue set.
`form.setIssues([])` clears only external errors, not local schema errors. Prefer
returned issues for asynchronous submissions: `handleSubmit` ignores stale issues
after any value update, reset or unmount. Manual callers own that race protection.

```tsx
const form = useSchemaForm(object({ addresses: array(object({ city: string() })) }));
const city = form.useField(t => t.addresses[0].city); // string | undefined
form.setIssues([{ pointer: '/addresses/0/city', detail: 'Choose another city.' }]);
// Equivalent with Field / a typed form system:
// <Field form={form} forProperty={t => t.addresses[0].city} />
```

- Matched fields become touched and show their first external message through
  `field.error`. External messages take precedence until cleared.
- Local validation, including debounced validation, does not erase external
  issues on unchanged fields. Editing clears related ancestor/descendant issues,
  not unrelated fields. Root issues clear when values change.
- `setValue` clears issues for changed values. Replacing/reordering an array
  clears its indexed issues: indices are positions, not stable item identities.
- Reset and the next submission clear all external issues. Existing string-only
  submission errors continue to work and clear on reset/resubmission.
- Root, unknown, and currently unbound field issues are included in `form.error`
  alongside the application message, joined by newlines. Render that summary even
  when using inline messages. Binding/unbinding a field updates the summary.
- Indexed selectors support object, primitive and nested arrays, but are not
  native arrays: no `push`, negative indices, or add/remove/reorder UI helpers.

JSON Pointer escaping preserves distinct names: `/a.b`, `/a/b`, `/a~1b`, and
`/a~0b` target a dotted name, a nested field, a slash in a name, and a tilde in a
name respectively. Unknown paths never create values or mutate the form.

## Why @cleverbrush/react-form?

**The problem:** Every popular React form library — React Hook Form, Formik, React Final Form — requires you to reference fields by **string names**: `register("email")`, `<Field name="address.city" />`. The moment you pass a field name as a string, you lose TypeScript's type safety. Rename a property in your data model and the compiler stays silent — your form just silently breaks at runtime. The larger your codebase, the more of these invisible string references you accumulate, and the more fragile every refactor becomes.

```tsx
// React Hook Form — field names are plain strings
const { register } = useForm<User>();
<input {...register("name")} />     // ← no compiler error if "name" is renamed
<input {...register("emial")} />    // ← typo: silently fails at runtime

// Formik — same problem
<Field name="address.city" />       // ← rename "city" → "town" and nothing warns you
```

**The solution:** `@cleverbrush/react-form` binds fields via **PropertyDescriptor selectors** — actual TypeScript expressions like `(t) => t.address.city` — instead of strings. The compiler knows the exact shape of your schema, so a renamed or mistyped property is a **compile-time error**, not a runtime surprise. On top of that, the schema **IS** the validation, the type definition, **AND** the form field configuration. One source of truth.

```tsx
// @cleverbrush/react-form — fully type-safe selectors
<Field forProperty={(t) => t.name} form={form} />           // ✓ checked at compile time
<Field forProperty={(t) => t.address.city} form={form} />   // ✓ rename "city" → compiler error
<Field forProperty={(t) => t.emial} form={form} />          // ✗ compile error: "emial" doesn't exist
```

**What makes it different:**

| Feature | @cleverbrush/react-form | React Hook Form | Formik | React Final Form |
| --- | --- | --- | --- | --- |
| Schema-driven validation | ✓ built-in | ~ via resolver | ~ via plugin | ✗ |
| Single source of truth (types + validation) | ✓ | ✗ | ✗ | ✗ |
| Type-safe field selectors | ✓ | ~ | ✗ | ✗ |
| Headless / UI-agnostic | ✓ | ✓ | ~ | ✓ |
| Global renderer system | ✓ | ✗ | ✗ | ✗ |
| Auto-field rendering by type + variant | ✓ | ✗ | ✗ | ✗ |
| Nested objects | ✓ | ✓ | ✓ | ✓ |
| Async validation | ✓ | ✓ | ✓ | ✓ |

## Installation

```bash
npm install @cleverbrush/react-form
```

**Peer dependencies:** `react >=18`, `@cleverbrush/schema ^2.0.0`

## Quick Start

For typed renderer props/variants and managed submission, see the new
[consumer examples and migration guide](../../docs/cache-form-migration.md).
The provider-based APIs below remain supported.

Typed fields and headless `form.useField()` accept properties with schema
defaults, including enums, booleans, arrays, and nullable values. A default
does not erase the property's inferred type. Defaults are applied during
validation; call `form.reset(values)` to establish a visible clean baseline.
`reset()` still clears the store rather than restoring schema defaults.

Shared UI packages can directly export `createFormSystem(...)` results and
`system.Field` while emitting TypeScript declarations. The named
`TypedFormSystem` and `TypedFieldComponent` types preserve the registry's
field/variant/props checks across package boundaries.

```tsx
import { object, string, number } from '@cleverbrush/schema';
import { useSchemaForm, FormSystemProvider, Field } from '@cleverbrush/react-form';

// 1. Define schema — reuse across forms, API validation, mapping, etc.
const ContactSchema = object({
    name:  string().required('Name is required').minLength(2, 'Name must be at least 2 characters'),
    email: string().required('Email is required'),
    age:   number().required('Age is required').min(18, 'Must be at least 18')
});

// 2. Define renderers once per app — maps schema types to UI components
const renderers = {
    string: ({ value, onChange, onBlur, error, touched }) => (
        <div>
            <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
            />
            {touched && error && <span className="error">{error}</span>}
        </div>
    ),
    number: ({ value, onChange, onBlur, error, touched }) => (
        <div>
            <input
                type="number"
                value={value ?? ''}
                onChange={(e) => onChange(Number(e.target.value))}
                onBlur={onBlur}
            />
            {touched && error && <span className="error">{error}</span>}
        </div>
    )
};

// 3. Each form component only picks which fields to show — no boilerplate
function ContactForm() {
    const form = useSchemaForm(ContactSchema);

    const handleSubmit = async () => {
        const result = await form.submit();
        if (result.valid) {
            console.log('Submitted:', result.object);
        }
    };

    return (
        <div>
            <Field forProperty={(t) => t.name} form={form} />
            <Field forProperty={(t) => t.email} form={form} />
            <Field forProperty={(t) => t.age} form={form} />
            <button onClick={handleSubmit}>Submit</button>
        </div>
    );
}

// 4. Wrap once at the app root — all forms below share the renderers
function App() {
    return (
        <FormSystemProvider renderers={renderers}>
            <ContactForm />
        </FormSystemProvider>
    );
}
```

## How It Works — Step by Step

1. **Define a schema** using `@cleverbrush/schema` — this is your single source of truth for types, validation rules, and field metadata
2. **Register renderers** via `FormSystemProvider` — plain functions that map schema types (`"string"`, `"number"`, `"boolean"`) to your UI components (plain HTML, MUI, Ant Design, etc.)
3. **Create a form instance** via `useSchemaForm(schema)` — returns state management, validation, submit/reset lifecycle
4. **Render fields** via `<Field forProperty={(t) => t.name} form={form} />` — the component looks up the registered renderer for the field's schema type
5. **Submit** — `form.submit()` runs the schema's full validation and returns a typed result

## Core Concepts

| Part | Responsibility | When to Use |
|------|---------------|-------------|
| **FormSystemProvider** | Global renderer registry via React Context | Once at the app root |
| **useSchemaForm** | Per-schema form instance (state, validation, lifecycle) | In every component that needs a form |
| **useField** | Descriptor-based field binding (value, dirty, touched, error) | When you want fine-grained control |
| **Field** | UI-agnostic component that resolves renderers by schema type | For most form fields — quick and declarative |

## Registering Renderers

Renderers are plain functions that receive field state and return React nodes. Define a renderer map keyed by schema type (`string`, `number`, `boolean`, etc.):

### Plain HTML

```tsx
import { FieldRenderProps } from '@cleverbrush/react-form';

const htmlRenderers = {
    string: ({ value, onChange, onBlur, error, touched, label, name, fieldProps }: FieldRenderProps) => (
        <div>
            {label && <label>{label}</label>}
            <input
                type="text"
                name={name}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                {...fieldProps}
            />
            {touched && error && <span className="error">{error}</span>}
        </div>
    ),
    number: ({ value, onChange, onBlur, error, touched, label, name, fieldProps }: FieldRenderProps) => (
        <div>
            {label && <label>{label}</label>}
            <input
                type="number"
                name={name}
                value={value ?? ''}
                onChange={(e) => onChange(Number(e.target.value))}
                onBlur={onBlur}
                {...fieldProps}
            />
            {touched && error && <span className="error">{error}</span>}
        </div>
    ),
    boolean: ({ value, onChange, label }: FieldRenderProps) => (
        <label>
            <input
                type="checkbox"
                checked={value ?? false}
                onChange={(e) => onChange(e.target.checked)}
            />
            {label}
        </label>
    )
};
```

### Variant Renderers

You can register renderers for specific variants using a `"type:variant"` key.
When `<Field variant="password" />` is rendered on a `string` field, the
registry is checked for `"string:password"` first, then falls back to `"string"`:

```tsx
const renderers = {
    // Default string renderer
    string: ({ value, onChange, onBlur, error, touched, label, name, fieldProps }: FieldRenderProps) => (
        <div>
            {label && <label>{label}</label>}
            <input type="text" name={name} value={value ?? ''}
                   onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
                   {...fieldProps} />
            {touched && error && <span className="error">{error}</span>}
        </div>
    ),
    // Password variant — rendered when <Field variant="password" /> is used on a string field
    'string:password': ({ value, onChange, onBlur, error, touched, label, name, fieldProps }: FieldRenderProps) => (
        <div>
            {label && <label>{label}</label>}
            <input type="password" name={name} value={value ?? ''}
                   onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
                   {...fieldProps} />
            {touched && error && <span className="error">{error}</span>}
        </div>
    ),
    // Textarea variant
    'string:textarea': ({ value, onChange, onBlur, error, touched, label, name, fieldProps }: FieldRenderProps) => (
        <div>
            {label && <label>{label}</label>}
            <textarea name={name} value={value ?? ''}
                      onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
                      {...(fieldProps as any)} />
            {touched && error && <span className="error">{error}</span>}
        </div>
    )
};
```

### MUI (Material UI)

```tsx
import { TextField, Checkbox } from '@mui/material';

const muiRenderers = {
    string: ({ value, onChange, onBlur, error, touched }: FieldRenderProps) => (
        <TextField
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            error={touched && !!error}
            helperText={touched ? error : undefined}
        />
    ),
    number: ({ value, onChange, onBlur, error, touched }: FieldRenderProps) => (
        <TextField
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(Number(e.target.value))}
            onBlur={onBlur}
            error={touched && !!error}
            helperText={touched ? error : undefined}
        />
    ),
    boolean: ({ value, onChange }: FieldRenderProps) => (
        <Checkbox
            checked={value ?? false}
            onChange={(e) => onChange(e.target.checked)}
        />
    )
};
```

## FormSystemProvider

Register renderers once at the top of your app. All `<Field>` components below resolve renderers by schema type automatically:

```tsx
import { FormSystemProvider } from '@cleverbrush/react-form';

// Public website with plain HTML inputs
<FormSystemProvider renderers={htmlRenderers}>
    <PublicApp />
</FormSystemProvider>

// Admin panel using MUI
<FormSystemProvider renderers={muiRenderers}>
    <AdminApp />
</FormSystemProvider>
```

### Nesting

Inner providers override/extend outer providers:

```tsx
<FormSystemProvider renderers={muiRenderers}>
    <MainApp />
    {/* Override just the string renderer in this section */}
    <FormSystemProvider renderers={{ string: customStringRenderer }}>
        <SpecialSection />
    </FormSystemProvider>
</FormSystemProvider>
```

## useSchemaForm

Creates a form instance bound to a schema. Returns field binding and form lifecycle methods:

```tsx
const form = useSchemaForm(UserSchema, {
    createMissingStructure: true,  // default: true — auto-create parent objects when setting nested values
    validateOnMount: false,        // default: false — set to true to show errors immediately on mount
    validationDebounceMs: 300      // optional — debounce onChange validation (ms); validate()/submit() are always immediate
});
```

### Returned API

| Method | Description |
|--------|-------------|
| `form.useField(forProperty)` | Bind a field by PropertyDescriptor selector |
| `form.submit()` | Validate and return `ValidationResult` (includes `result.object` on success) |
| `form.validate()` | Run validation, propagate errors to fields |
| `form.reset(values?)` | Clear values, or establish supplied values as a clean baseline; synchronize mounted fields and clear errors/touched/dirty/validation |
| `form.handleSubmit(onValid, options?)` | Awaitable event handler: validate, prevent duplicate submits, handle success/failure results |
| `form.submitting` | Reactive, read-only pending state from validation through callbacks |
| `form.error` | Reactive, read-only submission error; cleared on reset or the next attempt |
| `form.getValue()` | Get current form values as plain object |
| `form.setValue(values)` | Shallow-merge values and synchronize mounted fields without marking touched |

Form snapshots and dirty checks use `deepClone` and `deepEqual` from
[`@cleverbrush/deep`](../deep/README.md). Plain objects, arrays and Dates are cloned
on reset/setters; changing caller-owned input cannot change their baseline. Cycles,
shared references, sparse arrays and null prototypes are preserved. Replacing a
value with structurally equal data clears dirty, even with different sharing of
child references. Files and other opaque objects retain identity: a different File
is dirty even if its name/content match. Treat returned snapshots and opaque values
as read-only; update through setters rather than mutating them in place.

## useField

Binds a single field via PropertyDescriptor selector. Can be used via `form.useField()` or the context-based standalone `useField()`:

```tsx
// Via form instance
const name = form.useField((t) => t.name);
const city = form.useField((t) => t.address.city);

// Or via context (inside a FormProvider)
const name = useField((t) => t.name);
```

### Returned State & API

| Property | Type | Description |
|----------|------|-------------|
| `value` | `T \| undefined` | Current field value |
| `initialValue` | `T \| undefined` | Value at form init / last reset |
| `dirty` | `boolean` | `true` if value differs from initialValue |
| `touched` | `boolean` | `true` after `onBlur` has been called |
| `error` | `string \| undefined` | Validation error message from schema |
| `validating` | `boolean` | `true` during async validation |
| `onChange(value)` | `(T) => void` | Update field value |
| `onBlur()` | `() => void` | Mark field as touched |
| `setValue(value)` | `(T) => void` | Alias for `onChange` |
| `schema` | `SchemaBuilder` | The field's schema builder |

## Field Component

Resolves the renderer from the `FormSystemProvider` registry by schema type (and optional variant), or uses an explicit `renderer` prop:

```tsx
// Auto-resolved from FormSystemProvider (string schema → string renderer)
<Field forProperty={(t) => t.name} form={form} />

// Variant-based resolution: looks up "string:password", falls back to "string"
<Field forProperty={(t) => t.password} form={form} variant="password" />

// With label, name, and extra props for the renderer
<Field
    forProperty={(t) => t.email}
    form={form}
    label="Email address"
    name="email"
    fieldProps={{ placeholder: 'you@example.com', autoComplete: 'email' }}
/>

// Explicit renderer override
<Field forProperty={(t) => t.name} form={form} renderer={customRenderer} />
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `forProperty` | `(tree) => PropertyDescriptor` | PropertyDescriptor selector for the field |
| `form` | `SchemaFormInstance` | Form instance from `useSchemaForm` |
| `renderer?` | `FieldRenderer` | Optional explicit renderer (overrides provider) |
| `variant?` | `string` | Variant hint for renderer resolution and forwarded to the renderer |
| `label?` | `string` | Visible label text forwarded to the renderer |
| `name?` | `string` | HTML `name` attribute forwarded to the renderer |
| `fieldProps?` | `Record<string, unknown>` | Extra renderer-specific props (e.g. `placeholder`, `autoComplete`) |

## Headless Usage (without Field component)

For full control over rendering, use `form.useField()` directly:

```tsx
function UserForm() {
    const form = useSchemaForm(UserSchema);
    const name = form.useField((t) => t.name);
    const email = form.useField((t) => t.email);

    return (
        <>
            <input
                value={name.value ?? ''}
                onChange={(e) => name.onChange(e.target.value)}
                onBlur={name.onBlur}
            />
            {name.touched && name.error && <span>{name.error}</span>}

            <input
                value={email.value ?? ''}
                onChange={(e) => email.onChange(e.target.value)}
                onBlur={email.onBlur}
            />
            <button onClick={() => form.submit()}>Submit</button>
        </>
    );
}
```

## FormProvider

Context bridge that allows standalone `useField()` usage outside of `form.useField()`:

```tsx
import { FormProvider, useField } from '@cleverbrush/react-form';

function NameInput() {
    const name = useField((t) => t.name);
    return <input value={name.value ?? ''} onChange={(e) => name.onChange(e.target.value)} />;
}

function UserForm() {
    const form = useSchemaForm(UserSchema);

    return (
        <FormProvider form={form}>
            <NameInput />
        </FormProvider>
    );
}
```

## Nested Object Schemas

PropertyDescriptor selectors support nested paths:

```tsx
const UserSchema = object({
    name: string(),
    address: object({
        city: string(),
        zip: number()
    })
});

function UserForm() {
    const form = useSchemaForm(UserSchema);

    return (
        <>
            <Field forProperty={(t) => t.name} form={form} />
            <Field forProperty={(t) => t.address.city} form={form} />
            <Field forProperty={(t) => t.address.zip} form={form} />
        </>
    );
}
```

## Validation

Validation uses `@cleverbrush/schema` validators. Errors are automatically propagated to the corresponding field state:

```tsx
const SignupSchema = object({
    username: string().addValidator(async (val) => {
        if (val.length < 3) {
            return {
                valid: false,
                errors: [{ message: 'Username must be at least 3 characters' }]
            };
        }
        return { valid: true };
    }),
    email: string()
});

function SignupForm() {
    const form = useSchemaForm(SignupSchema);

    return (
        <FormSystemProvider renderers={htmlRenderers}>
            <Field forProperty={(t) => t.username} form={form} />
            <Field forProperty={(t) => t.email} form={form} />
            <button onClick={async () => {
                const result = await form.submit();
                if (result.valid) {
                    console.log('Success:', result.object);
                }
            }}>Submit</button>
        </FormSystemProvider>
    );
}
```

### How validation works

1. `form.validate()` or `form.submit()` runs the schema's full validation
2. Per-property errors are resolved via `getErrorsFor()` using PropertyDescriptors
3. Each field's `error` state is updated automatically
4. Renderers receive the `error` string and `touched` boolean to decide how/when to display errors

## End-to-End Example

Here's a complete, realistic example showing all pieces together — a registration form with nested address, custom validation, and MUI renderers:

```tsx
import { object, string, number } from '@cleverbrush/schema';
import { useSchemaForm, FormSystemProvider, Field } from '@cleverbrush/react-form';
import { TextField } from '@mui/material';

// Schema — single source of truth for types, validation, and form fields
const RegistrationSchema = object({
    name:    string().required('Name is required').minLength(2, 'Too short'),
    email:   string().required('Email is required').matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'),
    age:     number().required('Age is required').min(18, 'Must be 18+'),
    address: object({
        city:  string().required('City is required'),
        zip:   string().required('ZIP is required').minLength(5, 'Invalid ZIP')
    })
});

// Renderers — define once, reuse everywhere
const renderers = {
    string: ({ value, onChange, onBlur, error, touched }) => (
        <TextField
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            error={touched && !!error}
            helperText={touched ? error : undefined}
            fullWidth
            margin="normal"
        />
    ),
    number: ({ value, onChange, onBlur, error, touched }) => (
        <TextField
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(Number(e.target.value))}
            onBlur={onBlur}
            error={touched && !!error}
            helperText={touched ? error : undefined}
            fullWidth
            margin="normal"
        />
    )
};

// Form component — just declare which fields to show
function RegistrationForm() {
    const form = useSchemaForm(RegistrationSchema);

    return (
        <div>
            <Field forProperty={(t) => t.name} form={form} />
            <Field forProperty={(t) => t.email} form={form} />
            <Field forProperty={(t) => t.age} form={form} />
            <Field forProperty={(t) => t.address.city} form={form} />
            <Field forProperty={(t) => t.address.zip} form={form} />
            <button onClick={async () => {
                const result = await form.submit();
                if (result.valid) {
                    console.log('Registered:', result.object);
                }
            }}>Register</button>
        </div>
    );
}

// App — wrap with provider
function App() {
    return (
        <FormSystemProvider renderers={renderers}>
            <RegistrationForm />
        </FormSystemProvider>
    );
}
```

## API Reference

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `FormSystemProvider` | Component | Global renderer registry provider |
| `FormProvider` | Component | Form context bridge for standalone `useField` |
| `Field` | Component | Auto-rendered field by schema type |
| `useSchemaForm` | Hook | Create a form instance from schema |
| `useField` | Hook | Context-based field binding (use inside `FormProvider`) |
| `useFormSystem` | Hook | Access `FormSystemProvider` config |

### Types

| Type | Description |
|------|-------------|
| `FieldRenderer` | `(props: FieldRenderProps) => ReactNode` |
| `FieldRenderProps` | Props passed to renderers: `value`, `initialValue`, `dirty`, `touched`, `error`, `validating`, `onChange`, `onBlur`, `setValue`, `schema`, `variant?`, `label?`, `name?`, `fieldProps?` |
| `FormSystemConfig` | `{ renderers?: Record<string, FieldRenderer> }` — keys can be `"type"` or `"type:variant"` |
| `FieldState` | `{ value, initialValue, dirty, touched, error, validating }` |
| `UseFieldResult` | `FieldState & { onChange, onBlur, setValue, schema }` |
| `UseSchemaFormOptions` | `{ createMissingStructure?: boolean; validateOnMount?: boolean; validationDebounceMs?: number }` |
| `SchemaFormInstance` | Return type of `useSchemaForm` |
| `FormSystemProviderProps` | Props for `FormSystemProvider` |
| `FormProviderProps` | Props for `FormProvider` |
| `FieldProps` | Props for `Field` |

## Code Quality

- **Linting:** [Biome](https://biomejs.dev/) — enforced on every PR via CI
- **Type checking:** TypeScript strict mode — field selectors and form state are fully typed end-to-end
- **Unit tests:** [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) — covering form state management, validation, async validators, field rendering, and provider configuration
- **CI:** Every pull request must pass lint + build + test before merge — see [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

## License

BSD-3-Clause
