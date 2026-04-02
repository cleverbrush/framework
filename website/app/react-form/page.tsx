'use client';

import { useState, type ReactNode } from 'react';
import { object, string, number } from '@cleverbrush/schema';
import {
    useSchemaForm,
    Field,
    FormSystemProvider
} from '@cleverbrush/react-form';
import type { FieldRenderProps } from '@cleverbrush/react-form';
import { highlightTS } from '@/lib/highlight';

/* ── Live Quick-Start form ──────────────────────────────────────── */

const ContactSchema = object({
    name: string()
        .required('Name is required')
        .minLength(2, 'Name must be at least 2 characters')
        .maxLength(100, 'Name must be at most 100 characters'),
    email: string()
        .required('Email is required')
        .matches(
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            'Please enter a valid email address'
        ),
    age: number()
        .required('Age is required')
        .min(18, 'Must be at least 18 years old')
        .max(120, 'Must be at most 120')
});

function DemoStringRenderer(props: FieldRenderProps): ReactNode {
    return (
        <div className="demo-field">
            <input
                type="text"
                value={(props.value as string) ?? ''}
                onChange={(e) => props.onChange(e.target.value)}
                onBlur={props.onBlur}
                className={props.touched && props.error ? 'has-error' : ''}
                placeholder={props.touched ? '' : 'Type here…'}
            />
            {props.touched && props.error && (
                <span className="demo-error">{props.error}</span>
            )}
        </div>
    );
}

function DemoNumberRenderer(props: FieldRenderProps): ReactNode {
    return (
        <div className="demo-field">
            <input
                type="number"
                value={props.value != null ? String(props.value) : ''}
                onChange={(e) =>
                    props.onChange(
                        e.target.value === '' ? undefined : Number(e.target.value)
                    )
                }
                onBlur={props.onBlur}
                className={props.touched && props.error ? 'has-error' : ''}
                placeholder="Enter a number…"
            />
            {props.touched && props.error && (
                <span className="demo-error">{props.error}</span>
            )}
        </div>
    );
}

const demoRenderers: Record<string, (props: FieldRenderProps) => ReactNode> = {
    string: DemoStringRenderer,
    number: DemoNumberRenderer
};

function ContactFormDemo() {
    const form = useSchemaForm(ContactSchema);
    const [result, setResult] = useState<string | null>(null);

    const handleSubmit = async () => {
        const res = await form.submit();
        if (res.valid) {
            setResult(JSON.stringify(res.object, null, 2));
        } else {
            setResult(null);
        }
    };

    return (
        <div className="demo-form">
            <div className="demo-form-row">
                <label>Name</label>
                <Field selector={(t) => t.name} form={form} />
            </div>
            <div className="demo-form-row">
                <label>Email</label>
                <Field selector={(t) => t.email} form={form} />
            </div>
            <div className="demo-form-row">
                <label>Age</label>
                <Field selector={(t) => t.age} form={form} />
            </div>
            <button className="demo-submit" onClick={handleSubmit}>
                Submit
            </button>
            {result && (
                <pre className="demo-result">
                    <code>{result}</code>
                </pre>
            )}
        </div>
    );
}

function QuickStartLiveDemo() {
    return (
        <FormSystemProvider renderers={demoRenderers}>
            <ContactFormDemo />
        </FormSystemProvider>
    );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default function ReactFormPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/react-form</h1>
                    <p className="subtitle">
                        Headless, schema-driven React forms — define your schema
                        once, get validated forms with any UI library.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <div className="card">
                    <h2>Installation</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    `npm install @cleverbrush/react-form`
                                )
                            }}
                        />
                    </pre>
                    <p>
                        Requires <code>@cleverbrush/schema</code> and{' '}
                        <code>react</code> as peer dependencies.
                    </p>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <div className="card">
                    <h2>Quick Start</h2>
                    <p>
                        Define a schema, register renderers, create a form,
                        and render fields — all type-safe.
                        The <strong>schema</strong> and{' '}
                        <strong>renderers</strong> are defined{' '}
                        <strong>once per app</strong> and reused by every
                        form — individual form components only declare
                        which fields to show:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';
import {
  useSchemaForm, Field, FormSystemProvider
} from '@cleverbrush/react-form';

