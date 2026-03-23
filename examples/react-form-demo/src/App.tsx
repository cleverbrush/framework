import { useState, useCallback, useRef, useEffect } from 'react';
import * as Schema from '@cleverbrush/schema';
import * as Mapper from '@cleverbrush/mapper';

/* ── Sandbox helpers ─────────────────────────────────────────────── */

const SANDBOX_EXAMPLES: Record<string, string> = {
    schema: `// @cleverbrush/schema — define, infer, validate
const { object, string, number, boolean } = Schema;

const UserSchema = object({
  name:  string().min(2).max(50),
  email: string().min(5),
  age:   number().min(0).max(150),
  admin: boolean()
});

const result = UserSchema.validate({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  admin: false
});

log('Valid:', result.valid);
log('Errors:', JSON.stringify(result.errors, null, 2));

// Try invalid data:
const bad = UserSchema.validate({ name: 'A', email: '', age: -5, admin: 'yes' });
log('\\nInvalid example:');
log('Valid:', bad.valid);
log('Errors:', JSON.stringify(bad.errors, null, 2));`,

    mapper: `// @cleverbrush/mapper — schema-to-schema mapping
const { object, string, number } = Schema;
const { MappingRegistry } = Mapper;

const Source = object({
  firstName: string(),
  lastName:  string(),
  years:     number()
});

const Dest = object({
  fullName: string(),
  age:      number()
});

const registry = new MappingRegistry();

registry
  .createMap(Source, Dest)
  .forMember('fullName', opt =>
    opt.mapFrom(src => src.firstName + ' ' + src.lastName)
  )
  .forMember('age', opt => opt.mapFrom(src => src.years));

const mapped = registry.map(Source, Dest, {
  firstName: 'Jane',
  lastName:  'Doe',
  years:     28
});

log('Mapped result:', JSON.stringify(mapped, null, 2));`
};

/* ── Nav links ───────────────────────────────────────────────────── */

const NAV_ITEMS = [
    { href: '#schema', label: 'Schema' },
    { href: '#mapper', label: 'Mapper' },
    { href: '#react-form', label: 'React Form' },
    { href: '#sandbox', label: 'Sandbox' }
];

/* ── Components ──────────────────────────────────────────────────── */

