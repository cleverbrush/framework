import { highlightTS } from '@/lib/highlight';

export default function SchemaPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/schema</h1>
                    <p className="subtitle">
                        Immutable, composable schema definitions with built-in
                        validation and TypeScript type inference.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <div className="card">
                    <h2>Installation</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    `npm install @cleverbrush/schema`
                                )
                            }}
                        />
                    </pre>
                </div>

                {/* ── Why ──────────────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 Why @cleverbrush/schema?</h2>

                    <h3>The Problem</h3>
                    <p>
                        In a typical TypeScript project, types and runtime
                        validation are separate concerns. You define a{' '}
                        <code>User</code> type in one file, then write Joi / Yup
                        / Zod schemas (or manual <code>if</code> checks) in
                        another. Over time these drift apart — the type says a
                        field is required, but the validation allows it to be{' '}
                        <code>undefined</code>. Tests pass, but production data
                        breaks because the validation didn&apos;t match the
                        type.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/schema</code> lets you define a
                        schema <strong>once</strong> and derive both the
                        TypeScript type (via <code>InferType</code>) and runtime
                        validation from the same source. Because every method
                        returns a <strong>new builder instance</strong>
                        (immutability), you can safely compose and extend
                        schemas without accidentally mutating shared
                        definitions.
                    </p>

                    <h3>The Unique Feature: PropertyDescriptors</h3>
                    <p>
                        Unlike other schema libraries,{' '}
                        <code>@cleverbrush/schema</code> exposes a{' '}
                        <strong>runtime descriptor tree</strong> that other
                        tools can introspect. The{' '}
                        <code>@cleverbrush/mapper</code> uses it for type-safe
                        property selectors. The{' '}
                        <code>@cleverbrush/react-form</code> uses it to
                        auto-generate form fields with correct validation. This
                        makes the schema library a <strong>foundation</strong>{' '}
                        for an entire ecosystem — not just a standalone
                        validation tool.
                    </p>

                    <h3>Production Tested</h3>
                    <p>
                        Every form, every API response mapping, and every
                        validation rule in{' '}
                        <a
                            href="https://cleverbrush.com/editor"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            cleverbrush.com/editor
                        </a>{' '}
                        is powered by <code>@cleverbrush/schema</code>. It
                        handles hundreds of schemas with nested objects, async
                        validators, and custom error messages in production
                        every day.
                    </p>
                </div>

                {/* ── How It Works ─────────────────────────────────── */}
                <div className="card">
                    <h2>How It Works — Step by Step</h2>
                    <ol>
                        <li>
                            <strong>Define a schema</strong> using builder
                            functions like <code>object()</code>,{' '}
                            <code>string()</code>, <code>number()</code> — chain
                            constraints with a fluent API
                        </li>
                        <li>
                            <strong>Infer the TypeScript type</strong> with{' '}
                            <code>
                                type T = InferType&lt;typeof MySchema&gt;
                            </code>{' '}
                            — no manual interface needed
                        </li>
                        <li>
                            <strong>Validate data</strong> with{' '}
                            <code>await schema.validate(data)</code> — get typed
                            results with per-property errors
                        </li>
                        <li>
                            <strong>Compose and extend</strong> — every method
                            returns a new immutable instance, so you can safely
                            build schema libraries from shared fragments
                        </li>
                        <li>
                            <strong>Integrate</strong> — pass schemas to{' '}
                            <code>@cleverbrush/mapper</code> for object mapping
                            or <code>@cleverbrush/react-form</code> for React
                            forms — same schema, everywhere
                        </li>
                    </ol>
                </div>

                {/* ── Quick Start ──────────────────────────────────── */}
                <div className="card">
                    <h2>Quick Start</h2>
                    <p>
                        Define a schema, infer its TypeScript type, and validate
                        data — all from a single definition:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number, boolean, InferType } from '@cleverbrush/schema';

