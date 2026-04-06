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
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    `npm install @cleverbrush/schema`
                                )
                            }}
                        />
                    </pre>
                    <details className="bundle-size-details">
                        <summary>Bundle size</summary>
                        <div className="bundle-size-body">
                            <p>
                                Measured with esbuild (minified + gzip level 9,
                                single-file bundle, browser target).
                            </p>
                            <div className="table-wrap">
                                <table className="api-table">
                                    <thead>
                                        <tr>
                                            <th>Import</th>
                                            <th>Gzipped</th>
                                            <th>Brotli</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <code>@cleverbrush/schema</code>{' '}
                                                (full)
                                            </td>
                                            <td>14.0 KB</td>
                                            <td>12.4 KB</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <code>
                                                    @cleverbrush/schema/core
                                                </code>{' '}
                                                (no built-in extensions)
                                            </td>
                                            <td>12.6 KB</td>
                                            <td>11.2 KB</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <code>
                                                    @cleverbrush/schema/string
                                                </code>{' '}
                                                (single builder)
                                            </td>
                                            <td>3.8 KB</td>
                                            <td>3.5 KB</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <code>
                                                    @cleverbrush/schema/number
                                                </code>
                                            </td>
                                            <td>3.8 KB</td>
                                            <td>3.5 KB</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <code>
                                                    @cleverbrush/schema/object
                                                </code>
                                            </td>
                                            <td>5.8 KB</td>
                                            <td>5.3 KB</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <code>
                                                    @cleverbrush/schema/array
                                                </code>
                                            </td>
                                            <td>4.0 KB</td>
                                            <td>3.7 KB</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="bundle-size-note">
                                The <code>sideEffects: false</code> flag is set
                                in the package manifest. When your bundler
                                supports tree-shaking, use the sub-path exports
                                above to keep your bundle smaller — each builder
                                carries only its own validation logic plus the
                                shared <code>SchemaBuilder</code> base (~2.7 KB
                                gzip).
                            </p>
                        </div>
                    </details>
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
                            <code>schema.validate(data)</code> — get typed
                            results with per-property errors (or{' '}
                            <code>schema.validateAsync(data)</code> for async
                            validators)
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
                    <a
                        href="/playground/quick-start"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Define a schema, infer its TypeScript type, and validate
                        data — all from a single definition:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number, boolean, type InferType } from '@cleverbrush/schema';

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

// Validate data at runtime — synchronous by default
const result = UserSchema.validate({
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  isActive: true
});

console.log(result.valid);  // true
console.log(result.object); // the validated object

// Or use validateAsync() when you have async validators/preprocessors
// const result = await UserSchema.validateAsync({ ... });

// Invalid data produces structured errors
const bad = UserSchema.validate(
  { name: 'A', email: '', age: -5, isActive: true },
  { doNotStopOnFirstError: true }
);

