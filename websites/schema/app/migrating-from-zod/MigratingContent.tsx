import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function MigratingContent() {
    return (
        <>
            <div className="section-header">
                <h1>Migrating from Zod</h1>
                <p className="subtitle">
                    A side-by-side API reference for every Zod feature and its{' '}
                    <code>@cleverbrush/schema</code> equivalent. Most primitives
                    are drop-in replacements.
                </p>
            </div>

            {/* ── Why switch? ───────────────────────────────── */}
            <div className="why-box">
                <h2>Why switch from Zod?</h2>
                <p>
                    Zod is excellent — that&apos;s why we modelled our API after
                    it. If Zod works for you, keep using it.{' '}
                    <code>@cleverbrush/schema</code> offers three things Zod
                    cannot:
                </p>
                <div
                    className="schema-features-grid"
                    style={{ marginTop: '1rem' }}
                >
                    <div className="schema-feature">
                        <span className="schema-feature-icon">🎯</span>
                        <strong>Typed field-error selectors</strong>
                        <p>
                            Call{' '}
                            <code>
                                result.getErrorsFor(u =&gt; u.fieldName)
                            </code>{' '}
                            instead of filtering an errors array by string path.
                            TypeScript catches typos at compile time —
                            Zod&apos;s{' '}
                            <code>
                                issues.filter(i =&gt; i.path[0] ===
                                &apos;fieldName&apos;)
                            </code>{' '}
                            does not.
                        </p>
                    </div>
                    <div className="schema-feature">
                        <span className="schema-feature-icon">🔍</span>
                        <strong>Runtime schema introspection</strong>
                        <p>
                            <code>.introspect()</code> returns the full
                            descriptor tree at runtime — field names,
                            validators, optionality, metadata. Zod schemas are
                            opaque to code. This is what powers{' '}
                            <a href="/mapper">@cleverbrush/mapper</a> and{' '}
                            <a
                                href="https://www.npmjs.com/package/@cleverbrush/react-form"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                @cleverbrush/react-form
                            </a>
                            .
                        </p>
                    </div>
                    <div className="schema-feature">
                        <span className="schema-feature-icon">🧩</span>
                        <strong>Type-safe extension system</strong>
                        <p>
                            Add real builder methods (with TypeScript type
                            support) using <code>defineExtension()</code> +{' '}
                            <code>withExtensions()</code>. Zod only exposes{' '}
                            <code>.refine()</code> for custom logic — you cannot
                            add new methods to the builder chain.
                        </p>
                    </div>
                </div>
                <p style={{ marginTop: '0.75rem' }}>
                    Also: roughly ~2× faster in array-validation benchmarks,
                    tree-shakeable to ~4 KB per builder, Standard Schema v1
                    compatible, and you can wrap existing Zod schemas with{' '}
                    <code>extern()</code> during incremental migration.
                </p>
            </div>
            <div className="card">
                <h2>Quick Reference</h2>
                <p>
                    Most Zod concepts map 1-to-1. The table below covers the
                    full API surface — scroll to any section for runnable code
                    examples.
                </p>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Zod</th>
                                <th>@cleverbrush/schema</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>z.string()</code>
                                </td>
                                <td>
                                    <code>string()</code>
                                </td>
                                <td>Drop-in replacement</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.number()</code>
                                </td>
                                <td>
                                    <code>number()</code>
                                </td>
                                <td>Drop-in replacement</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.boolean()</code>
                                </td>
                                <td>
                                    <code>boolean()</code>
                                </td>
                                <td>Drop-in replacement</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.date()</code>
                                </td>
                                <td>
                                    <code>date()</code>
                                </td>
                                <td>Drop-in replacement</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.any()</code>
                                </td>
                                <td>
                                    <code>any()</code>
                                </td>
                                <td>Drop-in replacement</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.object({'{{}'})</code>
                                </td>
                                <td>
                                    <code>object({'{{}'})</code>
                                </td>
                                <td>Same shape syntax</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.extend({'{{}'})</code>
                                </td>
                                <td>
                                    <code>.addProps({'{{}'})</code>
                                </td>
                                <td>
                                    Also accepts another{' '}
                                    <code>ObjectSchemaBuilder</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.merge(other)</code>
                                </td>
                                <td>
                                    <code>.intersect(other)</code>
                                </td>
                                <td>Combines two object schemas</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.pick({'{{}'})</code>
                                </td>
                                <td>
                                    <code>.pick([...])</code>
                                </td>
                                <td>Accepts key array or another schema</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.omit({'{{}'})</code>
                                </td>
                                <td>
                                    <code>.omit([...])</code>
                                </td>
                                <td>Accepts key array or another schema</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.partial()</code>
                                </td>
                                <td>
                                    <code>.partial()</code>
                                </td>
                                <td>
                                    Also supports per-field{' '}
                                    <code>.partial('field')</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.array(s)</code>
                                </td>
                                <td>
                                    <code>array(s)</code>
                                </td>
                                <td>Drop-in replacement</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.min(n)</code> on array
                                </td>
                                <td>
                                    <code>.minLength(n)</code>
                                </td>
                                <td>Renamed for clarity</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.max(n)</code> on array
                                </td>
                                <td>
                                    <code>.maxLength(n)</code>
                                </td>
                                <td>Renamed for clarity</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.union([...])</code>
                                </td>
                                <td>
                                    <code>union(s1).or(s2).or(s3)</code>
                                </td>
                                <td>Chainable</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.discriminatedUnion()</code>
                                </td>
                                <td>
                                    <code>union().or()</code> pattern
                                </td>
                                <td>
                                    Full type inference; see Discriminated
                                    Unions section
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>
                                        z.enum([&apos;a&apos;, &apos;b&apos;])
                                    </code>
                                </td>
                                <td>
                                    <code>
                                        enumOf(&apos;a&apos;, &apos;b&apos;)
                                    </code>
                                </td>
                                <td>
                                    Also available as{' '}
                                    <code>
                                        string().oneOf(&apos;a&apos;,
                                        &apos;b&apos;)
                                    </code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.parse(v)</code>
                                </td>
                                <td>
                                    <code>.parse(v)</code>
                                </td>
                                <td>Throws on invalid data</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.safeParse(v)</code>
                                </td>
                                <td>
                                    <code>.validate(v)</code> or{' '}
                                    <code>.safeParse(v)</code>
                                </td>
                                <td>
                                    Both work; result shape differs from Zod (
                                    <code>valid</code> / <code>object</code>{' '}
                                    instead of <code>success</code> /{' '}
                                    <code>data</code>)
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.parseAsync(v)</code>
                                </td>
                                <td>
                                    <code>.parseAsync(v)</code>
                                </td>
                                <td>Throws on invalid data; async</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.safeParseAsync(v)</code>
                                </td>
                                <td>
                                    <code>.validateAsync(v)</code> or{' '}
                                    <code>.safeParseAsync(v)</code>
                                </td>
                                <td>
                                    Both work; same result shape note applies
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.infer&lt;typeof s&gt;</code>
                                </td>
                                <td>
                                    <code>InferType&lt;typeof s&gt;</code>
                                </td>
                                <td>Named import from the package</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.optional()</code>
                                </td>
                                <td>
                                    <code>.optional()</code>
                                </td>
                                <td>Identical</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.refine(fn, msg)</code>
                                </td>
                                <td>
                                    <code>.addValidator(fn, msgProvider)</code>
                                </td>
                                <td>See Custom Validators section</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.transform(fn)</code>
                                </td>
                                <td>
                                    <code>.addPreprocessor(fn)</code>
                                </td>
                                <td>
                                    Runs before validation; see Transforms
                                    section
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.brand&lt;'T'&gt;()</code>
                                </td>
                                <td>
                                    <code>.brand&lt;'T'&gt;()</code>
                                </td>
                                <td>Identical</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.readonly()</code>
                                </td>
                                <td>
                                    <code>.readonly()</code>
                                </td>
                                <td>Identical — type-level only</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.email()</code>, <code>.url()</code>,{' '}
                                    <code>.uuid()</code>, <code>.ip()</code>
                                </td>
                                <td>Same — built-in extensions</td>
                                <td>
                                    Import from <code>@cleverbrush/schema</code>{' '}
                                    (default export has extensions applied)
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <em>—</em>
                                </td>
                                <td>
                                    <code>.introspect()</code>
                                </td>
                                <td>
                                    Unique to @cleverbrush — runtime schema
                                    inspection
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Installation ─────────────────────────────────── */}
            <div className="card">
                <h2>Installation</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `# Before
npm install zod

# After
npm install @cleverbrush/schema`
                            )
                        }}
                    />
                </pre>
                <p>
                    Update the import and replace <code>z.</code> call sites —
                    most primitives are drop-in replacements.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Before