// Define a schema with fluent constraints and custom error messages
const UserSchema = object({
  name:     string().nonempty('Name is required').minLength(2, 'Name must be at least 2 characters'),
  email:    string().email('Please enter a valid email address'),
  age:      number().min(0, 'Age cannot be negative').max(150, 'Age seems unrealistic').positive(),
  isActive: boolean()
});

// TypeScript type is inferred automatically — no duplication!
type User = InferType<typeof UserSchema>;
// Equivalent to: { name: string; email: string; age: number; isActive: boolean }

// Validate data at runtime using the same schema
const result = await UserSchema.validate({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  isActive: true
});

console.log(result.valid);  // true
console.log(result.object); // the validated object

// Invalid data produces structured errors
const bad = await UserSchema.validate(
  { name: 'A', email: '', age: -5, isActive: true },
  { doNotStopOnFirstError: true }
);

console.log(bad.valid);  // false
console.log(bad.errors);
// [
//   { path: '$.name', message: 'Name must be at least 2 characters' },
//   { path: '$.email', message: 'Please enter a valid email address' },
//   { path: '$.age', message: 'Age cannot be negative' }
// ]`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Schema Types ─────────────────────────────────── */}
                <div className="card">
                    <h2>Schema Types</h2>
                    <p>
                        Every builder function returns an immutable schema
                        instance with a fluent API. Here are all available
                        types:
                    </p>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Builder</th>
                                    <th>Description</th>
                                    <th>Key Methods</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>any()</code>
                                    </td>
                                    <td>
                                        Accepts any value. Useful as a
                                        placeholder or for untyped fields.
                                    </td>
                                    <td>
                                        <code>.optional()</code>,{' '}
                                        <code>.addValidator(fn)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>string()</code>
                                    </td>
                                    <td>
                                        String values with length and pattern
                                        constraints.
                                    </td>
                                    <td>
                                        <code>.minLength(n)</code>,{' '}
                                        <code>.maxLength(n)</code>,{' '}
                                        <code>.matches(re)</code>,{' '}
                                        <code>.email()</code>,{' '}
                                        <code>.url()</code>,{' '}
                                        <code>.uuid()</code>,{' '}
                                        <code>.ip()</code>,{' '}
                                        <code>.trim()</code>,{' '}
                                        <code>.toLowerCase()</code>,{' '}
                                        <code>.nonempty()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>number()</code>
                                    </td>
                                    <td>
                                        Numeric values with range and integer
                                        constraints.
                                    </td>
                                    <td>
                                        <code>.min(n)</code>,{' '}
                                        <code>.max(n)</code>,{' '}
                                        <code>.integer()</code>,{' '}
                                        <code>.positive()</code>,{' '}
                                        <code>.negative()</code>,{' '}
                                        <code>.finite()</code>,{' '}
                                        <code>.multipleOf(n)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>boolean()</code>
                                    </td>
                                    <td>Boolean values (true / false).</td>
                                    <td>
                                        <code>.optional()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>date()</code>
                                    </td>
                                    <td>
                                        Date values. Validates that the input is
                                        a valid Date instance.
                                    </td>
                                    <td>
                                        <code>.optional()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>func()</code>
                                    </td>
                                    <td>
                                        Function values. Useful for callback
                                        props in component schemas.
                                    </td>
                                    <td>
                                        <code>.optional()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>object({'{...}'})</code>
                                    </td>
                                    <td>
                                        Object schemas with named properties.
                                        The core building block for complex
                                        types.
                                    </td>
                                    <td>
                                        <code>.validate(data)</code>,{' '}
                                        <code>.addProps({'{...}'})</code>,{' '}
                                        <code>.optional()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>array(schema)</code>
                                    </td>
                                    <td>
                                        Array of items matching the given
                                        element schema.
                                    </td>
                                    <td>
                                        <code>.minLength(n)</code>,{' '}
                                        <code>.maxLength(n)</code>,{' '}
                                        <code>.of(schema)</code>,{' '}
                                        <code>.nonempty()</code>,{' '}
                                        <code>.unique()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>union(...schemas)</code>
                                    </td>
                                    <td>
                                        Value must match one of the provided
                                        schemas (logical OR).
                                    </td>
                                    <td>
                                        <code>.validate(data)</code>,{' '}
                                        <code>.optional()</code>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Immutability ─────────────────────────────────── */}
                <div className="card">
                    <h2>Immutability</h2>
                    <p>
                        Every method on a schema builder returns a{' '}
                        <strong>new instance</strong>. The original is never
                        modified. This means you can safely derive new schemas
                        from existing ones without worrying about side effects:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { string } from '@cleverbrush/schema';