console.log(bad.valid);  // false
console.log(bad.errors);
// [
//   { message: 'Name must be at least 2 characters' },
//   { message: 'Please enter a valid email address' },
//   { message: 'Age cannot be negative' }
// ]`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Schema Types ─────────────────────────────────── */}
                <div className="card">
                    <h2>Schema Types</h2>
                    <a
                        href="/playground/schema-types"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
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
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>,{' '}
                                        <code>.readonly()</code>,{' '}
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
                                        <code>.uuid()</code>, <code>.ip()</code>
                                        , <code>.trim()</code>,{' '}
                                        <code>.toLowerCase()</code>,{' '}
                                        <code>.nonempty()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>,{' '}
                                        <code>.readonly()</code>
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
                                        <code>.optional()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>,{' '}
                                        <code>.readonly()</code>
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
                                        <code>.optional()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>,{' '}
                                        <code>.readonly()</code>
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
                                        <code>.optional()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>,{' '}
                                        <code>.readonly()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>nul()</code>
                                    </td>
                                    <td>
                                        Exactly <code>null</code>. Useful for
                                        nullable union branches and JSON Schema
                                        interop.
                                    </td>
                                    <td>
                                        <code>.optional()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>,{' '}
                                        <code>.readonly()</code>
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
                                        <code>.validateAsync(data)</code>,{' '}
                                        <code>.addProps({'{...}'})</code>,{' '}
                                        <code>.optional()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>,{' '}
                                        <code>.readonly()</code>
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
                                        <code>.unique()</code>,{' '}
                                        <code>.readonly()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>tuple([...schemas])</code>
                                    </td>
                                    <td>
                                        Fixed-length array with per-position
                                        types. Each index is validated against
                                        its own schema — mirrors TypeScript
                                        tuple types.
                                    </td>
                                    <td>
                                        <code>.rest(schema)</code>,{' '}
                                        <code>.optional()</code>,{' '}
                                        <code>.nullable()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>
                                            record(keySchema, valueSchema)
                                        </code>
                                    </td>
                                    <td>
                                        Object with dynamic string keys —
                                        mirrors TypeScript&apos;s{' '}
                                        <code>Record&lt;K, V&gt;</code>. Every
                                        key must satisfy <code>keySchema</code>{' '}
                                        and every value must satisfy{' '}
                                        <code>valueSchema</code>. Use for lookup
                                        tables, i18n bundles, and any map-like
                                        structure whose keys are unknown at
                                        schema-definition time.
                                    </td>
                                    <td>
                                        <code>.optional()</code>,{' '}
                                        <code>.nullable()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>,{' '}
                                        <code>.addValidator(fn)</code>
                                        validation result:{' '}
                                        <code>.getErrorsFor(key?)</code>
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
                                        <code>.validateAsync(data)</code>,{' '}
                                        <code>.optional()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>,{' '}
                                        <code>.readonly()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>lazy(getter)</code>
                                    </td>
                                    <td>
                                        Recursive / self-referential schema. The
                                        getter is called once and its result is
                                        cached. Essential for tree structures,
                                        comment threads, nested menus, and any
                                        type that references itself.
                                    </td>
                                    <td>
                                        <code>.resolve()</code>,{' '}
                                        <code>.optional()</code>,{' '}
                                        <code>.addValidator(fn)</code>,{' '}
                                        <code>.addPreprocessor(fn)</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Immutability ─────────────────────────────────── */}
                <div className="card">
                    <h2>Immutability</h2>
                    <a
                        href="/playground/immutability"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Every method on a schema builder returns a{' '}
                        <strong>new instance</strong>. The original is never
                        modified. This means you can safely derive new schemas
                        from existing ones without worrying about side effects:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number, type InferType } from '@cleverbrush/schema';

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
                    <a
                        href="/playground/composing-schemas"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Schemas can be extended with additional properties,
                        combined with unions, or nested inside arrays and
                        objects:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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

                {/* ── Discriminated Unions ─────────────────────────── */}
                <div className="card">
                    <h2>Discriminated Unions</h2>
                    <a
                        href="/playground/discriminated-unions"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Some libraries ship a dedicated{' '}
                        <code>.discriminator()</code> API for tagged unions.
                        With <code>@cleverbrush/schema</code> you don&apos;t
                        need one — <code>union()</code> combined with{' '}
                        <strong>string-literal schemas</strong> gives you the
                        same pattern naturally, with full type inference.
                    </p>
                    <p>
                        The trick is simple: use{' '}
                        <code>string(&apos;literal&apos;)</code> for the
                        discriminator field. Each branch of the union gets its
                        own object schema whose discriminator can only match one
                        exact value. TypeScript narrows the inferred type
                        automatically.
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number, union, type InferType } from '@cleverbrush/schema';

// Each variant has a literal "type" field acting as the discriminator
const Circle = object({
  type:   string('circle'),
  radius: number().min(0)
});

const Rectangle = object({
  type:   string('rectangle'),
  width:  number().min(0),
  height: number().min(0)
});

const Triangle = object({
  type:   string('triangle'),
  base:   number().min(0),
  height: number().min(0)
});

// Combine with union() — no special .discriminator() call needed
const ShapeSchema = union(Circle).or(Rectangle).or(Triangle);

type Shape = InferType<typeof ShapeSchema>;
// Shape is automatically:
//   | { type: 'circle';    radius: number }
//   | { type: 'rectangle'; width: number; height: number }
//   | { type: 'triangle';  base: number;  height: number }