// 1. Define your schema once — reuse across forms, API validation, mapping, etc.
const ContactSchema = object({
  name: string()
    .required('Name is required')
    .minLength(2, 'Name must be at least 2 characters')
    .maxLength(100, 'Name must be at most 100 characters'),
  email: string()
    .required('Email is required')
    .matches(
      /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/,
      'Please enter a valid email address'
    ),
  age: number()
    .required('Age is required')
    .min(18, 'Must be at least 18 years old')
    .max(120, 'Must be at most 120')
});

// 2. Register renderers once at the app root — every form inherits them
const renderers = {
  string: ({ value, onChange, onBlur, touched, error }) => (
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
  number: ({ value, onChange, onBlur, touched, error }) => (
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
}`)
                            }}
                        />
                    </pre>

                    <h3>Try it live</h3>
                    <p>
                        This is the exact form described above, rendered with
                        <code> @cleverbrush/react-form</code>. Try submitting
                        with empty fields, a short name, an invalid email, or
                        an out-of-range age to see validation in action:
                    </p>
                    <QuickStartLiveDemo />
                </div>

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/react-form?</h2>

                    <h3>The Problem</h3>
                    <p>
                        Every popular React form library — React Hook Form,
                        Formik, React Final Form — requires you to reference
                        fields by <strong>string names</strong>:{' '}
                        <code>register(&quot;email&quot;)</code>,{' '}
                        <code>
                            &lt;Field name=&quot;address.city&quot; /&gt;
                        </code>
                        . The moment you pass a field name as a string, you
                        lose TypeScript&apos;s type safety. Rename a property
                        in your data model and the compiler stays silent —
                        your form just silently breaks at runtime. The larger
                        your codebase, the more of these invisible string
                        references you accumulate, and the more fragile every
                        refactor becomes.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// React Hook Form — field names are plain strings
const { register } = useForm<User>();
<input {...register("name")} />     // ← no compiler error if "name" is renamed
<input {...register("emial")} />    // ← typo: silently fails at runtime

// Formik — same problem
<Field name="address.city" />       // ← rename "city" → "town" and nothing warns you`)
                            }}
                        />
                    </pre>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/react-form</code> binds fields via{' '}
                        <strong>PropertyDescriptor selectors</strong> — actual
                        TypeScript expressions like{' '}
                        <code>(t) =&gt; t.address.city</code> — instead of
                        strings. The compiler knows the exact shape of your
                        schema, so a renamed or mistyped property is a{' '}
                        <strong>compile-time error</strong>, not a runtime
                        surprise. On top of that the schema{' '}
                        <strong>IS</strong> the validation, the type
                        definition, <strong>AND</strong> the form field
                        configuration. One source of truth. Change the schema
                        and everything updates — types, validation rules,
                        and form field behavior.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// @cleverbrush/react-form — fully type-safe selectors