import { z } from 'zod';

// After
import { string, number, boolean, object, array, union, InferType } from '@cleverbrush/schema';`
                            )
                        }}
                    />
                </pre>
            </div>

            {/* ── Primitives ───────────────────────────────────── */}
            <div className="card">
                <h2>Primitives</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod
const s = z.string();
const n = z.number();
const b = z.boolean();
const d = z.date();
const a = z.any();

// @cleverbrush/schema  (identical call sites)
const s = string();
const n = number();
const b = boolean();
const d = date();
const a = any();`
                            )
                        }}
                    />
                </pre>
            </div>

            {/* ── String Validators ────────────────────────────── */}
            <div className="card">
                <h2>String Validators</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod
z.string().email()
z.string().url()
z.string().uuid()
z.string().ip()
z.string().min(2)
z.string().max(100)
z.string().regex(/^[a-z]+$/)
z.string().trim()
z.string().toLowerCase()
z.string().nonempty()
z.string().optional()

// @cleverbrush/schema
string().email()
string().url()
string().uuid()
string().ip()
string().minLength(2)       // renamed: min → minLength
string().maxLength(100)     // renamed: max → maxLength
string().matches(/^[a-z]+$/) // renamed: regex → matches
string().trim()
string().toLowerCase()
string().nonempty()
string().optional()`
                            )
                        }}
                    />
                </pre>
                <p>
                    The main naming difference is <code>.min()</code> /{' '}
                    <code>.max()</code> become <code>.minLength()</code> /{' '}
                    <code>.maxLength()</code> on strings (and arrays), and{' '}
                    <code>.regex()</code> becomes <code>.matches()</code>.
                </p>
            </div>

            {/* ── Number Validators ────────────────────────────── */}
            <div className="card">
                <h2>Number Validators</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod 3
z.number().int()          // Zod 3 method-chain style
z.number().min(0)
z.number().max(100)
z.number().positive()
z.number().negative()
z.number().finite()
z.number().multipleOf(5)

// Zod 4 — integer moved to a top-level validator
z.int()                   // replaces z.number().int()
z.number().min(0)         // .min() / .max() unchanged

// @cleverbrush/schema
number().isInteger()      // renamed: int() → isInteger()
number().min(0)
number().max(100)
number().positive()
number().negative()
number().finite()
number().multipleOf(5)`
                            )
                        }}
                    />
                </pre>
            </div>

            {/* ── Object Schemas ───────────────────────────────── */}
            <div className="card">
                <h2>Object Schemas</h2>
                <a
                    href="/playground/objects-and-composition"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod
const Base = z.object({ id: z.number(), name: z.string() });
const Extended  = Base.extend({ email: z.string().email() });
const Merged    = Base.merge(z.object({ role: z.string() }));
const Picked    = Base.pick({ id: true });
const Omitted   = Base.omit({ name: true });
const AllOptional = Base.partial();
const PartialName = Base.partial({ name: true });

// @cleverbrush/schema
const Base = object({ id: number(), name: string() });
const Extended  = Base.addProps({ email: string().email() });
const Merged    = Base.intersect(object({ role: string() }));
const Picked    = Base.pick(['id']);
const Omitted   = Base.omit(['name']);
const AllOptional = Base.partial();
const PartialName = Base.partial('name');   // single field — no object wrapper needed`
                            )
                        }}
                    />
                </pre>
                <p>
                    <code>.addProps()</code> also accepts another{' '}
                    <code>ObjectSchemaBuilder</code> directly, which lets you
                    compose schemas without listing property names:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `const Timestamps = object({ createdAt: date(), updatedAt: date() });
const User         = object({ id: number(), name: string() });

// Merge by passing the builder itself
const UserWithTimestamps = User.addProps(Timestamps);
// → { id: number, name: string, createdAt: Date, updatedAt: Date }`
                            )
                        }}
                    />
                </pre>
            </div>

            {/* ── Arrays ───────────────────────────────────────── */}
            <div className="card">
                <h2>Arrays</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod
z.array(z.string())
z.array(z.string()).min(1)
z.array(z.string()).max(10)
z.array(z.string()).nonempty()
z.array(z.string()).length(5)  // exact length — not available in @cleverbrush

// @cleverbrush/schema
array(string())
array(string()).minLength(1)
array(string()).maxLength(10)
array(string()).nonempty()     // extension shorthand for minLength(1)
array(string()).unique()       // extra: deduplication check (no Zod equivalent)`
                            )
                        }}
                    />
                </pre>
            </div>

            {/* ── Unions ───────────────────────────────────────── */}
            <div className="card">
                <h2>Unions &amp; Discriminated Unions</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod — z.union takes an array
const StringOrNumber = z.union([z.string(), z.number()]);

// @cleverbrush/schema — union() is chainable with .or()
const StringOrNumber = union(string()).or(number());

// Discriminated union — Zod
const Shape = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('circle'),    radius: z.number() }),
  z.object({ kind: z.literal('rectangle'), width: z.number(), height: z.number() }),
]);

// Discriminated union — @cleverbrush/schema
// string().equals() acts as a literal; union infers the discriminant automatically
const Circle    = object({ kind: string().equals('circle'),    radius: number() });
const Rectangle = object({ kind: string().equals('rectangle'), width: number(), height: number() });
const Shape     = union(Circle).or(Rectangle);
// TypeScript infers: { kind: 'circle'; radius: number } | { kind: 'rectangle'; width: number; height: number }`
                            )
                        }}
                    />
                </pre>
            </div>

            {/* ── Enums ────────────────────────────────────────── */}
            <div className="card">
                <h2>Enums</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod
const Role = z.enum(['admin', 'user', 'guest']);
type Role = z.infer<typeof Role>; // 'admin' | 'user' | 'guest'

// @cleverbrush/schema — top-level factory
import { enumOf, InferType } from '@cleverbrush/schema';
const Role = enumOf('admin', 'user', 'guest');
type Role = InferType<typeof Role>; // 'admin' | 'user' | 'guest'

// or as an extension method on string()
const Role2 = string().oneOf('admin', 'user', 'guest');

// Also works on numbers
const Priority = number().oneOf(1, 2, 3);
type Priority = InferType<typeof Priority>; // 1 | 2 | 3`
                            )
                        }}
                    />
                </pre>
            </div>

            {/* ── Parse & Validate ─────────────────────────────── */}
            <div className="card">
                <h2>Parse &amp; Validate</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod
const user = UserSchema.parse(data);           // throws ZodError on failure
const result = UserSchema.safeParse(data);     // { success, data } | { success, error }
if (!result.success) console.log(result.error.issues);

// @cleverbrush/schema
const user = UserSchema.parse(data);           // throws SchemaValidationError on failure
const result = UserSchema.validate(data);      // { valid, object? }
if (!result.valid) {
  console.log(result.getErrorsFor(u => u.fieldName).errors); // ['...']
}

// Zod-compat aliases also exist:
const result2 = UserSchema.safeParse(data);    // alias for .validate()
const result3 = await UserSchema.safeParseAsync(data); // alias for .validateAsync()

// Async variants
const user2  = await UserSchema.parseAsync(data);
const result4 = await UserSchema.validateAsync(data);`
                            )
                        }}
                    />
                </pre>
                <p>
                    The result shape is different from Zod&apos;s{' '}
                    <code>{'{ success, data }'}</code>. In{' '}
                    <code>@cleverbrush/schema</code> the result is{' '}
                    <code>
                        {
                            '{ valid: boolean, object?: T, errors?: ValidationError[] }'
                        }
                    </code>
                    . For easier migration, <code>.safeParse()</code> and{' '}
                    <code>.safeParseAsync()</code> exist as aliases for{' '}
                    <code>.validate()</code> / <code>.validateAsync()</code> —
                    note that the returned object shape still uses{' '}
                    <code>valid</code> / <code>object</code> /{' '}
                    <code>errors</code>, not Zod&apos;s <code>success</code> /{' '}
                    <code>data</code>.
                </p>
            </div>

            {/* ── Type Inference ───────────────────────────────── */}
            <div className="card">
                <h2>Type Inference</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod
import { z } from 'zod';
const UserSchema = z.object({ name: z.string(), age: z.number() });
type User = z.infer<typeof UserSchema>;

// @cleverbrush/schema
import { object, string, number, InferType } from '@cleverbrush/schema';
const UserSchema = object({ name: string(), age: number() });
type User = InferType<typeof UserSchema>;
// → { name: string; age: number }`
                            )
                        }}
                    />
                </pre>
            </div>

            {/* ── Custom Validators ────────────────────────────── */}
            <div className="card">
                <h2>Custom Validators</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod — .refine(fn, message | options)