// Validation picks the matching branch by the literal field
const result = ShapeSchema.validate({ type: 'circle', radius: 5 });`)
                            }}
                        />
                    </pre>

                    <h3>Real-World Example: Job Scheduler</h3>
                    <p>
                        The <code>@cleverbrush/scheduler</code> library uses
                        this exact pattern to validate job schedules. The{' '}
                        <code>every</code> field acts as the discriminator, and
                        each variant adds its own set of allowed properties:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number, array, union, type InferType } from '@cleverbrush/schema';

// Shared base with common schedule fields
const ScheduleBase = object({
  interval: number().min(1).max(356),
  hour:     number().min(0).max(23).optional(),
  minute:   number().min(0).max(59).optional(),
  startsOn: date().acceptJsonString().optional(),
  endsOn:   date().acceptJsonString().optional()
});

// Minute schedule — omit hour/minute (they don't apply)
const EveryMinute = ScheduleBase
  .omit('hour').omit('minute')
  .addProps({ every: string('minute') });

// Day schedule
const EveryDay = ScheduleBase
  .addProps({ every: string('day') });

// Week schedule — adds dayOfWeek array
const EveryWeek = ScheduleBase.addProps({
  every:     string('week'),
  dayOfWeek: array().of(number().min(1).max(7)).minLength(1).maxLength(7)
});

// Month schedule — adds day (number or 'last')
const EveryMonth = ScheduleBase.addProps({
  every: string('month'),
  day:   union(string('last')).or(number().min(1).max(28))
});

// Combine all variants in a single union
const ScheduleSchema = union(EveryMinute)
  .or(EveryDay)
  .or(EveryWeek)
  .or(EveryMonth);

type Schedule = InferType<typeof ScheduleSchema>;
// TypeScript infers a proper discriminated union on "every"`)
                            }}
                        />
                    </pre>
                    <p>
                        Because each branch uses a string literal (
                        <code>string(&apos;minute&apos;)</code>,{' '}
                        <code>string(&apos;day&apos;)</code>, etc.) for the{' '}
                        <code>every</code> field, TypeScript can narrow the full
                        union based on that single property — exactly like
                        zod&apos;s <code>z.discriminatedUnion()</code>, but
                        without any extra API surface.
                    </p>
                </div>

                {/* ── Recursive Schemas ────────────────────────────── */}
                <div className="card">
                    <h2>Recursive Schemas</h2>
                    <a
                        href="/playground/recursive-schemas"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Use <code>lazy(() =&gt; schema)</code> to define
                        recursive or self-referential schemas — tree structures,
                        comment threads, nested menus, org charts, and any other
                        type that refers to itself.
                    </p>
                    <p>
                        The getter function is called <strong>once</strong> on
                        first validation and its result is cached. Every
                        subsequent call reuses the cache.
                    </p>
                    <blockquote>
                        <strong>TypeScript note:</strong> TypeScript cannot
                        infer recursive types automatically. You must provide an
                        explicit type annotation on the variable holding the
                        schema.
                    </blockquote>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import {
    object, string, number, array, lazy,
    type SchemaBuilder
} from '@cleverbrush/schema';

// ── Tree structure ────────────────────────────────────────
type TreeNode = { value: number; children: TreeNode[] };

// Explicit annotation required — TypeScript can't infer recursive types
const treeNode: SchemaBuilder<TreeNode, true> = object({
    value: number(),
    children: array(lazy(() => treeNode))
});

treeNode.validate({
    value: 1,
    children: [
        { value: 2, children: [] },
        { value: 3, children: [{ value: 4, children: [] }] }
    ]
});
// { valid: true, object: { value: 1, children: [...] } }

// ── Comment thread ────────────────────────────────────────
type Comment = { text: string; replies: Comment[] };

const commentSchema: SchemaBuilder<Comment, true> = object({
    text: string(),
    replies: array(lazy(() => commentSchema))
});

// ── Navigation menu with optional sub-levels ─────────────
type MenuItem = { label: string; submenu?: MenuItem[] };