<Field selector={(t) => t.name} form={form} />           // ✓ checked at compile time
<Field selector={(t) => t.address.city} form={form} />   // ✓ rename "city" → compiler error
<Field selector={(t) => t.emial} form={form} />          // ✗ compile error: "emial" doesn't exist`)
                            }}
                        />
                    </pre>

                    <h3>Headless Architecture</h3>
                    <p>
                        The library doesn&apos;t render anything. You provide
                        renderer functions — plain HTML, Material UI, Ant
                        Design, or any custom components — via{' '}
                        <code>FormSystemProvider</code>. Swap UI libraries by
                        changing one provider and all forms in your app update.
                        This means you can share form logic across different
                        parts of your application that use different UI
                        frameworks.
                    </p>

                    <h3>PropertyDescriptor Selectors</h3>
                    <p>
                        Fields are bound via type-safe selectors like{' '}
                        <code>(t) =&gt; t.address.city</code>, not string
                        paths like <code>&quot;address.city&quot;</code>. This
                        means refactoring is safe — rename a property and the
                        compiler tells you everywhere that needs updating.
                    </p>

                    <h3>Production Tested</h3>
                    <p>
                        Every form in{' '}
                        <a
                            href="https://cleverbrush.com/editor"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            cleverbrush.com/editor
                        </a>{' '}
                        is rendered through{' '}
                        <code>@cleverbrush/react-form</code>. It handles
                        dozens of complex forms with nested objects, async
                        validation, and dynamic field visibility in production
                        every day.
                    </p>
                </div>

                {/* ── How It Works ─────────────────────────────────── */}
                <div className="card">
                    <h2>How It Works — Step by Step</h2>
                    <ol>
                        <li>
                            <strong>Define a schema</strong> using{' '}
                            <code>@cleverbrush/schema</code> — this is your
                            single source of truth for types, validation rules,
                            and field metadata
                        </li>
                        <li>
                            <strong>Register renderers</strong> via{' '}
                            <code>FormSystemProvider</code> — plain functions
                            that map schema types (<code>&quot;string&quot;</code>,{' '}
                            <code>&quot;number&quot;</code>) to your UI
                            components (plain HTML, MUI, Ant Design, etc.)
                        </li>
                        <li>
                            <strong>Create a form instance</strong> via{' '}
                            <code>useSchemaForm(schema)</code> — returns state
                            management, validation, and submit/reset lifecycle
                        </li>
                        <li>
                            <strong>Render fields</strong> via{' '}
                            <code>
                                &lt;Field selector={'{(t) => t.name}'}
                                form={'{form}'} /&gt;
                            </code>{' '}
                            — the component looks up the registered renderer
                            for the field&apos;s schema type automatically
                        </li>
                        <li>
                            <strong>Submit</strong> —{' '}
                            <code>form.submit()</code> runs the schema&apos;s
                            full validation and returns a typed result with
                            per-field errors
                        </li>
                    </ol>
                </div>

                {/* ── Core Concepts ────────────────────────────────── */}
                <div className="card">
                    <h2>Core Concepts</h2>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Concept</th>
                                    <th>What It Does</th>
                                    <th>When to Use</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>FormSystemProvider</code>
                                    </td>
                                    <td>
                                        Registers renderers globally (maps
                                        schema types like &quot;string&quot;,
                                        &quot;number&quot; to React
                                        components).
                                    </td>
                                    <td>
                                        Once at the app root. All forms
                                        underneath inherit the renderers.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>useSchemaForm</code>
                                    </td>
                                    <td>
                                        Creates a form instance from a schema.
                                        Returns state, validation, submit,
                                        reset, and field accessors.
                                    </td>
                                    <td>
                                        In every component that needs a form.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>useField</code>
                                    </td>
                                    <td>
                                        Accesses a single field&apos;s state
                                        and handlers. Works inside a{' '}
                                        <code>FormProvider</code> context.
                                    </td>
                                    <td>
                                        When you want fine-grained control
                                        over individual fields.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>Field</code>
                                    </td>
                                    <td>
                                        Renders a field using the registered
                                        renderer for its schema type.
                                        Supports <code>variant</code> for
                                        type-specific rendering (e.g.{' '}
                                        <code>&quot;password&quot;</code>).
                                        Declarative API.
                                    </td>
                                    <td>
                                        For most form fields — quick and
                                        declarative.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Registering Renderers ────────────────────────── */}
                <div className="card">
                    <h2>Registering Renderers</h2>
                    <p>
                        Renderers are plain functions that receive field state
                        and return React nodes. They map schema type names
                        (like <code>&quot;string&quot;</code>,{' '}
                        <code>&quot;number&quot;</code>,{' '}
                        <code>&quot;boolean&quot;</code>) to UI components. Here
                        are two examples:
                    </p>

                    <h3>Plain HTML Renderers</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const htmlRenderers = {
  string: ({ value, onChange, onBlur, error, dirty, label, name, fieldProps }) => (
    <div className="field">
      {label && <label>{label}</label>}
      <input
        type="text"
        name={name}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={error ? 'input-error' : ''}
        {...fieldProps}
      />
      {dirty && <span className="dirty-indicator">*</span>}
      {error && <span className="error">{error}</span>}
    </div>
  ),
  number: ({ value, onChange, onBlur, error, label, name, fieldProps }) => (
    <div className="field">
      {label && <label>{label}</label>}
      <input
        type="number"
        name={name}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onBlur}
        {...fieldProps}
      />
      {error && <span className="error">{error}</span>}
    </div>
  ),
  boolean: ({ value, onChange, onBlur, label }) => (
    <div className="field">
      <label>
        <input
          type="checkbox"
          checked={value ?? false}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
        />
        {label}
      </label>
    </div>
  )
};`)
                            }}
                        />
                    </pre>

                    <h3>Material UI Renderers (Example)</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// Example — requires @mui/material (not included in this demo)
const muiRenderers = {
  string: ({ value, onChange, onBlur, error }) => (
    <TextField
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      error={!!error}
      helperText={error}
      fullWidth
    />
  ),
  number: ({ value, onChange, onBlur, error }) => (
    <TextField
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      onBlur={onBlur}
      error={!!error}
      helperText={error}
      fullWidth
    />
  )
};

// Swap UI libraries by changing the provider — all forms update!
<FormSystemProvider renderers={muiRenderers}>
  {/* All Field components now render Material UI inputs */}
</FormSystemProvider>`)
                            }}
                        />
                    </pre>

                    <h3>Variant Renderers</h3>
                    <p>
                        Register variant-specific renderers with a{' '}
                        <code>&quot;type:variant&quot;</code> key. When{' '}
                        <code>&lt;Field variant=&quot;password&quot; /&gt;</code>{' '}
                        is rendered on a <code>string</code> field, the registry
                        is checked for <code>&quot;string:password&quot;</code>{' '}
                        first, then falls back to <code>&quot;string&quot;</code>:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const renderers = {
  // Default string renderer
  string: ({ value, onChange, onBlur, error, label, name, fieldProps }) => (
    <div>
      {label && <label>{label}</label>}
      <input type="text" name={name} value={value ?? ''}
             onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
             {...fieldProps} />
      {error && <span className="error">{error}</span>}
    </div>
  ),
  // Password variant — used when <Field variant="password" />
  'string:password': ({ value, onChange, onBlur, error, label, name, fieldProps }) => (
    <div>
      {label && <label>{label}</label>}
      <input type="password" name={name} value={value ?? ''}
             onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
             {...fieldProps} />
      {error && <span className="error">{error}</span>}
    </div>
  ),
  // Textarea variant
  'string:textarea': ({ value, onChange, onBlur, error, label, name, fieldProps }) => (
    <div>
      {label && <label>{label}</label>}
      <textarea name={name} value={value ?? ''}
                onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
                {...fieldProps} />
      {error && <span className="error">{error}</span>}
    </div>
  )
};

