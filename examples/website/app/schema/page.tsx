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
                        <code>User</code> type in one file, then write Joi /
                        Yup / Zod schemas (or manual <code>if</code> checks) in
                        another. Over time these drift apart — the type says a
                        field is required, but the validation allows it to be{' '}
                        <code>undefined</code>. Tests pass, but production data
                        breaks because the validation didn&apos;t match the type.
                    </p>

                    <h3>The Solution</h3>
                    <p>
                        <code>@cleverbrush/schema</code> lets you define a
                        schema <strong>once</strong> and derive both the
                        TypeScript type (via <code>InferType</code>) and runtime
                        validation from the same source. Because every method
                        returns a <strong>new builder instance</strong>
                        (immutability), you can safely compose and extend schemas
                        without accidentally mutating shared definitions.
                    </p>

                    <h3>The Unique Feature: PropertyDescriptors</h3>
                    <p>
                        Unlike other schema libraries,{' '}
                        <code>@cleverbrush/schema</code> exposes a{' '}
                        <strong>runtime descriptor tree</strong> that other tools
                        can introspect. The <code>@cleverbrush/mapper</code>{' '}
                        uses it for type-safe property selectors. The{' '}
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
  name:     string().minLength(2, 'Name must be at least 2 characters').maxLength(100, 'Name cannot exceed 100 characters'),
  email:    string().minLength(5, 'Please enter a valid email address'),
  age:      number().min(0, 'Age cannot be negative').max(150, 'Age seems unrealistic'),
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
                                        <code>.optional()</code>
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
                                        <code>.optional()</code>
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
                                        Date values. Validates that the input
                                        is a valid Date instance.
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
                                        <code>
                                            object({'{...}'})
                                        </code>
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
                                        <code>.optional()</code>
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
                        type. This means your IDE tooltips, hover
                        documentation, and autocomplete descriptions all carry
                        through from the schema definition — no need to
                        maintain separate documentation:
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
                        but also the canonical source of documentation for
                        every property. Other libraries like Zod, Yup, and Joi
                        do not carry JSDoc comments through to their inferred
                        types.
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
                        <code>errors</code>, and the cleaned{' '}
                        <code>object</code>:
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
  console.log('Errors:', result.errors);
  // errors is an array of { path: string; message: string }
}`)
                            }}
                        />
                    </pre>

                    <h3>Per-Property Errors</h3>
                    <p>
                        Use <code>getErrorsFor()</code> with a
                        PropertyDescriptor selector to get errors for a specific
                        field — perfect for showing inline form errors. It
                        returns an object with <code>isValid</code> (boolean),{' '}
                        <code>errors</code> (array of error strings), and{' '}
                        <code>seenValue</code> (the value that was validated).
                    </p>
                    <p>
                        Pass <code>{'{ doNotStopOnFirstError: true }'}</code>{' '}
                        to <code>.validate()</code> to collect <strong>all</strong>{' '}
                        errors at once, instead of stopping at the first failure:
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
                        Add custom synchronous or asynchronous validators to
                        any schema. They receive the value and must return an
                        object with <code>valid</code> (boolean) and
                        optionally <code>errors</code> (array of{' '}
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
                            <strong>parent</strong> — navigate up the
                            descriptor tree
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
                                    <td>
                                        JSDoc comments preservation
                                    </td>
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
                                        <code>.optional()</code>
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
                                        <code>.optional()</code>
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
                                        <code>
                                            object({'{...}'})
                                        </code>
                                    </td>
                                    <td>
                                        Object schema with named properties
                                    </td>
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
                                        <code>.optional()</code>
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
                                        <code>
                                            InferType&lt;T&gt;
                                        </code>
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
                                        <code>errors</code>,{' '}
                                        <code>object</code>, and{' '}
                                        <code>getErrorsFor()</code>.
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>ValidationError</code>
                                    </td>
                                    <td>
                                        Individual error:{' '}
                                        <code>
                                            {'{ path: string; message: string }'}
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
                                        Utility type that makes a type
                                        optional (used internally by{' '}
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