const menuItem: SchemaBuilder<MenuItem, true> = object({
    label: string(),
    submenu: array(lazy(() => menuItem)).optional()
});`)
                            }}
                        />
                    </pre>
                    <p>
                        <code>lazy()</code> is fully compatible with{' '}
                        <code>.optional()</code>,{' '}
                        <code>.addPreprocessor()</code>,{' '}
                        <code>.addValidator()</code>, and all other fluent
                        methods. Call <code>.resolve()</code> to access the
                        underlying resolved schema directly.
                    </p>
                </div>

                {/* ── Validation ───────────────────────────────────── */}
                <div className="card">
                    <h2>Validation</h2>
                    <a
                        href="/playground/validation-errors"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>

                    <h3>Basic Validation</h3>
                    <p>
                        Every schema has two validation methods:{' '}
                        <code>.validate(data)</code> (synchronous) and{' '}
                        <code>.validateAsync(data)</code> (asynchronous). Use{' '}
                        <code>.validate()</code> by default — it returns a
                        result with <code>valid</code>, <code>errors</code>, and
                        the cleaned <code>object</code>. Switch to{' '}
                        <code>.validateAsync()</code> only when your schema
                        includes async validators or preprocessors. For object
                        schemas, the result also includes a{' '}
                        <code>getErrorsFor()</code> method for per-property
                        error inspection — the flat <code>errors</code> array is{' '}
                        <strong>deprecated</strong> on object schema results and
                        will be removed in a future major version.
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const result = UserSchema.validate({
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
  // errors is deprecated on object schemas — Array of { message: string }
}

// Use validateAsync() when your schema has async validators/preprocessors
// const asyncResult = await UserSchema.validateAsync({ ... });`)
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
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const result = UserSchema.validate(
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
                    <a
                        href="/playground/custom-error-messages"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Every constraint method accepts an optional second
                        argument for a custom error message. This lets you
                        provide user-friendly messages instead of the default
                        generic ones:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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
                    <a
                        href="/playground/custom-validators"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Add custom synchronous or asynchronous validators to any
                        schema. They receive the value and must return an object
                        with <code>valid</code> (boolean) and optionally{' '}
                        <code>errors</code> (array of{' '}
                        <code>{'{ message: string }'}</code>):
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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

// Use validateAsync() because the validator is async
const result = await EmailSchema.validateAsync('taken@example.com');
console.log(result.valid);  // false
console.log(result.errors); // [{ message: 'This email is already registered' }]`)
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
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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

                {/* ── Default Values ──────────────────────────────── */}
                <div className="card">
                    <h2>Default Values</h2>
                    <a
                        href="/playground/default-values"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Every schema builder supports{' '}
                        <code>.default(value)</code>. When the input is{' '}
                        <code>undefined</code>, the default value is used
                        instead — and the result is still validated against the
                        schema&apos;s constraints.
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { string, number, array, date, object, type InferType } from '@cleverbrush/schema';

// Static default
const Name = string().default('Anonymous');
Name.validate(undefined); // { valid: true, object: 'Anonymous' }
Name.validate('Alice');   // { valid: true, object: 'Alice' }

// Factory function — useful for mutable defaults like arrays or dates
const Tags = array(string()).default(() => []);

// Works with .optional() — .default() removes undefined from the inferred type
const Port = number().optional().default(3000);
type Port = InferType<typeof Port>; // number`)
                            }}
                        />
                    </pre>
                    <p>
                        Use a factory function for mutable values (arrays,
                        objects, dates) to avoid shared references:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const Config = object({
  host: string().default('localhost'),
  port: number().default(8080),
  tags: array(string()).default(() => []),
  createdAt: date().default(() => new Date())
});

type Config = InferType<typeof Config>;
// { host: string; port: number; tags: string[]; createdAt: Date }
// All fields are non-optional — defaults fill in missing values`)
                            }}
                        />
                    </pre>
                    <p>
                        Default values are exposed via{' '}
                        <code>.introspect()</code>, making them available for
                        form generation, serialization, and other tooling:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const schema = string().default('hello');
const info = schema.introspect();
console.log(info.hasDefault);    // true
console.log(info.defaultValue);  // 'hello'`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Catch / Fallback ────────────────────────────── */}
                <div className="card">
                    <h2>Catch / Fallback</h2>
                    <a
                        href="/playground/catch-static"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Every schema builder supports <code>.catch(value)</code>
                        . When validation <strong>fails for any reason</strong>{' '}
                        — wrong type, constraint violation, missing required
                        value — the fallback is returned as a successful result
                        instead of errors.
                    </p>
                    <p>
                        Unlike <code>.default()</code>, which only fires when
                        the input is <code>undefined</code>,{' '}
                        <code>.catch()</code> fires on <strong>any</strong>{' '}
                        validation failure. When <code>.catch()</code> is set,{' '}
                        <code>.parse()</code> and <code>.parseAsync()</code>{' '}
                        will <strong>never throw</strong>.
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { string, number, array } from '@cleverbrush/schema';

// Static fallback
const Name = string().catch('unknown');
Name.validate(42);        // { valid: true, object: 'unknown' }
Name.validate(null);      // { valid: true, object: 'unknown' }
Name.validate('Alice');   // { valid: true, object: 'Alice' }

// Constraint violation also triggers catch
const Age = number().min(0).catch(-1);
Age.validate(-5);         // { valid: true, object: -1 }