// Usage:
<Field selector={(t) => t.name} form={form} label="Name" />
<Field selector={(t) => t.password} form={form}
       variant="password" label="Password"
       fieldProps={{ placeholder: 'Enter password', autoComplete: 'current-password' }} />
<Field selector={(t) => t.bio} form={form}
       variant="textarea" label="Bio"
       fieldProps={{ rows: 4 }} />`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── FormSystemProvider ───────────────────────────── */}
                <div className="card">
                    <h2>FormSystemProvider</h2>
                    <p>
                        <code>FormSystemProvider</code> is a React context
                        provider that makes renderers available to all{' '}
                        <code>Field</code> components underneath it. Place it
                        once at the root of your app:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { FormSystemProvider } from '@cleverbrush/react-form';

function App() {
  return (
    <FormSystemProvider renderers={myRenderers}>
      {/* All forms in your app go here */}
    </FormSystemProvider>
  );
}`)
                            }}
                        />
                    </pre>
                    <p>
                        You can nest providers to override renderers in
                        specific parts of your app. Child providers merge with
                        parent renderers, so you only need to specify the
                        overrides.
                    </p>
                </div>

                {/* ── useSchemaForm ────────────────────────────────── */}
                <div className="card">
                    <h2>useSchemaForm</h2>
                    <p>
                        The main hook for creating form instances. Returns
                        everything you need to manage form state:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const form = useSchemaForm(MySchema, {
  createMissingStructure: true,  // default: true
  validateOnMount: false,        // default: false — set to true to show errors on mount
  validationDebounceMs: 300      // optional — debounce onChange validation (ms)
});`)
                            }}
                        />
                    </pre>

                    <h3>Returned API</h3>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Method / Property</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>form.submit()</code>
                                    </td>
                                    <td>
                                        Validates and returns{' '}
                                        <code>ValidationResult</code>. Call
                                        this on form submission.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>form.validate()</code>
                                    </td>
                                    <td>
                                        Runs validation without submitting.
                                        Useful for &quot;validate on blur&quot;
                                        patterns.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>form.reset(values?)</code>
                                    </td>
                                    <td>
                                        Resets the form to initial values (or
                                        provided values). Clears dirty/touched
                                        state.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>form.getValue()</code>
                                    </td>
                                    <td>
                                        Returns the current form values as a
                                        typed object.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>form.setValue(values)</code>
                                    </td>
                                    <td>
                                        Sets form values programmatically
                                        (partial update).
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>
                                            form.useField(selector)
                                        </code>
                                    </td>
                                    <td>
                                        Hook to access a specific field&apos;s
                                        state. Type-safe via PropertyDescriptor
                                        selector.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── useField ─────────────────────────────────────── */}
                <div className="card">
                    <h2>useField</h2>
                    <p>
                        Access individual field state and handlers. Can be used
                        via <code>form.useField(selector)</code> directly or
                        via the context-based <code>useField(selector)</code>{' '}
                        inside a <code>FormProvider</code>.
                    </p>

                    <h3>Returned State</h3>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Property</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>value</code>
                                    </td>
                                    <td>
                                        <code>T | undefined</code>
                                    </td>
                                    <td>Current field value</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>initialValue</code>
                                    </td>
                                    <td>
                                        <code>T | undefined</code>
                                    </td>
                                    <td>
                                        Value at form creation / last reset
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>dirty</code>
                                    </td>
                                    <td>
                                        <code>boolean</code>
                                    </td>
                                    <td>
                                        True if value differs from
                                        initialValue
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>touched</code>
                                    </td>
                                    <td>
                                        <code>boolean</code>
                                    </td>
                                    <td>
                                        True after the field has been blurred
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>error</code>
                                    </td>
                                    <td>
                                        <code>string | undefined</code>
                                    </td>
                                    <td>
                                        Current validation error message (if
                                        any)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>validating</code>
                                    </td>
                                    <td>
                                        <code>boolean</code>
                                    </td>
                                    <td>
                                        True while async validation is
                                        running
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>onChange(value)</code>
                                    </td>
                                    <td>
                                        <code>(T) =&gt; void</code>
                                    </td>
                                    <td>
                                        Update the field value (triggers
                                        re-render)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>onBlur()</code>
                                    </td>
                                    <td>
                                        <code>() =&gt; void</code>
                                    </td>
                                    <td>
                                        Mark the field as touched (triggers
                                        validation)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>setValue(value)</code>
                                    </td>
                                    <td>
                                        <code>(T) =&gt; void</code>
                                    </td>
                                    <td>
                                        Programmatically set the value
                                        (alias for onChange)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>schema</code>
                                    </td>
                                    <td>
                                        <code>SchemaBuilder</code>
                                    </td>
                                    <td>
                                        The schema builder for this field
                                        (for introspection)
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Headless Usage ───────────────────────────────── */}
                <div className="card">
                    <h2>Headless Usage</h2>
                    <p>
                        You don&apos;t have to use the{' '}
                        <code>Field</code> component at all. Use{' '}
                        <code>form.useField()</code> directly for full control
                        over rendering:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`function MyForm() {
  const form = useSchemaForm(ContactSchema);
  const name = form.useField((t) => t.name);
  const email = form.useField((t) => t.email);

  return (
    <div>
      <label>
        Name
        <input
          value={name.value ?? ''}
          onChange={(e) => name.onChange(e.target.value)}
          onBlur={name.onBlur}
        />
        {name.touched && name.error && (
          <span className="error">{name.error}</span>
        )}
      </label>

      <label>
        Email
        <input
          value={email.value ?? ''}
          onChange={(e) => email.onChange(e.target.value)}
          onBlur={email.onBlur}
        />
        {email.dirty && <span>(modified)</span>}
        {email.error && <span className="error">{email.error}</span>}
      </label>

      <button onClick={() => form.submit()}>Submit</button>
    </div>
  );
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Field Component ──────────────────────────────── */}
                <div className="card">
                    <h2>Field Component</h2>
                    <p>
                        The <code>Field</code> component is a declarative way
                        to render form fields. It looks up the registered
                        renderer for the field&apos;s schema type and passes the
                        field state to it. Use <code>variant</code> for
                        type-specific rendering, and <code>label</code>,{' '}
                        <code>name</code>, <code>fieldProps</code> to forward
                        additional rendering hints:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// Uses the renderer registered for "string" schema type
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