const EvenNumber = z.number().refine(n => n % 2 === 0, 'Must be even');

// With context-aware message:
const Username = z.string().refine(
  s => !s.includes(' '),
  val => ({ message: \`"\${val}" must not contain spaces\` })
);

// @cleverbrush/schema — .addValidator(fn, messageProvider?)
// fn returns true (valid) or false (invalid)
const EvenNumber = number().addValidator(n => n % 2 === 0, 'Must be even');

// With value-aware message (message provider receives the value):
const Username = string().addValidator(
  s => !s.includes(' '),
  val => \`"\${val}" must not contain spaces\`
);

// Async validators work the same way — just return a Promise<boolean>
const UniqueEmail = string().email().addValidator(
  async email => !(await db.emailExists(email)),
  'Email already taken'
);`
                            )
                        }}
                    />
                </pre>
            </div>

            {/* ── Transforms / Preprocessors ───────────────────── */}
            <div className="card">
                <h2>Transforms &amp; Preprocessors</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod — .transform() runs after validation
const UpperEmail = z.string().email().transform(s => s.toLowerCase());

// @cleverbrush/schema — .addPreprocessor() runs before validation
// This is an important semantic difference: preprocess first, then validate
const LowerEmail = string().addPreprocessor(s => s.toLowerCase()).email();

// String extension shorthands cover the common cases:
const LowerEmail = string().toLowerCase().email(); // same thing`
                            )
                        }}
                    />
                </pre>
                <p>
                    <strong>Key difference:</strong> Zod&apos;s{' '}
                    <code>.transform()</code> runs <em>after</em> validation,
                    changing the output type. <code>.addPreprocessor()</code>{' '}
                    runs <em>before</em> validation, normalising the raw input.
                    For most real-world use cases (trim whitespace, normalise
                    case, coerce strings to numbers) the preprocessor approach
                    is cleaner and more predictable.
                </p>
            </div>

            {/* ── Default Values ──────────────────────────────── */}
            <div className="card">
                <h2>Default Values</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod
const Name = z.string().default('Anonymous');

// @cleverbrush/schema  (identical API)
const Name = string().default('Anonymous');

// Both support factory functions for mutable defaults:
// Zod:    z.array(z.string()).default(() => []);
// Schema: array(string()).default(() => []);

// Both remove undefined from the inferred type:
// type Name = string  (not string | undefined)`
                            )
                        }}
                    />
                </pre>
                <p>
                    The <code>.default(value)</code> API is identical to Zod. It
                    accepts a static value or a factory function, and the
                    default is validated against the schema&apos;s constraints.
                    The inferred type automatically unwraps{' '}
                    <code>undefined</code>.
                </p>
            </div>

            {/* ── Branded Types ────────────────────────────────── */}
            <div className="card">
                <h2>Branded Types</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod
const Email = z.string().email().brand<'Email'>();
type Email = z.infer<typeof Email>;

// @cleverbrush/schema  (identical)
const Email = string().email().brand<'Email'>();
type Email = InferType<typeof Email>;