const base = string().minLength(1);
const strict = base.maxLength(50);    // new instance — base is unchanged
const loose  = base.optional(); // another new instance

// base still only has minLength(1)
// strict has minLength(1) + maxLength(50)
// loose has minLength(1) + optional`)
                            }}
                        />
                    </pre>
                    <p>
                        This is especially powerful when building a library of
                        reusable schema fragments:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const Email = string().minLength(5).maxLength(255);
const Name  = string().minLength(1).maxLength(100);

const CreateUser = object({ name: Name, email: Email });
const UpdateUser = object({ name: Name.optional(), email: Email.optional() });
// Both schemas share the same base constraints but differ in optionality`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── JSDoc Comments Preservation ─────────────────── */}
                <div className="card">
                    <h2>JSDoc Comments Preservation</h2>
                    <p>
                        When you define an object schema, JSDoc comments on
                        properties are preserved in the inferred TypeScript
                        type. This means your IDE tooltips, hover documentation,
                        and autocomplete descriptions all carry through from the
                        schema definition — no need to maintain separate
                        documentation:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number, InferType } from '@cleverbrush/schema';

const UserSchema = object({
  /** Full display name of the user */
  name: string().minLength(1).maxLength(200),
  /** Contact email — must be unique across all users */
  email: string().minLength(5),
  /** Age in years. Must be a positive integer. */
  age: number().min(0).max(150)
});

type User = InferType<typeof UserSchema>;
// Hovering over User.name in your IDE shows:
//   "Full display name of the user"
// Hovering over User.email shows:
//   "Contact email — must be unique across all users"`)
                            }}
                        />
                    </pre>
                    <p>
                        This is a unique advantage over other validation
                        libraries: your schema is not just a runtime validator
                        but also the canonical source of documentation for every
                        property. Other libraries like Zod, Yup, and Joi do not
                        carry JSDoc comments through to their inferred types.
                    </p>
                </div>

                {/* ── Composing Schemas ────────────────────────────── */}
                <div className="card">
                    <h2>Composing Schemas</h2>
                    <p>
                        Schemas can be extended with additional properties,
                        combined with unions, or nested inside arrays and
                        objects:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number, array, union } from '@cleverbrush/schema';

// Extend an existing schema with new properties
const BaseEntity = object({
  id:        string(),
  createdAt: string()
});

const UserEntity = BaseEntity.addProps({
  name:  string().minLength(2),
  email: string().minLength(5)
});

// Nest objects
const TeamSchema = object({
  name:    string().minLength(1),
  members: array(UserEntity).minLength(1).maxLength(50)
});

// Union types
const IdOrEmail = union(
  string().minLength(1),   // lookup by ID
  string().matches(/^[^@]+@[^@]+$/) // or by email
);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Validation ───────────────────────────────────── */}
                <div className="card">
                    <h2>Validation</h2>

                    <h3>Basic Validation</h3>
                    <p>
                        Call <code>.validate(data)</code> on any schema. It
                        returns a promise with <code>valid</code>,{' '}
                        <code>errors</code>, and the cleaned <code>object</code>
                        . For object schemas, the result also includes a{' '}
                        <code>getErrorsFor()</code> method for per-property
                        error inspection — the flat <code>errors</code> array is{' '}
                        <strong>deprecated</strong> on object schema results and
                        will be removed in a future major version.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const result = await UserSchema.validate({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  isActive: true
});

