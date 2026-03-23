# @cleverbrush/react-form

A headless, schema-driven form system for React based on `@cleverbrush/schema`. Uses PropertyDescriptors for type-safe field binding, supports global UI renderer configuration via a provider, and is completely UI-agnostic — works with plain HTML, MUI, Ant Design, or any component library.

## Installation

```bash
npm install @cleverbrush/react-form
```

**Peer dependencies:** `react >=18`, `@cleverbrush/schema ^2.0.0`

## Quick Start

```tsx
import { object, string, number } from '@cleverbrush/schema';
import { useSchemaForm, FormSystemProvider, Field } from '@cleverbrush/react-form';

// 1. Define schema
const UserSchema = object({
    name: string(),
    email: string(),
    age: number().optional()
});

// 2. Define renderers (once per app)
const htmlRenderers = {
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

// 3. Build form with auto-rendered fields
function UserForm() {
    const form = useSchemaForm(UserSchema);

    const handleSubmit = async () => {
        const result = await form.submit();
        if (result.valid) {
            console.log('Submitted:', result.object);
        }
    };

    return (
        <div>
            <Field selector={(t) => t.name} form={form} />
            <Field selector={(t) => t.email} form={form} />
            <Field selector={(t) => t.age} form={form} />
            <button onClick={handleSubmit}>Submit</button>
        </div>
    );
}

// 4. Wrap app with FormSystemProvider
function App() {
    return (
        <FormSystemProvider renderers={htmlRenderers}>
            <UserForm />
        </FormSystemProvider>
    );
}
```

## Core Concepts

The system consists of four parts:

| Part | Responsibility |
|------|---------------|
| **FormSystemProvider** | Global renderer registry via React Context |
| **useSchemaForm** | Per-schema form instance (state, validation, lifecycle) |
| **useField** | Descriptor-based field binding (value, dirty, touched, error) |
| **Field** | UI-agnostic component that resolves renderers by schema type |

## Registering Renderers

Renderers are plain functions that receive field state and return React nodes. Define a renderer map keyed by schema type (`string`, `number`, `boolean`, etc.):

### Plain HTML

```tsx
import { FieldRenderProps } from '@cleverbrush/react-form';

const htmlRenderers = {
    string: ({ value, onChange, onBlur, error, touched }: FieldRenderProps) => (
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
    number: ({ value, onChange, onBlur, error, touched }: FieldRenderProps) => (
        <div>
            <input
                type="number"
                value={value ?? ''}
                onChange={(e) => onChange(Number(e.target.value))}
                onBlur={onBlur}
            />
            {touched && error && <span className="error">{error}</span>}
        </div>
    ),
    boolean: ({ value, onChange }: FieldRenderProps) => (
        <input
            type="checkbox"
            checked={value ?? false}
            onChange={(e) => onChange(e.target.checked)}
        />
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
const form = useSchemaForm(UserSchema);
```

### Returned API

| Method | Description |
|--------|-------------|
| `form.useField(selector)` | Bind a field by PropertyDescriptor selector |
| `form.submit()` | Validate and return `ValidationResult` (includes `result.object` on success) |
| `form.validate()` | Run validation, propagate errors to fields |
| `form.reset(values?)` | Reset all fields; optionally set new initial values |
| `form.getValue()` | Get current form values as plain object |
| `form.setValue(values)` | Merge values into form state |

### Options

```tsx
const form = useSchemaForm(UserSchema, {
    createMissingStructure: true  // default: true — auto-create parent objects when setting nested values
});
```

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
| `value` | `any` | Current field value |
| `initialValue` | `any` | Value at form init / last reset |
| `dirty` | `boolean` | `true` if value differs from initialValue |
| `touched` | `boolean` | `true` after `onBlur` has been called |
| `error` | `string \| undefined` | Validation error message from schema |
| `validating` | `boolean` | `true` during async validation |
| `onChange(value)` | `function` | Update field value |
| `onBlur()` | `function` | Mark field as touched |
| `setValue(value)` | `function` | Alias for `onChange` |
| `schema` | `SchemaBuilder` | The field's schema builder |

### Headless Usage (without Field component)

For full control over rendering:

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

## Field Component

Resolves the renderer from the `FormSystemProvider` registry by schema type, or uses an explicit `renderer` prop:

```tsx
// Auto-resolved from FormSystemProvider (string schema → string renderer)
<Field selector={(t) => t.name} form={form} />

// Explicit renderer override
<Field selector={(t) => t.name} form={form} renderer={customRenderer} />
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `selector` | `(tree) => PropertyDescriptor` | PropertyDescriptor selector for the field |
| `form` | `SchemaFormInstance` | Form instance from `useSchemaForm` |
| `renderer?` | `FieldRenderer` | Optional explicit renderer (overrides provider) |

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
const AddressSchema = object({
    user: object({
        name: string(),
        address: object({
            city: string(),
            zip: number()
        })
    })
});

function AddressForm() {
    const form = useSchemaForm(AddressSchema);

    return (
        <>
            <Field selector={(t) => t.user.name} form={form} />
            <Field selector={(t) => t.user.address.city} form={form} />
            <Field selector={(t) => t.user.address.zip} form={form} />
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
            {/* Validation errors are passed to renderers via the `error` prop */}
            <Field selector={(t) => t.username} form={form} />
            <Field selector={(t) => t.email} form={form} />
            <button onClick={() => form.validate()}>Validate</button>
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
2. Error paths (e.g. `$.username`) are mapped to field paths (e.g. `username`)
3. Each field's `error` state is updated automatically
4. Renderers receive the `error` string and `touched` boolean to decide how/when to display errors

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
| `FieldRenderProps` | Props passed to renderers: `value`, `initialValue`, `dirty`, `touched`, `error`, `validating`, `onChange`, `onBlur`, `setValue`, `schema` |
| `FormSystemConfig` | `{ renderers?: Record<string, FieldRenderer> }` |
| `FieldState` | `{ value, initialValue, dirty, touched, error, validating }` |
| `UseFieldResult` | `FieldState & { onChange, onBlur, setValue, schema }` |
| `UseSchemaFormOptions` | `{ createMissingStructure?: boolean }` |
| `SchemaFormInstance` | Return type of `useSchemaForm` |
| `FormSystemProviderProps` | Props for `FormSystemProvider` |
| `FormProviderProps` | Props for `FormProvider` |
| `FieldProps` | Props for `Field` |

## License

BSD-3-Clause