// Both prevent accidental type mixing:
function sendEmail(to: Email) { /* ... */ }
sendEmail('user@example.com'); // ✗ TypeScript error — string is not Email
sendEmail(Email.parse('user@example.com')); // ✓`
                            )
                        }}
                    />
                </pre>
            </div>

            {/* ── Readonly ─────────────────────────────────────── */}
            <div className="card">
                <h2>Readonly</h2>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `// Zod
const User = z.object({ name: z.string() }).readonly();
type User = z.infer<typeof User>; // Readonly<{ name: string }>

// @cleverbrush/schema  (identical)
const User = object({ name: string() }).readonly();
type User = InferType<typeof User>; // Readonly<{ name: string }>

// Works on arrays too:
const Tags = array(string()).readonly();
type Tags = InferType<typeof Tags>; // ReadonlyArray<string>

// Introspectable:
console.log(User.introspect().isReadonly); // true`
                            )
                        }}
                    />
                </pre>
                <p>
                    The <code>.readonly()</code> API is identical to Zod&apos;s.
                    It is <strong>type-level only</strong> — it marks the
                    inferred type as <code>Readonly&lt;T&gt;</code> (or{' '}
                    <code>ReadonlyArray&lt;T&gt;</code> for arrays) but does not
                    freeze the validated value at runtime. The{' '}
                    <code>isReadonly</code> flag is exposed via{' '}
                    <code>.introspect()</code> for tooling.
                </p>
            </div>

            {/* ── Introspection ────────────────────────────────── */}
            <div className="why-box">
                <h2>🔍 Unique Advantage: Schema Introspection</h2>
                <p>
                    Zod schemas are opaque — you can validate data but cannot
                    inspect the schema&apos;s structure at runtime.{' '}
                    <code>@cleverbrush/schema</code> exposes a full descriptor
                    tree via <code>.introspect()</code>, making schemas{' '}
                    <strong>transparent and programmable</strong>.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
  name:  string().minLength(1).maxLength(100),
  email: string().email(),
  age:   number().min(0).optional()
});

// Inspect the schema structure at runtime
const descriptor = UserSchema.introspect();

console.log(descriptor.properties.name.isRequired);   // true
console.log(descriptor.properties.age.isRequired);    // false
console.log(descriptor.properties.email.type);        // 'string'