function Navbar() {
    const [active, setActive] = useState('');

    useEffect(() => {
        const onHash = () => setActive(window.location.hash);
        window.addEventListener('hashchange', onHash);
        onHash();
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    return (
        <nav className="navbar">
            <span className="navbar-brand">Cleverbrush Framework</span>
            <div className="navbar-links">
                {NAV_ITEMS.map((item) => (
                    <a
                        key={item.href}
                        href={item.href}
                        className={active === item.href ? 'active' : ''}
                    >
                        {item.label}
                    </a>
                ))}
            </div>
        </nav>
    );
}

function Hero() {
    return (
        <section className="hero">
            <h1>Cleverbrush Framework</h1>
            <p className="tagline">
                Type-safe TypeScript libraries for schema validation, object
                mapping, and headless React forms. Define once — validate,
                map, and render anywhere.
            </p>
            <p className="production-note">
                🚀 These libraries are fairly new and not yet widely known, but they are
                battle-tested in production at{' '}
                <a
                    href="https://cleverbrush.com/editor"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    cleverbrush.com/editor
                </a>
            </p>
            <div className="hero-badges">
                <span className="badge">TypeScript-first</span>
                <span className="badge">Zero dependencies*</span>
                <span className="badge">Immutable schemas</span>
                <span className="badge">BSD-3 Licensed</span>
            </div>
        </section>
    );
}

/* ── Schema Section ──────────────────────────────────────────────── */

function SchemaSection() {
    return (
        <section id="schema" className="section">
            <div className="container">
                <div className="section-header">
                    <h2>@cleverbrush/schema</h2>
                    <p className="subtitle">
                        Immutable, composable schema definitions with built-in
                        validation and TypeScript type inference.
                    </p>
                </div>

                <div className="why-box">
                    <h3>💡 Why?</h3>
                    <p>
                        Define once, validate anywhere — no more writing separate
                        validation logic and TypeScript types. Schemas are immutable
                        objects built with a fluent API, and every modification returns a
                        new schema instance. The PropertyDescriptor system makes schemas
                        introspectable at runtime, powering form generation, mapping,
                        and serialization from a single source of truth.
                    </p>
                </div>

                <div className="card">
                    <h3>Quick Example</h3>
                    <pre>
                        <code>{`import { object, string, number, boolean, InferType } from '@cleverbrush/schema';

const UserSchema = object({
  name:     string().min(2).max(100),
  email:    string().min(5),
  age:      number().min(0).max(150),
  isActive: boolean()
});

// TypeScript type is inferred automatically
type User = InferType<typeof UserSchema>;
// { name: string; email: string; age: number; isActive: boolean }

// Validate data at runtime
const result = UserSchema.validate({
  name: 'Alice', email: 'alice@test.com', age: 30, isActive: true
});
console.log(result.valid); // true`}</code>
                    </pre>
                </div>

                <div className="card">
                    <h3>Comparison with Alternatives</h3>
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>@cleverbrush/schema</th>
                                <th>Zod</th>
                                <th>Yup</th>
                                <th>Joi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>TypeScript type inference</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="partial">~</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Immutable schemas</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>PropertyDescriptors (runtime introspection)</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                                <td className="partial">~</td>
                            </tr>
                            <tr>
                                <td>Drives form generation</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Drives object mapping</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Fluent / chainable API</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                            </tr>
                            <tr>
                                <td>Zero dependencies</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="card">
                    <h3>API Reference</h3>
                    <h4>Schema Builders</h4>
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Function</th>
                                <th>Description</th>
                                <th>Key Methods</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>string()</code></td>
                                <td>String schema builder</td>
                                <td>
                                    <code>.min(n)</code>, <code>.max(n)</code>,{' '}
                                    <code>.pattern(re)</code>, <code>.optional()</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>number()</code></td>
                                <td>Number schema builder</td>
                                <td>
                                    <code>.min(n)</code>, <code>.max(n)</code>,{' '}
                                    <code>.integer()</code>, <code>.optional()</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>boolean()</code></td>
                                <td>Boolean schema builder</td>
                                <td>
                                    <code>.optional()</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>object({'{...}'})</code></td>
                                <td>Object schema with named properties</td>
                                <td>
                                    <code>.validate(data)</code>,{' '}
                                    <code>.extend({'{...}'})</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>array(itemSchema)</code></td>
                                <td>Array schema builder</td>
                                <td>
                                    <code>.min(n)</code>, <code>.max(n)</code>,{' '}
                                    <code>.optional()</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>date()</code></td>
                                <td>Date schema builder</td>
                                <td>
                                    <code>.optional()</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>union(...schemas)</code></td>
                                <td>Union of multiple schemas</td>
                                <td>
                                    <code>.validate(data)</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>any()</code></td>
                                <td>Accepts any value</td>
                                <td>
                                    <code>.optional()</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>func()</code></td>
                                <td>Function schema builder</td>
                                <td>
                                    <code>.optional()</code>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <h4>Utility Types</h4>
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>InferType&lt;T&gt;</code></td>
                                <td>
                                    Extracts the TypeScript type from a schema
                                    definition
                                </td>
                            </tr>
                            <tr>
                                <td><code>ValidationResult</code></td>
                                <td>
                                    Result of <code>.validate()</code> — contains{' '}
                                    <code>valid</code> and <code>errors</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>PropertyDescriptor</code></td>
                                <td>
                                    Runtime metadata for a schema property
                                    (type, constraints, etc.)
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

/* ── Mapper Section ──────────────────────────────────────────────── */

function MapperSection() {
    return (
        <section id="mapper" className="section">
            <div className="container">
                <div className="section-header">
                    <h2>@cleverbrush/mapper</h2>
                    <p className="subtitle">
                        Type-safe object mapping between schemas with compile-time
                        completeness checking.
                    </p>
                </div>

                <div className="why-box">
                    <h3>💡 Why?</h3>
                    <p>
                        Type-safe object mapping with compile-time completeness
                        checking — never miss a property. Unlike generic mapping
                        libraries, @cleverbrush/mapper works directly with schema
                        definitions so the compiler can verify that every destination
                        property is accounted for. The mapping registry pattern keeps
                        all transformations in one place, making refactoring safe and
                        auditable.
                    </p>
                </div>

                <div className="card">
                    <h3>Quick Example</h3>
                    <pre>
                        <code>{`import { object, string, number } from '@cleverbrush/schema';
import { MappingRegistry } from '@cleverbrush/mapper';

const ApiUser = object({
  first_name: string(),
  last_name:  string(),
  birth_year: number()
});

const DomainUser = object({
  fullName: string(),
  age:      number()
});

const registry = new MappingRegistry();

registry
  .createMap(ApiUser, DomainUser)
  .forMember('fullName', opt =>
    opt.mapFrom(src => src.first_name + ' ' + src.last_name)
  )
  .forMember('age', opt =>
    opt.mapFrom(src => new Date().getFullYear() - src.birth_year)
  );

const user = registry.map(ApiUser, DomainUser, {
  first_name: 'Jane',
  last_name:  'Doe',
  birth_year: 1995
});
// { fullName: 'Jane Doe', age: <current year> - 1995 }`}</code>
                    </pre>
                </div>

                <div className="card">
                    <h3>Comparison with Alternatives</h3>
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>@cleverbrush/mapper</th>
                                <th>AutoMapper-ts</th>
                                <th>class-transformer</th>
                                <th>morphism</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Schema-driven mapping</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Compile-time completeness check</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>No decorators required</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                                <td className="check">✓</td>
                            </tr>
                            <tr>
                                <td>Works without classes</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                                <td className="check">✓</td>
                            </tr>
                            <tr>
                                <td>Central registry pattern</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Custom property transforms</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="partial">~</td>
                                <td className="check">✓</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="card">
                    <h3>API Reference</h3>
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Class / Function</th>
                                <th>Description</th>
                                <th>Key Methods</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>MappingRegistry</code></td>
                                <td>
                                    Central registry that holds all schema-to-schema
                                    mappings
                                </td>
                                <td>
                                    <code>.createMap(src, dest)</code>,{' '}
                                    <code>.map(src, dest, data)</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>Mapper</code></td>
                                <td>
                                    Returned by <code>createMap()</code> — configure
                                    individual property mappings
                                </td>
                                <td>
                                    <code>.forMember(key, opts)</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>PropertyMappingBuilder</code></td>
                                <td>
                                    Builder passed to <code>forMember</code> callback
                                </td>
                                <td>
                                    <code>.mapFrom(fn)</code>
                                </td>
                            </tr>
                            <tr>
                                <td><code>MapperConfigurationError</code></td>
                                <td>
                                    Thrown when a mapping configuration is incomplete
                                    or invalid
                                </td>
                                <td>—</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

/* ── React Form Section ──────────────────────────────────────────── */

function ReactFormSection() {
    return (
        <section id="react-form" className="section">
            <div className="container">
                <div className="section-header">
                    <h2>@cleverbrush/react-form</h2>
                    <p className="subtitle">
                        Headless, schema-driven forms for React — define your schema
                        once, get validated forms with any UI library.
                    </p>
                </div>

                <div className="why-box">
                    <h3>💡 Why?</h3>
                    <p>
                        Headless, schema-driven forms — define your schema once, get
                        validated forms with any UI library. Unlike traditional form
                        libraries that require you to manually wire up validation rules,
                        @cleverbrush/react-form reads constraints directly from your
                        schema&apos;s PropertyDescriptors. Change the schema and the
                        form validation updates automatically. The headless architecture
                        means you control the rendering — use Material UI, Ant Design,
                        plain HTML, or anything else.
                    </p>
                </div>

                <div className="card">
                    <h3>Quick Example</h3>
                    <pre>
                        <code>{`import { object, string, number } from '@cleverbrush/schema';
import { useSchemaForm, Field, FormProvider } from '@cleverbrush/react-form';

const ContactSchema = object({
  name:  string().min(2).max(100),
  email: string().min(5),
  age:   number().min(18).max(120)
});

function ContactForm() {
  const form = useSchemaForm(ContactSchema, {
    initialValues: { name: '', email: '', age: 25 }
  });

  return (
    <FormProvider form={form}>
      <form onSubmit={form.handleSubmit(data => console.log(data))}>
        <Field name="name"  render={({ field, meta }) => (
          <div>
            <input {...field} />
            {meta.error && <span>{meta.error}</span>}
          </div>
        )} />
        <Field name="email" render={({ field, meta }) => (
          <div>
            <input {...field} />
            {meta.error && <span>{meta.error}</span>}
          </div>
        )} />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
}`}</code>
                    </pre>
                </div>

                <div className="card">
                    <h3>Comparison with Alternatives</h3>
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
                                <td>Single source of truth (types + validation)</td>
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
                                <td>Nested object support</td>
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
                        </tbody>
                    </table>
                </div>

                <div className="card">
                    <h3>API Reference</h3>
                    <h4>Hooks</h4>
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Hook</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>useSchemaForm(schema, opts?)</code></td>
                                <td>
                                    Creates a form instance from a schema. Returns
                                    form state, handlers, and field accessors.
                                </td>
                            </tr>
                            <tr>
                                <td><code>useField(name)</code></td>
                                <td>
                                    Access a single field&apos;s state and handlers
                                    inside a <code>&lt;FormProvider&gt;</code>.
                                </td>
                            </tr>
                            <tr>
                                <td><code>useFormSystem()</code></td>
                                <td>
                                    Access the form system context (shared renderers,
                                    config).
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <h4>Components</h4>
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Component</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>&lt;FormSystemProvider&gt;</code></td>
                                <td>
                                    Top-level provider for shared form configuration
                                    (custom renderers, defaults).
                                </td>
                            </tr>
                            <tr>
                                <td><code>&lt;FormProvider&gt;</code></td>
                                <td>
                                    Provides a specific form instance to child
                                    components.
                                </td>
                            </tr>
                            <tr>
                                <td><code>&lt;Field&gt;</code></td>
                                <td>
                                    Renders a single form field with a custom
                                    render function receiving field props and
                                    metadata.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

/* ── Sandbox Section ─────────────────────────────────────────────── */

function SandboxSection() {
    const [code, setCode] = useState(SANDBOX_EXAMPLES.schema);
    const [output, setOutput] = useState('');
    const [isError, setIsError] = useState(false);
    const outputRef = useRef<string[]>([]);

    const handleExampleChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const key = e.target.value;
            if (key in SANDBOX_EXAMPLES) {
                setCode(SANDBOX_EXAMPLES[key]);
                setOutput('');
                setIsError(false);
            }
        },
        []
    );

    const runCode = useCallback(() => {
        outputRef.current = [];
        setIsError(false);

        const log = (...args: unknown[]) => {
            outputRef.current.push(
                args
                    .map((a) =>
                        typeof a === 'string' ? a : JSON.stringify(a, null, 2)
                    )
                    .join(' ')
            );
        };

        try {
            const fn = new Function('Schema', 'Mapper', 'log', code);
            fn(Schema, Mapper, log);
            setOutput(
                outputRef.current.length > 0
                    ? outputRef.current.join('\n')
                    : '(no output — use log() to print results)'
            );
        } catch (err) {
            setIsError(true);
            setOutput(
                err instanceof Error
                    ? `${err.name}: ${err.message}`
                    : String(err)
            );
        }
    }, [code]);

    return (
        <section id="sandbox" className="section">
            <div className="container">
                <div className="section-header">
                    <h2>Interactive Sandbox</h2>
                    <p className="subtitle">
                        Try @cleverbrush/schema and @cleverbrush/mapper right in the
                        browser. Edit the code and hit Run.
                    </p>
                </div>

                <div className="card">
                    <div className="sandbox-toolbar">
                        <select
                            onChange={handleExampleChange}
                            defaultValue="schema"
                        >
                            <option value="schema">
                                Schema — Validation
                            </option>
                            <option value="mapper">
                                Mapper — Object Mapping
                            </option>
                        </select>
                        <button
                            className="btn btn-success"
                            onClick={runCode}
                        >
                            ▶ Run
                        </button>
                    </div>

                    <div className="sandbox-container">
                        <div className="sandbox-editor">
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                        <div className="sandbox-output">
                            <div
                                className={`sandbox-output-box${isError ? ' error' : ''}`}
                            >
                                {output || 'Output will appear here…'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ── Footer ──────────────────────────────────────────────────────── */

function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h4>Cleverbrush Framework</h4>
                    <p>
                        Open-source TypeScript libraries for schema validation,
                        object mapping, and headless React forms.
                    </p>
                </div>
                <div className="footer-section">
                    <h4>Links</h4>
                    <a
                        href="https://github.com/cleverbrush/framework"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        GitHub Repository
                    </a>
                    <a
                        href="https://docs.cleverbrush.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Documentation
                    </a>
                    <a
                        href="https://cleverbrush.com/editor"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Cleverbrush Editor
                    </a>
                </div>
                <div className="footer-section">
                    <h4>Packages</h4>
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/schema"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/schema
                    </a>
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/mapper"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/mapper
                    </a>
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/react-form"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/react-form
                    </a>
                </div>
            </div>
            <div className="footer-bottom">
                <p>
                    BSD-3-Clause License •{' '}
                    <a
                        href="https://cleverbrush.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        cleverbrush.com
                    </a>
                </p>
            </div>
        </footer>
    );
}

/* ── App ─────────────────────────────────────────────────────────── */

function App() {
    return (
        <>
            <Navbar />
            <Hero />
            <SchemaSection />
            <MapperSection />
            <ReactFormSection />
            <SandboxSection />
            <Footer />
        </>
    );
}

export default App;