if (result.valid) {
  console.log('Validated:', result.object);
} else {
  // For object schemas, prefer getErrorsFor() for per-property error inspection (see below)
  console.log('Errors:', result.errors);
  // errors is deprecated on object schemas — Array of { path: string; message: string }
}`)
                            }}
                        />
                    </pre>

                    <h3>Per-Property Errors (Recommended)</h3>
                    <p>
                        Use <code>getErrorsFor()</code> with a
                        PropertyDescriptor selector to get errors for a specific
                        field — perfect for showing inline form errors.{' '}
                        <strong>
                            This is the recommended way to inspect validation
                            errors on object schemas
                        </strong>{' '}
                        and replaces the deprecated <code>errors</code> array on
                        object schema validation results. It returns an object
                        with <code>isValid</code> (boolean), <code>errors</code>{' '}
                        (array of error strings), and <code>seenValue</code>{' '}
                        (the value that was validated).
                    </p>
                    <p>
                        Pass <code>{'{ doNotStopOnFirstError: true }'}</code> to{' '}
                        <code>.validate()</code> to collect <strong>all</strong>{' '}
                        errors at once, instead of stopping at the first
                        failure:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const result = await UserSchema.validate(
  { name: 'A', email: '', age: -5, isActive: true },
  { doNotStopOnFirstError: true }
);

if (result.getErrorsFor) {
  // Get errors for a top-level property
  const nameErrors = result.getErrorsFor((t) => t.name);
  console.log(nameErrors.isValid);    // false
  console.log(nameErrors.errors);     // ['Name must be at least 2 characters']
  console.log(nameErrors.seenValue);  // 'A'

  // Get errors for a nested property (e.g. address.city)
  // const cityErrors = result.getErrorsFor((t) => t.address.city);
  // console.log(cityErrors.isValid);  // true or false
  // console.log(cityErrors.errors);   // array of error strings
}`)
                            }}
                        />
                    </pre>

                    <h3>Custom Error Messages</h3>
                    <p>
                        Every constraint method accepts an optional second
                        argument for a custom error message. This lets you
                        provide user-friendly messages instead of the default
                        generic ones:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { string, number, array } from '@cleverbrush/schema';

// String constraints with custom messages
const NameSchema = string()
  .minLength(2, 'Name must be at least 2 characters')
  .maxLength(100, 'Name cannot exceed 100 characters');

// Number constraints with custom messages
const AgeSchema = number()
  .min(0, 'Age cannot be negative')
  .max(150, 'Age seems unrealistic');

// Array constraints with custom messages
const TagsSchema = array(string())
  .minLength(1, 'At least one tag is required')
  .maxLength(10, 'No more than 10 tags allowed');`)
                            }}
                        />
                    </pre>

                    <h3>Custom Validators</h3>
                    <p>
                        Add custom synchronous or asynchronous validators to any
                        schema. They receive the value and must return an object
                        with <code>valid</code> (boolean) and optionally{' '}
                        <code>errors</code> (array of{' '}
                        <code>{'{ message: string }'}</code>):
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const EmailSchema = string()
  .minLength(5, 'Email is too short')
  .addValidator(async (value) => {
    // Example: check against an API
    if (value === 'taken@example.com') {
      return {
        valid: false,
        errors: [{ message: 'This email is already registered' }]
      };
    }
    return { valid: true };
  });

const result = await EmailSchema.validate('taken@example.com');
console.log(result.valid);  // false
console.log(result.errors); // [{ path: '$($validators[0])', message: 'This email is already registered' }]`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── PropertyDescriptors ──────────────────────────── */}
                <div className="card">
                    <h2>PropertyDescriptors</h2>
                    <p>
                        A <code>PropertyDescriptor</code> is a runtime metadata
                        object attached to each property in an object schema. It
                        provides type-safe access to:
                    </p>
                    <ul>
                        <li>
                            <strong>getValue / setValue</strong> — read and
                            write property values on any object matching the
                            schema, with full type safety
                        </li>
                        <li>
                            <strong>getSchema</strong> — retrieve the schema
                            builder for the property (its type, constraints,
                            validators)
                        </li>
                        <li>
                            <strong>parent</strong> — navigate up the descriptor
                            tree
                        </li>
                    </ul>
                    <p>
                        PropertyDescriptors are what make the entire ecosystem
                        work. The mapper library uses them as{' '}
                        <strong>selectors</strong> — like C# expression trees —
                        to point at source and target properties type-safely.
                        The form library uses them to bind fields to specific
                        schema properties and read their validation constraints
                        automatically.
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, ObjectSchemaBuilder } from '@cleverbrush/schema';