// .parse() never throws when .catch() is set
Name.parse(42);           // 'unknown'
`)
                            }}
                        />
                    </pre>
                    <p>
                        Use a factory function for mutable fallback values to
                        avoid shared references between calls:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const Tags = array(string()).catch(() => []);

const r1 = Tags.validate(null);  // { valid: true, object: [] }
const r2 = Tags.validate(null);  // { valid: true, object: [] }
// r1.object !== r2.object  — a fresh [] each time

// Introspect the fallback state
const schema = string().catch('unknown');
const info = schema.introspect();
console.log(info.hasCatch);    // true
console.log(info.catchValue);  // 'unknown'`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Readonly Modifier ───────────────────────────── */}
                <div className="card">
                    <h2>Readonly Modifier</h2>
                    <a
                        href="/playground/readonly-modifier"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Every schema builder supports <code>.readonly()</code>.
                        This is a <strong>type-level-only</strong> modifier — it
                        marks the inferred TypeScript type as immutable, but
                        does not alter validation behaviour or freeze the
                        validated value at runtime.
                    </p>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Builder</th>
                                    <th>
                                        Effect on{' '}
                                        <code>InferType&lt;T&gt;</code>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>object(…).readonly()</code>
                                    </td>
                                    <td>
                                        <code>{'Readonly<{ … }>'}</code> — all
                                        top-level properties become{' '}
                                        <code>readonly</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>array(…).readonly()</code>
                                    </td>
                                    <td>
                                        <code>{'ReadonlyArray<T>'}</code> — no{' '}
                                        <code>push</code>, <code>pop</code>,
                                        etc. at the type level
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>date().readonly()</code>
                                    </td>
                                    <td>
                                        <code>{'Readonly<Date>'}</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Primitives</td>
                                    <td>
                                        Identity — <code>string</code>,{' '}
                                        <code>number</code>,{' '}
                                        <code>boolean</code> are already
                                        immutable
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, array, string, number, type InferType } from '@cleverbrush/schema';

// Readonly object — all properties become readonly at type level
const UserSchema = object({ name: string(), age: number() }).readonly();
type User = InferType<typeof UserSchema>;
// Readonly<{ name: string; age: number }>

// Readonly array — disables push, pop, etc.
const TagsSchema = array(string()).readonly();
type Tags = InferType<typeof TagsSchema>;
// ReadonlyArray<string>

// Chains naturally with .optional() and .default()
const Schema = object({ id: number() }).readonly().optional();
type T = InferType<typeof Schema>;
// Readonly<{ id: number }> | undefined

// isReadonly flag is exposed via .introspect()
const schema = object({ name: string() }).readonly();
console.log(schema.introspect().isReadonly); // true`)
                            }}
                        />
                    </pre>
                    <p>
                        <strong>Note:</strong> <code>.readonly()</code> is{' '}
                        <strong>shallow</strong> — only top-level object
                        properties or the array itself are marked readonly. For
                        deeply nested immutability, apply{' '}
                        <code>.readonly()</code> at each level.
                    </p>
                </div>

                {/* ── Describe ────────────────────────────────────── */}
                <div className="card">
                    <h2>Describe</h2>
                    <a
                        href="/playground/describe-metadata"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        Every schema builder supports{' '}
                        <code>.describe(text)</code>. This attaches a
                        human-readable description to the schema as{' '}
                        <strong>metadata only</strong> — it has no effect on
                        validation, but it is accessible via{' '}
                        <code>.introspect().description</code> and is
                        automatically emitted as the <code>description</code>{' '}
                        field by <code>toJsonSchema()</code> (including nested
                        properties).
                    </p>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Method</th>
                                    <th>Signature</th>
                                    <th>Returns</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>.describe(text)</code>
                                    </td>
                                    <td>
                                        <code>
                                            {'describe(text: string): this'}
                                        </code>
                                    </td>
                                    <td>
                                        New builder instance with{' '}
                                        <code>description</code> set; original
                                        is unchanged
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.introspect().description</code>
                                    </td>
                                    <td>
                                        <code>{'string | undefined'}</code>
                                    </td>
                                    <td>
                                        The text passed to{' '}
                                        <code>.describe()</code>, or{' '}
                                        <code>undefined</code> if not set
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';
import { toJsonSchema } from '@cleverbrush/schema-json';

const ProductSchema = object({
    id:    string().uuid().describe('Unique product identifier'),
    name:  string().nonempty().describe('Display name shown to customers'),
    price: number().positive().describe('Price in USD')
}).describe('A product in the catalogue');

// Read description back at runtime
console.log(ProductSchema.introspect().description);
// 'A product in the catalogue'

// toJsonSchema emits description fields automatically
const schema = toJsonSchema(ProductSchema, { $schema: false });
// {
//   type: 'object',
//   description: 'A product in the catalogue',
//   properties: {
//     id:    { type: 'string', format: 'uuid', description: 'Unique product identifier' },
//     name:  { type: 'string', minLength: 1,   description: 'Display name shown to customers' },
//     price: { type: 'number', exclusiveMinimum: 0, description: 'Price in USD' }
//   }
// }