// Override the renderer for a specific field
<Field
  selector={(t) => t.email}
  form={form}
  renderer={({ value, onChange, error }) => (
    <div>
      <input type="email" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      {error && <span>{error}</span>}
    </div>
  )}
/>`)
                            }}
                        />
                    </pre>

                    <h3>Props</h3>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Prop</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>selector</code>
                                    </td>
                                    <td>
                                        <code>
                                            (tree) =&gt; PropertyDescriptor
                                        </code>
                                    </td>
                                    <td>
                                        Type-safe property selector (e.g.{' '}
                                        <code>(t) =&gt; t.name</code>)
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>form</code>
                                    </td>
                                    <td>
                                        <code>SchemaFormInstance</code>
                                    </td>
                                    <td>
                                        The form instance from{' '}
                                        <code>useSchemaForm</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>renderer</code>
                                    </td>
                                    <td>
                                        <code>FieldRenderer</code>
                                    </td>
                                    <td>
                                        Optional override renderer for this
                                        specific field
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>variant</code>
                                    </td>
                                    <td>
                                        <code>string</code>
                                    </td>
                                    <td>
                                        Variant hint for renderer resolution
                                        (e.g. <code>&quot;password&quot;</code>,{' '}
                                        <code>&quot;textarea&quot;</code>).
                                        Checked as{' '}
                                        <code>&quot;type:variant&quot;</code>{' '}
                                        in the registry, falls back to base type.
                                        Also forwarded to the renderer.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>label</code>
                                    </td>
                                    <td>
                                        <code>string</code>
                                    </td>
                                    <td>
                                        Visible label text forwarded to the
                                        renderer
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>name</code>
                                    </td>
                                    <td>
                                        <code>string</code>
                                    </td>
                                    <td>
                                        HTML <code>name</code> attribute
                                        forwarded to the renderer for
                                        FormData submission
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>fieldProps</code>
                                    </td>
                                    <td>
                                        <code>
                                            Record&lt;string, unknown&gt;
                                        </code>
                                    </td>
                                    <td>
                                        Extra renderer-specific props
                                        (e.g. <code>placeholder</code>,{' '}
                                        <code>autoComplete</code>)
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── FormProvider ─────────────────────────────────── */}
                <div className="card">
                    <h2>FormProvider</h2>
                    <p>
                        <code>FormProvider</code> puts a form instance into
                        React context, allowing child components to use the
                        context-based <code>useField</code> hook without
                        passing the form prop explicitly:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { FormProvider, useField } from '@cleverbrush/react-form';

function NameField() {
  // No need to pass form prop — reads from context
  const name = useField((t) => t.name);
  return (
    <input
      value={name.value ?? ''}
      onChange={(e) => name.onChange(e.target.value)}
      onBlur={name.onBlur}
    />
  );
}

function MyForm() {
  const form = useSchemaForm(ContactSchema);
  return (
    <FormProvider form={form}>
      <NameField />
      {/* other fields */}
    </FormProvider>
  );
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Nested Objects ───────────────────────────────── */}
                <div className="card">
                    <h2>Nested Objects</h2>
                    <p>
                        PropertyDescriptor selectors support nested paths.
                        Access deeply nested fields with dot notation in the
                        selector:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const AddressSchema = object({
  city:   string().minLength(1),
  street: string().minLength(1),
  zip:    string().minLength(5).maxLength(10)
});

const UserSchema = object({
  name:    string().minLength(2),
  address: AddressSchema
});

function UserForm() {
  const form = useSchemaForm(UserSchema);

  return (
    <div>
      <Field selector={(t) => t.name} form={form} />
      <Field selector={(t) => t.address.city} form={form} />
      <Field selector={(t) => t.address.street} form={form} />
      <Field selector={(t) => t.address.zip} form={form} />
    </div>
  );
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Validation ───────────────────────────────────── */}
                <div className="card">
                    <h2>Validation</h2>
                    <p>
                        Validation is built into the schema — you don&apos;t
                        configure it separately. Here&apos;s how it works
                        step by step:
                    </p>
                    <ol>
                        <li>
                            <strong>Schema constraints</strong> (minLength, max,
                            matches, etc.) are checked first
                        </li>
                        <li>
                            <strong>Custom validators</strong> added via{' '}
                            <code>.addValidator()</code> run next (can be
                            async)
                        </li>
                        <li>
                            <strong>Per-field errors</strong> are extracted
                            and made available via{' '}
                            <code>useField().error</code>
                        </li>
                        <li>
                            <strong>form.submit()</strong> triggers full
                            validation and returns the result
                        </li>
                    </ol>

                    <h3>Custom Validator Example</h3>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const RegistrationSchema = object({
  username: string().minLength(3).maxLength(20).addValidator(async (value) => {
    // Check if username is taken (async!)
    const taken = await checkUsernameAvailability(value);
    if (taken) {
      return { valid: false, errors: [{ message: 'This username is already taken' }] };
    }
    return { valid: true };
  }),
  password: string().minLength(8, 'Password must be at least 8 characters'),
  confirmPassword: string().minLength(8, 'Please confirm your password')
}).addValidator(async (value) => {
  // Object-level validation
  if (value.password !== value.confirmPassword) {
    return { valid: false, errors: [{ message: 'Passwords do not match' }] };
  }
  return { valid: true };
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Comparison ───────────────────────────────────── */}
                <div className="card">
                    <h2>Comparison with Alternatives</h2>
                    <div className="table-wrap">
                        <table className="comparison-table">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>@cleverbrush/react-form</th>
                                    <th>React Hook Form</th>
                                    <th>Formik</th>
                                    <th>React Final Form</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Schema-driven validation</td>
                                    <td className="check">✓ built-in</td>
                                    <td className="partial">~ via resolver</td>
                                    <td className="partial">~ via plugin</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>
                                        Single source of truth (types +
                                        validation)
                                    </td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Headless / UI-agnostic</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="partial">~</td>
                                    <td className="check">✓</td>
                                </tr>
                                <tr>
                                    <td>PropertyDescriptor introspection</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Immutable schema integration</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Nested objects</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                </tr>
                                <tr>
                                    <td>Zero extra dependencies</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="check">✓</td>
                                </tr>
                                <tr>
                                    <td>Global renderer system</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Type-safe field selectors</td>
                                    <td className="check">✓</td>
                                    <td className="partial">~</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Auto-field rendering by type</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Async validation support</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── API Reference ────────────────────────────────── */}
                <div className="card">
                    <h2>API Reference</h2>

                    <h3>Hooks</h3>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Hook</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>
                                            useSchemaForm(schema, opts?)
                                        </code>
                                    </td>
                                    <td>
                                        Creates a form instance from a schema.
                                        Returns form state, handlers, and field
                                        accessors.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>useField(selector)</code>
                                    </td>
                                    <td>
                                        Access a single field&apos;s state and
                                        handlers inside a{' '}
                                        <code>FormProvider</code> context.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>useFormSystem()</code>
                                    </td>
                                    <td>
                                        Access the form system context (shared
                                        renderers, config).
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>Components</h3>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Component</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>
                                            &lt;FormSystemProvider&gt;
                                        </code>
                                    </td>
                                    <td>
                                        Top-level provider for shared form
                                        configuration (custom renderers,
                                        defaults).
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>&lt;FormProvider&gt;</code>
                                    </td>
                                    <td>
                                        Provides a specific form instance to
                                        child components via context.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>&lt;Field&gt;</code>
                                    </td>
                                    <td>
                                        Renders a form field using the
                                        registered renderer for its schema
                                        type.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>Types</h3>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>FieldRenderProps</code>
                                    </td>
                                    <td>
                                        Props passed to renderer functions:
                                        value, onChange, onBlur, error, dirty,
                                        touched, validating, setValue, schema,
                                        variant, label, name, fieldProps.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>FieldRenderer</code>
                                    </td>
                                    <td>
                                        Function type:{' '}
                                        <code>
                                            (props: FieldRenderProps) =&gt;
                                            ReactNode
                                        </code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>SchemaFormInstance</code>
                                    </td>
                                    <td>
                                        Return type of useSchemaForm. Contains
                                        submit, validate, reset, getValue,
                                        setValue, useField.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>UseFieldResult</code>
                                    </td>
                                    <td>
                                        Return type of useField. Contains
                                        value, error, dirty, touched,
                                        validating, onChange, onBlur, setValue,
                                        schema.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>FormSystemConfig</code>
                                    </td>
                                    <td>
                                        Configuration object for
                                        FormSystemProvider: renderers record.
                                        Keys can be <code>&quot;type&quot;</code>{' '}
                                        or <code>&quot;type:variant&quot;</code>.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