const AddressSchema = object({
  city:   string().minLength(1),
  street: string().minLength(1),
  zip:    string().minLength(5).maxLength(10)
});

const UserSchema = object({
  name:    string().minLength(2),
  address: AddressSchema
});

// Get the PropertyDescriptor tree
const tree = ObjectSchemaBuilder.getPropertiesFor(UserSchema);

// Type-safe property access
const user = { name: 'Alice', address: { city: 'NYC', street: '5th Ave', zip: '10001' } };
const cityDesc = tree.address.city;

// Read a value
const cityResult = cityDesc[Symbol.for('schemaPropertyDescriptor')].getValue(user);
console.log(cityResult.value); // 'NYC'`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Extensions ──────────────────────────────────── */}
                <div className="card">
                    <h2>Extensions</h2>
                    <p>
                        The extension system lets you add <strong>custom
                        methods</strong> to any schema builder type without
                        modifying the core library. Define an extension once,
                        apply it with <code>withExtensions()</code>, and every
                        builder produced by the returned factories includes your
                        new methods — fully typed and chainable.
                    </p>

                    <h3>Defining an Extension</h3>
                    <p>
                        Use <code>defineExtension()</code> to declare which
                        builder types your extension targets and what methods it
                        adds. The system automatically attaches extension
                        metadata — no boilerplate needed:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { defineExtension, withExtensions, StringSchemaBuilder, NumberSchemaBuilder } from '@cleverbrush/schema';

// Email extension — adds .email() to string builders
const emailExt = defineExtension({
  string: {
    email(this: StringSchemaBuilder) {
      return this.addValidator((val) => {
        const valid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(val as string);
        return { valid, errors: valid ? [] : [{ message: 'Invalid email address' }] };
      });
    }
  }
});

// Port extension — adds .port() to number builders
const portExt = defineExtension({
  number: {
    port(this: NumberSchemaBuilder) {
      return this.isInteger().min(1).max(65535);
    }
  }
});`)
                            }}
                        />
                    </pre>

                    <h3>Using Extensions</h3>
                    <p>
                        Pass one or more extension descriptors to{' '}
                        <code>withExtensions()</code> to get augmented factory
                        functions. All original builder methods remain available:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const s = withExtensions(emailExt, portExt);

// .email() is now available on string builders
const EmailSchema = s.string().email().minLength(5);

// .port() is now available on number builders
const PortSchema = s.number().port();

// Use in object schemas
const ServerConfig = s.object({
  adminEmail: s.string().email(),
  port: s.number().port(),
  name: s.string().minLength(1)
});`)
                            }}
                        />
                    </pre>

                    <h3>Extension Metadata &amp; Introspection</h3>
                    <p>
                        Extension methods automatically record metadata that can
                        be inspected at runtime via{' '}
                        <code>.introspect().extensions</code>. Zero-arg methods
                        store <code>true</code>, single-arg methods store the
                        argument, and multi-arg methods store the arguments
                        array:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const schema = s.string().email();
const meta = schema.introspect();
console.log(meta.extensions.email); // true