// This powers @cleverbrush/mapper and @cleverbrush/react-form:
// the same schema drives type-safe object mapping AND auto-generated forms.
// Zod has no equivalent — introspection is architecturally impossible.`
                            )
                        }}
                    />
                </pre>
                <p>
                    This is the foundation for the <code>@cleverbrush</code>{' '}
                    ecosystem. <a href="/mapper">@cleverbrush/mapper</a> uses
                    PropertyDescriptors to provide type-safe property selectors
                    for object transformation.{' '}
                    <a
                        href="https://www.npmjs.com/package/@cleverbrush/react-form"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        @cleverbrush/react-form
                    </a>{' '}
                    uses them to auto-generate and auto-validate form fields.
                    Neither would be possible with Zod.
                </p>
            </div>

            {/* ── Extension System ─────────────────────────────── */}
            <div className="why-box">
                <h2>🧩 Unique Advantage: Type-Safe Extension System</h2>
                <p>
                    Zod&apos;s only extensibility mechanism is{' '}
                    <code>.refine()</code> — you can add a validator, but you
                    cannot add new <em>methods</em> to the builder with proper
                    TypeScript types. <code>@cleverbrush/schema</code> has a
                    first-class extension system: add methods that appear on the
                    builder itself, fully typed, composable with everything
                    else.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(
                                `import { defineExtension, withExtensions, StringSchemaBuilder } from '@cleverbrush/schema';

// Define a reusable extension — each key is a builder type
const slugExtension = defineExtension({
  string: {
    slug(this: StringSchemaBuilder) {
      return this.matches(/^[a-z0-9-]+$/).addValidator(
        s => !s.startsWith('-') && !s.endsWith('-'),
        'Slug must not start or end with a hyphen'
      );
    }
  }
});

// Apply with withExtensions() — returns augmented factory functions
const { string: s } = withExtensions(slugExtension);

// Now .slug() is a real method — autocomplete works, no type casts
const PostSlug = s().slug().minLength(3).maxLength(60);`
                            )
                        }}
                    />
                </pre>
                <p>
                    The built-in <code>.email()</code>, <code>.url()</code>,{' '}
                    <code>.uuid()</code>, <code>.ip()</code>,{' '}
                    <code>.positive()</code>, <code>.nonempty()</code>, and{' '}
                    <code>.unique()</code> methods are all implemented this way
                    — the extension system is used in production, not just a
                    theoretical feature.
                </p>
            </div>

            {/* ── Honest Gaps ──────────────────────────────────── */}
            <div className="card" id="gaps">
                <h2>Honest Gaps</h2>
                <p>
                    <code>@cleverbrush/schema</code> does not yet cover every
                    Zod feature. Here is what&apos;s missing:
                </p>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Zod Feature</th>
                                <th>Status</th>
                                <th>Workaround</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>z.tuple([...])</code>
                                </td>
                                <td>✓ Supported</td>
                                <td>
                                    <code>tuple([string(), number()])</code> —
                                    import <code>tuple</code> from{' '}
                                    <code>@cleverbrush/schema</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.record(key, value)</code>
                                </td>
                                <td>✓ Supported</td>
                                <td>
                                    <code>record(string(), number())</code> —
                                    import <code>record</code> from{' '}
                                    <code>@cleverbrush/schema</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.map()</code> / <code>z.set()</code>
                                </td>
                                <td>Not implemented</td>
                                <td>
                                    Use <code>any()</code> + custom validator
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.null()</code>
                                </td>
                                <td>✓ Supported</td>
                                <td>
                                    <code>nul()</code> — note the spelling
                                    (avoids the JS reserved word)
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.undefined()</code> /{' '}
                                    <code>z.void()</code> /{' '}
                                    <code>z.never()</code>
                                </td>
                                <td>Not implemented</td>
                                <td>
                                    Use <code>.optional()</code> where
                                    nullability is needed
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.default(value)</code>
                                </td>
                                <td>✓ Supported</td>
                                <td>
                                    <code>.default(value)</code> or{' '}
                                    <code>.default(() =&gt; value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.catch(value)</code>
                                </td>
                                <td>✓ Supported</td>
                                <td>
                                    <code>.catch(value)</code> or{' '}
                                    <code>.catch(() =&gt; value)</code> —
                                    returns fallback when validation fails
                                    instead of throwing
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.intersection(a, b)</code>
                                </td>
                                <td>
                                    Object-level: <code>.intersect()</code>{' '}
                                    covers it
                                </td>
                                <td>
                                    Use <code>object().intersect(other)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.promise()</code>
                                </td>
                                <td>Not implemented</td>
                                <td>—</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.transform()</code> (post-validation
                                    output type change)
                                </td>
                                <td>Partial</td>
                                <td>
                                    <code>.addPreprocessor()</code> runs
                                    pre-validation; output type stays the same
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── What You Gain ────────────────────────────────── */}
            <div className="card">
                <h2>What You Gain</h2>
                <p>
                    Switching to <code>@cleverbrush/schema</code> unlocks
                    capabilities that are architecturally impossible in Zod:
                </p>
                <ul>
                    <li>
                        <strong>Runtime introspection</strong> —{' '}
                        <code>.introspect()</code> gives you the full schema
                        descriptor tree at runtime. Build code generators, form
                        renderers, API doc generators, and more — directly from
                        your schema.
                    </li>
                    <li>
                        <strong>Type-safe extension methods</strong> — Add real
                        builder methods with full TypeScript support. Not just{' '}
                        <code>.refine()</code> callbacks — composable,
                        discoverable, autocomplete-friendly methods.
                    </li>
                    <li>
                        <strong>Schema-driven ecosystem</strong> —{' '}
                        <a href="/mapper">@cleverbrush/mapper</a> and{' '}
                        <a
                            href="https://www.npmjs.com/package/@cleverbrush/react-form"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            @cleverbrush/react-form
                        </a>{' '}
                        are built on the same schema foundation. One schema
                        definition drives validation, object mapping, and form
                        rendering simultaneously.
                    </li>
                    <li>
                        <strong>Immutable by design</strong> — Every method
                        returns a new instance. Safe to share base schemas
                        across modules without fear of mutation bugs.
                    </li>
                    <li>
                        <strong>JSDoc preservation</strong> — Descriptions
                        attached to schema properties flow through to IDE
                        tooltips, because the schema is the single source of
                        truth.
                    </li>
                </ul>
            </div>
        </>
    );
}
