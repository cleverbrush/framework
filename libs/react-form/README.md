# @cleverbrush/react-form

A headless, schema-driven form system for React based on `@cleverbrush/schema`. Uses PropertyDescriptors for type-safe field binding, supports global UI renderer configuration via a provider, and is completely UI-agnostic — works with plain HTML, MUI, Ant Design, or any component library.

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
<Field selector={(t) => t.name} form={form} />           // ✓ checked at compile time
<Field selector={(t) => t.address.city} form={form} />   // ✓ rename "city" → compiler error
<Field selector={(t) => t.emial} form={form} />          // ✗ compile error: "emial" doesn't exist
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
            <Field selector={(t) => t.name} form={form} />
            <Field selector={(t) => t.email} form={form} />
            <Field selector={(t) => t.age} form={form} />
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
4. **Render fields** via `<Field selector={(t) => t.name} form={form} />` — the component looks up the registered renderer for the field's schema type
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
| `form.useField(selector)` | Bind a field by PropertyDescriptor selector |
| `form.submit()` | Validate and return `ValidationResult` (includes `result.object` on success) |
| `form.validate()` | Run validation, propagate errors to fields |
| `form.reset(values?)` | Reset all fields; optionally set new initial values |
| `form.getValue()` | Get current form values as plain object |
| `form.setValue(values)` | Merge values into form state |

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
<Field selector={(t) => t.name} form={form} />

// Variant-based resolution: looks up "string:password", falls back to "string"
<Field selector={(t) => t.password} form={form} variant="password" />

// With label, name, and extra props for the renderer
<Field
    selector={(t) => t.email}
    form={form}
    label="Email address"
    name="email"
    fieldProps={{ placeholder: 'you@example.com', autoComplete: 'email' }}
/>

// Explicit renderer override
<Field selector={(t) => t.name} form={form} renderer={customRenderer} />
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `selector` | `(tree) => PropertyDescriptor` | PropertyDescriptor selector for the field |
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
            <Field selector={(t) => t.name} form={form} />
            <Field selector={(t) => t.address.city} form={form} />
            <Field selector={(t) => t.address.zip} form={form} />
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
            <Field selector={(t) => t.username} form={form} />
            <Field selector={(t) => t.email} form={form} />
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
            <Field selector={(t) => t.name} form={form} />
            <Field selector={(t) => t.email} form={form} />
            <Field selector={(t) => t.age} form={form} />
            <Field selector={(t) => t.address.city} form={form} />
            <Field selector={(t) => t.address.zip} form={form} />
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

## License

BSD-3-Clause