// For methods with arguments:
const rangeExt = defineExtension({
  number: {
    range(this: NumberSchemaBuilder, min: number, max: number) {
      return this.min(min).max(max);
    }
  }
});
const s2 = withExtensions(rangeExt);
const rangeSchema = s2.number().range(0, 100);
console.log(rangeSchema.introspect().extensions.range); // [0, 100]`)
                            }}
                        />
                    </pre>

                    <h3>Custom Metadata</h3>
                    <p>
                        If you need structured metadata (e.g. an object with
                        named fields), call{' '}
                        <code>this.withExtension(key, value)</code> explicitly.
                        The auto-infer logic detects the existing key and skips
                        automatic attachment:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const currencyExt = defineExtension({
  number: {
    currency(this: NumberSchemaBuilder, opts?: { maxDecimals?: number }) {
      const maxDec = opts?.maxDecimals ?? 2;
      return this.withExtension('currency', { maxDecimals: maxDec })
        .min(0)
        .addValidator((val) => {
          const decimals = (String(val).split('.')[1] ?? '').length;
          const valid = decimals <= maxDec;
          return { valid, errors: valid ? [] : [{ message: \`Max \${maxDec} decimal places\` }] };
        });
    }
  }
});`)
                            }}
                        />
                    </pre>

                    <h3>Build &amp; Share Extensions</h3>
                    <p>
                        Extensions are plain objects — easy to publish as npm
                        packages and share with the community. Unlike Zod&apos;s{' '}
                        <code>.refine()</code> or Yup&apos;s{' '}
                        <code>.test()</code>, extensions add{' '}
                        <strong>named, discoverable methods</strong> to the
                        builder API with full TypeScript autocompletion. Unlike
                        Joi&apos;s <code>.extend()</code>, extension methods are
                        type-safe and composable without any casts.
                    </p>
                    <p>
                        We encourage the community to create and publish
                        extensions for common use cases — email validation,
                        currency formatting, URL slugs, phone numbers, and
                        more. A well-typed extension is just a{' '}
                        <code>defineExtension()</code> call away.
                    </p>
                </div>

                {/* ── Built-in Extensions ─────────────────────────────── */}
                <div className="card">
                    <h2>Built-in Extensions</h2>
                    <p>
                        The default import from <code>@cleverbrush/schema</code>{' '}
                        includes a pre-applied extension pack with common
                        validators. You get these methods automatically — no
                        extra setup required:
                    </p>

                    <h3>String Extensions</h3>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Method</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>.email(errorMessage?)</code></td>
                                    <td>Validates email format</td>
                                </tr>
                                <tr>
                                    <td><code>.url(opts?, errorMessage?)</code></td>
                                    <td>Validates URL format. <code>opts.protocols</code> narrows allowed schemes</td>
                                </tr>
                                <tr>
                                    <td><code>.uuid(errorMessage?)</code></td>
                                    <td>Validates UUID v4 format</td>
                                </tr>
                                <tr>
                                    <td><code>.ip(opts?, errorMessage?)</code></td>
                                    <td>Validates IPv4 or IPv6. <code>opts.version</code> narrows to <code>&apos;v4&apos;</code> or <code>&apos;v6&apos;</code></td>
                                </tr>
                                <tr>
                                    <td><code>.trim()</code></td>
                                    <td>Preprocessor — trims whitespace before validation</td>
                                </tr>
                                <tr>
                                    <td><code>.toLowerCase()</code></td>
                                    <td>Preprocessor — lowercases value before validation</td>
                                </tr>
                                <tr>
                                    <td><code>.nonempty(errorMessage?)</code></td>
                                    <td>Rejects empty strings</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>Number Extensions</h3>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Method</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>.positive(errorMessage?)</code></td>
                                    <td>Value must be &gt; 0</td>
                                </tr>
                                <tr>
                                    <td><code>.negative(errorMessage?)</code></td>
                                    <td>Value must be &lt; 0</td>
                                </tr>
                                <tr>
                                    <td><code>.finite(errorMessage?)</code></td>
                                    <td>Value must be finite</td>
                                </tr>
                                <tr>
                                    <td><code>.multipleOf(n, errorMessage?)</code></td>
                                    <td>Value must be an exact multiple of <code>n</code> (float-safe)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>Array Extensions</h3>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Method</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>.nonempty(errorMessage?)</code></td>
                                    <td>Array must have at least one element</td>
                                </tr>
                                <tr>
                                    <td><code>.unique(keyFn?, errorMessage?)</code></td>
                                    <td>All elements must be unique. Optional <code>keyFn</code> extracts comparison key</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <p>
                        All validator extensions accept an optional error
                        message as the last parameter — either a string or a
                        function (matching the same{' '}
                        <code>ValidationErrorMessageProvider</code> pattern
                        used by built-in constraints like{' '}
                        <code>.minLength()</code>):
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { string, number, array } from '@cleverbrush/schema';

// String error messages
const email = string().email('Please enter a valid email');
const age = number().positive('Age must be positive');
const tags = array().of(string()).nonempty('At least one tag required');

// Function error messages — receive the invalid value
const name = string().nonempty((val) => \`"\${val}" is not allowed\`);
const score = number().multipleOf(5, (val) => \`\${val} is not a multiple of 5\`);`)
                            }}
                        />
                    </pre>

                    <h3>The <code>/core</code> Sub-path</h3>
                    <p>
                        If you need bare builders <strong>without</strong> the
                        built-in extensions (e.g. to apply only your own custom
                        extensions), import from the <code>/core</code>{' '}
                        sub-path:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// Bare builders — no built-in extensions
import { string, number, array, withExtensions } from '@cleverbrush/schema/core';

// Apply only your own extensions
const s = withExtensions(myCustomExtension);`)
                            }}
                        />
                    </pre>
                    <p>
                        The default import re-exports everything from{' '}
                        <code>/core</code> and overrides the nine factory
                        functions with pre-extended versions. The extension
                        descriptors themselves (<code>stringExtensions</code>,{' '}
                        <code>numberExtensions</code>,{' '}
                        <code>arrayExtensions</code>) are also exported so you
                        can compose them with your own.
                    </p>
                </div>

                {/* ── Comparison ───────────────────────────────────── */}
                <div className="card">
                    <h2>Comparison with Alternatives</h2>
                    <p>
                        How does <code>@cleverbrush/schema</code> compare to
                        other popular TypeScript validation libraries?
                    </p>
                    <div className="table-wrap">
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
                                    <td>PropertyDescriptors</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="partial">~</td>
                                </tr>
                                <tr>
                                    <td>JSDoc comments preservation</td>
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
                                <tr>
                                    <td>Custom error messages</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                </tr>
                                <tr>
                                    <td>Per-property error inspection</td>
                                    <td className="check">✓</td>
                                    <td className="partial">~</td>
                                    <td className="partial">~</td>
                                    <td className="partial">~</td>
                                </tr>
                                <tr>
                                    <td>Async validation</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                </tr>
                                <tr>
                                    <td>Extension / plugin system</td>
                                    <td className="check">✓</td>
                                    <td className="partial">~</td>
                                    <td className="cross">✗</td>
                                    <td className="partial">~</td>
                                </tr>
                                <tr>
                                    <td>Built-in validators (email…)</td>
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

                    <h3>Builder Functions</h3>
                    <div className="table-wrap">
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
                                    <td>
                                        <code>any()</code>
                                    </td>
                                    <td>Accepts any value</td>
                                    <td>
                                        <code>.optional()</code>,{' '}
                                        <code>.addValidator(fn)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>string()</code>
                                    </td>
                                    <td>String schema builder</td>
                                    <td>
                                        <code>.minLength(n)</code>,{' '}
                                        <code>.maxLength(n)</code>,{' '}
                                        <code>.matches(re)</code>,{' '}
                                        <code>.email()</code>,{' '}
                                        <code>.url()</code>,{' '}
                                        <code>.uuid()</code>,{' '}
                                        <code>.ip()</code>,{' '}
                                        <code>.trim()</code>,{' '}
                                        <code>.toLowerCase()</code>,{' '}
                                        <code>.nonempty()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>number()</code>
                                    </td>
                                    <td>Number schema builder</td>
                                    <td>
                                        <code>.min(n)</code>,{' '}
                                        <code>.max(n)</code>,{' '}
                                        <code>.integer()</code>,{' '}
                                        <code>.positive()</code>,{' '}
                                        <code>.negative()</code>,{' '}
                                        <code>.finite()</code>,{' '}
                                        <code>.multipleOf(n)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>boolean()</code>
                                    </td>
                                    <td>Boolean schema builder</td>
                                    <td>
                                        <code>.optional()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>date()</code>
                                    </td>
                                    <td>Date schema builder</td>
                                    <td>
                                        <code>.optional()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>func()</code>
                                    </td>
                                    <td>Function schema builder</td>
                                    <td>
                                        <code>.optional()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>object({'{...}'})</code>
                                    </td>
                                    <td>Object schema with named properties</td>
                                    <td>
                                        <code>.validate(data)</code>,{' '}
                                        <code>.addProps({'{...}'})</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>array(schema)</code>
                                    </td>
                                    <td>Array of items schema</td>
                                    <td>
                                        <code>.minLength(n)</code>,{' '}
                                        <code>.maxLength(n)</code>,{' '}
                                        <code>.of(schema)</code>,{' '}
                                        <code>.nonempty()</code>,{' '}
                                        <code>.unique()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>union(...schemas)</code>
                                    </td>
                                    <td>Union of schemas</td>
                                    <td>
                                        <code>.validate(data)</code>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>Extension Functions</h3>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Function</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>defineExtension(config)</code>
                                    </td>
                                    <td>
                                        Defines an extension targeting one or
                                        more builder types. Returns a branded{' '}
                                        <code>ExtensionDescriptor</code>.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>withExtensions(...exts)</code>
                                    </td>
                                    <td>
                                        Creates augmented builder factories with
                                        extension methods applied. Accepts one
                                        or more <code>ExtensionDescriptor</code>s.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>Utility Types</h3>
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
                                        <code>InferType&lt;T&gt;</code>
                                    </td>
                                    <td>
                                        Extracts the TypeScript type from a
                                        schema definition.{' '}
                                        <code>
                                            type User = InferType&lt;typeof
                                            UserSchema&gt;
                                        </code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>ValidationResult</code>
                                    </td>
                                    <td>
                                        Result of <code>.validate()</code>.
                                        Contains <code>valid</code>,{' '}
                                        <code>errors</code>, and{' '}
                                        <code>object</code>. For object schemas,
                                        also includes{' '}
                                        <code>getErrorsFor()</code> ({' '}
                                        <code>errors</code> is{' '}
                                        <strong>deprecated</strong> on object
                                        schema results).
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>ValidationError</code>
                                    </td>
                                    <td>
                                        Individual error:{' '}
                                        <code>
                                            {
                                                '{ path: string; message: string }'
                                            }
                                        </code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>PropertyDescriptor</code>
                                    </td>
                                    <td>
                                        Runtime metadata for a schema property
                                        (type, constraints, getters/setters).
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>PropertyDescriptorTree</code>
                                    </td>
                                    <td>
                                        Tree of PropertyDescriptors for an
                                        object schema. Used as selectors in
                                        mapper and form libraries.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>MakeOptional</code>
                                    </td>
                                    <td>
                                        Utility type that makes a type optional
                                        (used internally by{' '}
                                        <code>InferType</code>).
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Exports ──────────────────────────────────────── */}
                <div className="card">
                    <h2>Exports</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// Builder functions
export { any, array, boolean, date, func, number, object, string, union }

// Builder classes
export {
  SchemaBuilder, AnySchemaBuilder, ArraySchemaBuilder,
  BooleanSchemaBuilder, DateSchemaBuilder, FunctionSchemaBuilder,
  NumberSchemaBuilder, ObjectSchemaBuilder, StringSchemaBuilder,
  UnionSchemaBuilder
}

// Extension system
export { defineExtension, withExtensions }
export { stringExtensions, numberExtensions, arrayExtensions } // built-in extension descriptors
export type { ExtensionConfig, ExtensionDescriptor }

// Sub-path export: bare builders without built-in extensions
// import { string } from '@cleverbrush/schema/core'

// Types
export type {
  InferType, MakeOptional, ValidationError, ValidationResult,
  PropertyDescriptor, PropertyDescriptorInner, PropertyDescriptorTree,
  PropertySetterOptions, SchemaPropertySelector
}`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}