// Chains naturally with all other modifiers — order does not matter
const field = string().optional().describe('Optional note').minLength(1);`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Extensions ──────────────────────────────────── */}
                <div className="card">
                    <h2>Extensions</h2>
                    <a
                        href="/playground/custom-extensions"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
                    <p>
                        The extension system lets you add{' '}
                        <strong>custom methods</strong> to any schema builder
                        type without modifying the core library. Define an
                        extension once, apply it with{' '}
                        <code>withExtensions()</code>, and every builder
                        produced by the returned factories includes your new
                        methods — fully typed and chainable.
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
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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
                        functions. All original builder methods remain
                        available:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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
                        currency formatting, URL slugs, phone numbers, and more.
                        A well-typed extension is just a{' '}
                        <code>defineExtension()</code> call away.
                    </p>
                </div>

                {/* ── Built-in Extensions ─────────────────────────────── */}
                <div className="card">
                    <h2>Built-in Extensions</h2>
                    <a
                        href="/playground/builtin-extensions"
                        className="playground-link"
                    >
                        ▶ Open in Playground
                    </a>
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
                                    <td>
                                        <code>.email(errorMessage?)</code>
                                    </td>
                                    <td>Validates email format</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.url(opts?, errorMessage?)</code>
                                    </td>
                                    <td>
                                        Validates URL format.{' '}
                                        <code>opts.protocols</code> narrows
                                        allowed schemes
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.uuid(errorMessage?)</code>
                                    </td>
                                    <td>
                                        Validates UUID (versions 1–5) format
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.ip(opts?, errorMessage?)</code>
                                    </td>
                                    <td>
                                        Validates IPv4 or IPv6.{' '}
                                        <code>opts.version</code> narrows to{' '}
                                        <code>&apos;v4&apos;</code> or{' '}
                                        <code>&apos;v6&apos;</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.trim()</code>
                                    </td>
                                    <td>
                                        Preprocessor — trims whitespace before
                                        validation
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.toLowerCase()</code>
                                    </td>
                                    <td>
                                        Preprocessor — lowercases value before
                                        validation
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.nonempty(errorMessage?)</code>
                                    </td>
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
                                    <td>
                                        <code>.positive(errorMessage?)</code>
                                    </td>
                                    <td>Value must be &gt; 0</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.negative(errorMessage?)</code>
                                    </td>
                                    <td>Value must be &lt; 0</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>.finite(errorMessage?)</code>
                                    </td>
                                    <td>Value must be finite</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>
                                            .multipleOf(n, errorMessage?)
                                        </code>
                                    </td>
                                    <td>
                                        Value must be an exact multiple of{' '}
                                        <code>n</code> (float-safe)
                                    </td>
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
                                    <td>
                                        <code>.nonempty(errorMessage?)</code>
                                    </td>
                                    <td>
                                        Array must have at least one element
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>
                                            .unique(keyFn?, errorMessage?)
                                        </code>
                                    </td>
                                    <td>
                                        All elements must be unique. Optional{' '}
                                        <code>keyFn</code> extracts comparison
                                        key
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <p>
                        All validator extensions accept an optional error
                        message as the last parameter — either a string or a
                        function (matching the same{' '}
                        <code>ValidationErrorMessageProvider</code> pattern used
                        by built-in constraints like <code>.minLength()</code>):
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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

                    <h3>
                        The <code>/core</code> Sub-path
                    </h3>
                    <p>
                        If you need bare builders <strong>without</strong> the
                        built-in extensions (e.g. to apply only your own custom
                        extensions), import from the <code>/core</code>{' '}
                        sub-path:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
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

                {/* ── Standard Schema ──────────────────────────────── */}
                <div className="card">
                    <h2>Standard Schema Support</h2>
                    <p>
                        <code>@cleverbrush/schema</code> implements the{' '}
                        <a
                            href="https://standardschema.dev/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Standard Schema v1
                        </a>{' '}
                        specification. This means every schema you build is
                        immediately usable in{' '}
                        <strong>50+ libraries and frameworks</strong> without
                        any adapter or wrapper — including tRPC, TanStack Form,
                        React Hook Form, T3 Env, Hono, Elysia, and
                        next-safe-action.
                    </p>

                    <h3>
                        The <code>~standard</code> property
                    </h3>
                    <p>
                        All 13 builders expose a{' '}
                        <code>[&apos;~standard&apos;]</code> getter on the base{' '}
                        <code>SchemaBuilder</code> class. The property returns a
                        cached object with three fields:
                    </p>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Field</th>
                                    <th>Value</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>version</code>
                                    </td>
                                    <td>
                                        <code>1</code>
                                    </td>
                                    <td>Standard Schema spec version</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>vendor</code>
                                    </td>
                                    <td>
                                        <code>
                                            &apos;@cleverbrush/schema&apos;
                                        </code>
                                    </td>
                                    <td>Library identifier</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>validate(value)</code>
                                    </td>
                                    <td>sync function</td>
                                    <td>
                                        Wraps <code>.validate()</code> and
                                        returns <code>{'{ value }'}</code> on
                                        success or{' '}
                                        <code>
                                            {'{ issues: [{ message }] }'}
                                        </code>{' '}
                                        on failure
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>Usage</h3>
                    <p>
                        You can access <code>[&apos;~standard&apos;]</code>{' '}
                        directly, but in practice you never need to — just pass
                        a <code>@cleverbrush/schema</code> builder directly
                        wherever a Standard Schema validator is expected:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
  name:  string().minLength(2),
  email: string().email(),
  age:   number().min(18).optional(),
});

// Direct access — useful for testing or custom integrations
const std = UserSchema['~standard'];
console.log(std.version); // 1
console.log(std.vendor);  // '@cleverbrush/schema'

const ok   = std.validate({ name: 'Alice', email: 'alice@example.com' });
// { value: { name: 'Alice', email: 'alice@example.com', age: undefined } }

const fail = std.validate({ name: 'A', email: 'not-an-email' });
// { issues: [{ message: 'minLength' }, { message: 'email' }] }`)
                            }}
                        />
                    </pre>

                    <h3>TanStack Form</h3>
                    <p>
                        Pass any <code>@cleverbrush/schema</code> builder
                        directly as a TanStack Form field validator — no adapter
                        needed:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { useForm } from '@tanstack/react-form';
import { standardSchemaValidator } from '@tanstack/react-form/standard-schema';
import { string } from '@cleverbrush/schema';

const emailSchema = string().email('Please enter a valid email');

const form = useForm({
  validatorAdapter: standardSchemaValidator(),
  defaultValues: { email: '' },
});

// In JSX:
// <form.Field
//   name="email"
//   validators={{ onChange: emailSchema, onBlur: emailSchema }}
// />`)
                            }}
                        />
                    </pre>

                    <h3>T3 Env</h3>
                    <p>
                        Use <code>@cleverbrush/schema</code> builders as T3 Env
                        server and client environment validators:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { createEnv } from '@t3-oss/env-nextjs';
import { string, number } from '@cleverbrush/schema';

export const env = createEnv({
  server: {
    DATABASE_URL: string().url(),
    PORT: number().min(1).max(65535).optional(),
  },
  client: {
    NEXT_PUBLIC_API_URL: string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
});`)
                            }}
                        />
                    </pre>

                    <h3>
                        External Schema Interop — <code>extern()</code>
                    </h3>
                    <p>
                        Standard Schema is bidirectional.{' '}
                        <code>@cleverbrush/schema</code> exposes its schemas{' '}
                        <em>to</em> other tools via{' '}
                        <code>[&apos;~standard&apos;]</code>, and it can{' '}
                        <em>consume</em> schemas from other libraries via{' '}
                        <code>extern()</code>. Wrap any Standard Schema v1
                        compatible schema (Zod, Valibot, ArkType, …) into a
                        native builder — no rewriting needed:
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { z } from 'zod';
import { object, number, extern, type InferType } from '@cleverbrush/schema';

// Keep your existing Zod schema as-is
const ZodAddress = z.object({
  street: z.string().min(1),
  city:   z.string(),
  zip:    z.string().length(5),
});

// Compose with @cleverbrush/schema
const OrderSchema = object({
  address:    extern(ZodAddress),
  totalCents: number().min(1),
});

// Type is inferred from both libraries automatically
type Order = InferType<typeof OrderSchema>;
// { address: { street: string; city: string; zip: string }; totalCents: number }

const result = OrderSchema.validate({
  address: { street: '5th Ave', city: 'NYC', zip: '10001' },
  totalCents: 4999,
});

if (!result.valid) {
  // Navigate into the extern property — no type annotation needed
  const zipErrors = result.getErrorsFor(t => t.address.zip);
  console.log(zipErrors.errors);
}`)
                            }}
                        />
                    </pre>
                    <p>
                        <code>extern()</code> takes a single parameter — the
                        external schema. Types and property descriptors are
                        derived automatically. Validation is delegated to the
                        external library&apos;s{' '}
                        <code>[&apos;~standard&apos;].validate()</code> method,
                        so <code>@cleverbrush/schema</code> never re-implements
                        another library&apos;s validation logic.
                    </p>

                    <h3>Compatible tools</h3>
                    <p>
                        Any library that consumes Standard Schema v1 validators
                        works with <code>@cleverbrush/schema</code>
                        automatically:
                    </p>
                    <div className="table-wrap">
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Library</th>
                                    <th>Category</th>
                                    <th>Integration</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>TanStack Form</td>
                                    <td>Forms</td>
                                    <td>
                                        <a href="/showcases/tanstack-form">
                                            Live showcase →
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td>T3 Env</td>
                                    <td>Env validation</td>
                                    <td>
                                        <a href="/showcases/t3-env">
                                            Live showcase →
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td>tRPC</td>
                                    <td>API / RPC</td>
                                    <td>
                                        Pass schema as procedure{' '}
                                        <code>.input()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>React Hook Form</td>
                                    <td>Forms</td>
                                    <td>
                                        <code>
                                            standardSchemaResolver(schema)
                                        </code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Hono</td>
                                    <td>HTTP framework</td>
                                    <td>Validator middleware</td>
                                </tr>
                                <tr>
                                    <td>Elysia</td>
                                    <td>HTTP framework</td>
                                    <td>Route body / query validation</td>
                                </tr>
                                <tr>
                                    <td>next-safe-action</td>
                                    <td>Server actions</td>
                                    <td>Action input validation</td>
                                </tr>
                                <tr>
                                    <td>TanStack Router</td>
                                    <td>Routing</td>
                                    <td>Search param validation</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p>
                        See the full list of Standard Schema adopters at{' '}
                        <a
                            href="https://standardschema.dev/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            standardschema.dev
                        </a>
                        .
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
                                    <td>Sync + async validation</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                </tr>
                                <tr>
                                    <td>Standard Schema v1</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Extension / plugin system</td>
                                    <td className="check">✓</td>
                                    <td className="partial">~</td>
                                    <td className="cross">✗</td>
                                    <td className="partial">~</td>
                                </tr>
                                <tr>
                                    <td>
                                        External schema interop (
                                        <code>extern()</code>)
                                    </td>
                                    <td className="check">✓</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                    <td className="cross">✗</td>
                                </tr>
                                <tr>
                                    <td>Built-in validators (email…)</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                    <td className="check">✓</td>
                                </tr>
                                <tr>
                                    <td>Default values</td>
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
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>,{' '}
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
                                        <code>.uuid()</code>, <code>.ip()</code>
                                        , <code>.trim()</code>,{' '}
                                        <code>.toLowerCase()</code>,{' '}
                                        <code>.nonempty()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
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
                                        <code>.multipleOf(n)</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>boolean()</code>
                                    </td>
                                    <td>Boolean schema builder</td>
                                    <td>
                                        <code>.optional()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>date()</code>
                                    </td>
                                    <td>Date schema builder</td>
                                    <td>
                                        <code>.optional()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>func()</code>
                                    </td>
                                    <td>Function schema builder</td>
                                    <td>
                                        <code>.optional()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>object({'{...}'})</code>
                                    </td>
                                    <td>Object schema with named properties</td>
                                    <td>
                                        <code>.validate(data)</code>,{' '}
                                        <code>.validateAsync(data)</code>,{' '}
                                        <code>.addProps({'{...}'})</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
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
                                        <code>.unique()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>union(...schemas)</code>
                                    </td>
                                    <td>Union of schemas</td>
                                    <td>
                                        <code>.validate(data)</code>,{' '}
                                        <code>.validateAsync(data)</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>lazy(getter)</code>
                                    </td>
                                    <td>
                                        Recursive / self-referential schema
                                        builder
                                    </td>
                                    <td>
                                        <code>.resolve()</code>,{' '}
                                        <code>.optional()</code>,{' '}
                                        <code>.addValidator(fn)</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>extern(standardSchema)</code>
                                    </td>
                                    <td>
                                        Wraps an external Standard Schema v1
                                        schema (Zod, Valibot, ArkType, …) into a
                                        native builder
                                    </td>
                                    <td>
                                        <code>.validate(data)</code>,{' '}
                                        <code>.optional()</code>,{' '}
                                        <code>.nullable()</code>,{' '}
                                        <code>.default(value)</code>,{' '}
                                        <code>.catch(value)</code>
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
                                        or more <code>ExtensionDescriptor</code>
                                        s.
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
                                        <code>{'{ message: string }'}</code>
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
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`// Builder functions
export { any, lazy, array, boolean, date, func, number, object, string, union }

// Builder classes
export {
  SchemaBuilder, AnySchemaBuilder, ArraySchemaBuilder,
  BooleanSchemaBuilder, DateSchemaBuilder, FunctionSchemaBuilder,
  LazySchemaBuilder, NumberSchemaBuilder, ObjectSchemaBuilder,
  StringSchemaBuilder, UnionSchemaBuilder
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
}

// Standard Schema
// Re-exported from @standard-schema/spec — use for typing custom integrations
export type { StandardSchemaV1 } from '@standard-schema/spec'`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}
