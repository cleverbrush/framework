import Link from 'next/link';
import { fmtKB, loadBundleSizes } from '@/lib/bundleSizes';
import { highlightTS } from '@/lib/highlight';
import { BenchmarkSection } from './BenchmarkSection';
import { InstallBanner } from './InstallBanner';

export default function HomePage() {
    const bundleSizes = loadBundleSizes();
    const fullEntry = bundleSizes.entries.find(
        e => e.import === '@cleverbrush/schema'
    );
    const smallestEntry = bundleSizes.entries
        .filter(e => e.import !== '@cleverbrush/schema')
        .reduce(
            (min, e) => (e.gzip < min.gzip ? e : min),
            bundleSizes.entries[1] ?? bundleSizes.entries[0]
        );
    const fullGzip = fullEntry ? fmtKB(fullEntry.gzip) : '~17 KB';
    const smallGzip = smallestEntry ? fmtKB(smallestEntry.gzip) : '~5 KB';
    return (
        <>
            {/* ── Hero ─────────────────────────────────────────────── */}
            <section className="hero">
                <p className="hero-eyebrow">
                    The cornerstone of type-safe TypeScript
                </p>
                <h1>
                    One schema.
                    <br />
                    Types, validation, forms.
                </h1>
                <p className="tagline">
                    <code>@cleverbrush/schema</code> is an immutable, composable
                    schema library that infers your TypeScript types at compile
                    time and validates your data at runtime — with zero
                    dependencies. It lays the foundation for a rich ecosystem —
                    much like{' '}
                    <a
                        href="https://zod.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Zod
                    </a>{' '}
                    has shown is possible.
                </p>
                <div className="hero-actions">
                    <Link href="/schema" className="hero-btn hero-btn-primary">
                        Explore the Schema Library
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M3 8h10M9 4l4 4-4 4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Link>
                    <Link
                        href="/playground"
                        className="hero-btn hero-btn-playground"
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        Try in Playground
                    </Link>
                    <a
                        href="https://github.com/cleverbrush/framework"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hero-btn hero-btn-secondary"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub
                    </a>
                </div>
                <div className="hero-badges">
                    <span className="badge">Zero runtime dependencies</span>
                    <span className="badge">Compile-time type inference</span>
                    <span className="badge">Immutable &amp; composable</span>
                    <span className="badge">BSD-3 Licensed</span>
                    <span className="badge">
                        {smallGzip} min (full {fullGzip}) gzipped
                    </span>
                    <span className="badge">Standard Schema compatible</span>
                    <span className="badge">98% test coverage</span>
                    <span className="badge">Faster than Zod in most tests</span>
                </div>
            </section>

            {/* ── Quick Install ────────────────────────────────────── */}
            <section className="install-section">
                <div className="container">
                    <div className="install-section-header">
                        <h2>Get started in seconds</h2>
                        <p>
                            Install only what you need — each package is
                            independent and tree-shakeable.
                        </p>
                    </div>
                    <InstallBanner
                        commands={[
                            {
                                command: 'npm install @cleverbrush/schema',
                                label: 'Schema — validation + TypeScript inference'
                            },
                            {
                                command: 'npm install @cleverbrush/mapper',
                                label: 'Type-safe object mapping (optional)'
                            },
                            {
                                command: 'npm install @cleverbrush/react-form',
                                label: 'Headless schema-driven React forms (optional)'
                            },
                            {
                                command: 'npm install @cleverbrush/schema-json',
                                label: 'JSON Schema Draft 7 / 2020-12 interop (optional)'
                            }
                        ]}
                        note={
                            <>
                                <code>@cleverbrush/schema</code> and{' '}
                                <code>@cleverbrush/mapper</code> have zero
                                runtime dependencies.{' '}
                                <code>@cleverbrush/react-form</code> depends
                                only on React and the schema library.
                            </>
                        }
                    />
                </div>
            </section>

            {/* ── vs Zod ───────────────────────────────────────────── */}
            <section className="section vs-zod-section" id="vs-zod">
                <div className="container">
                    <div className="vs-zod-intro">
                        <h2 className="section-title">
                            How it compares to Zod
                        </h2>
                        <p className="subtitle">
                            If you know Zod, you already know most of the API —
                            the primitives, the fluent builder style, and{' '}
                            <code>InferType</code> all work the same way.
                            @cleverbrush/schema goes further in three areas that
                            Zod cannot match.
                        </p>
                    </div>

                    <div className="vs-zod-grid">
                        <div className="vs-zod-card">
                            <div className="vs-zod-icon">🎯</div>
                            <h3>Typed field-error selectors</h3>
                            <p>
                                Access per-field errors through a typed lambda —
                                no magic strings, no brittle path navigation.
                                TypeScript catches a misspelled field name at
                                compile time.
                            </p>
                            <pre>
                                <code
                                    dangerouslySetInnerHTML={{
                                        __html: highlightTS(
                                            `// Zod — string path, no compile-time check
result.error?.issues.filter(i => i.path[0] === 'naem') // ← typo silently passes

// @cleverbrush/schema — typed selector
result.getErrorsFor(u => u.naem) // ← TypeScript error ✓`
                                        )
                                    }}
                                />
                            </pre>
                        </div>

                        <div className="vs-zod-card">
                            <div className="vs-zod-icon">🔍</div>
                            <h3>Runtime schema introspection</h3>
                            <p>
                                Both Zod and <code>@cleverbrush/schema</code>{' '}
                                let you inspect schema structure at runtime —
                                but <code>@cleverbrush/schema</code> was built
                                with introspection as a first-class concern.
                                Every descriptor returned by{' '}
                                <code>.introspect()</code> is fully typed, so
                                you get rich autocomplete and compile-time
                                checks instead of navigating loosely-typed
                                internal properties.
                            </p>
                            <pre>
                                <code
                                    dangerouslySetInnerHTML={{
                                        __html: highlightTS(
                                            `// Zod — possible, but via loosely-typed internals
schema._zod.def.shape.name  // type: any

// @cleverbrush/schema — fully typed descriptor tree
const d = UserSchema.introspect();
d.properties.name.isRequired   // boolean ✓
d.properties.age.isRequired    // boolean ✓
d.properties.email.validators  // TypedValidator[] ✓`
                                        )
                                    }}
                                />
                            </pre>
                        </div>

                        <div className="vs-zod-card">
                            <div className="vs-zod-icon">🧩</div>
                            <h3>Type-safe extension system</h3>
                            <p>
                                Add your own methods to schema builders — fully
                                typed, autocomplete-ready. The built-in{' '}
                                <code>.email()</code>, <code>.url()</code>,{' '}
                                <code>.uuid()</code> methods use the same public
                                API.
                            </p>
                            <pre>
                                <code
                                    dangerouslySetInnerHTML={{
                                        __html: highlightTS(
                                            `// Zod — only .refine(), no new builder methods

// @cleverbrush/schema — real methods on the builder
const slugExt = defineExtension({
  string: {
    slug(this: StringSchemaBuilder) {
      return this.matches(/^[a-z0-9-]+$/);
    }
  }
});
const { string: s } = withExtensions(slugExt);
const PostSlug = s().slug().minLength(3);
//               ^ slug() is typed, autocomplete works`
                                        )
                                    }}
                                />
                            </pre>
                        </div>
                    </div>

                    <div className="vs-zod-metrics">
                        <div className="vs-zod-metric">
                            <span className="vs-zod-metric-val">
                                {smallGzip}
                            </span>
                            <span className="vs-zod-metric-label">
                                min bundle (gzip)
                            </span>
                        </div>
                        <div className="vs-zod-metric">
                            <span className="vs-zod-metric-val">2×</span>
                            <span className="vs-zod-metric-label">
                                faster than Zod in array validation
                            </span>
                        </div>
                        <div className="vs-zod-metric">
                            <span className="vs-zod-metric-val">0</span>
                            <span className="vs-zod-metric-label">
                                runtime dependencies
                            </span>
                        </div>
                        <div className="vs-zod-metric">
                            <span className="vs-zod-metric-val">98%</span>
                            <span className="vs-zod-metric-label">
                                test coverage
                            </span>
                        </div>
                    </div>

                    <div className="vs-zod-footer">
                        <Link
                            href="/migrating-from-zod"
                            className="hero-btn hero-btn-primary"
                        >
                            Migrate from Zod →
                        </Link>
                        <Link
                            href="/schema/comparison"
                            className="hero-btn hero-btn-secondary"
                        >
                            Full library comparison →
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Schema Spotlight ─────────────────────────────────── */}
            <section className="section" id="schema">
                <div className="container">
                    <div className="schema-spotlight">
                        <div className="schema-spotlight-header">
                            <div
                                className="schema-spotlight-icon"
                                aria-hidden="true"
                            >
                                <svg
                                    width="28"
                                    height="28"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="schema-spotlight-title">
                                    @cleverbrush/schema
                                </h2>
                                <p className="schema-spotlight-sub">
                                    The foundation everything else builds on
                                </p>
                            </div>
                            <div className="schema-spotlight-cta">
                                <a
                                    href="https://www.npmjs.com/package/@cleverbrush/schema"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hero-btn hero-btn-secondary"
                                >
                                    npm ↗
                                </a>
                                <Link
                                    href="/schema"
                                    className="hero-btn hero-btn-primary"
                                >
                                    Read the docs →
                                </Link>
                            </div>
                        </div>

                        <div className="schema-features-grid">
                            <div className="schema-feature">
                                <span className="schema-feature-icon">⚡</span>
                                <strong>Runtime validation</strong>
                                <p>
                                    Validate untrusted input at API boundaries,
                                    form submissions, or config files — with
                                    detailed error messages.
                                </p>
                            </div>
                            <div className="schema-feature">
                                <span className="schema-feature-icon">🔷</span>
                                <strong>TypeScript inference</strong>
                                <p>
                                    The TypeScript type is derived automatically
                                    from the schema. No duplicate{' '}
                                    <code>interface</code> declarations.
                                </p>
                            </div>
                            <div className="schema-feature">
                                <span className="schema-feature-icon">🧱</span>
                                <strong>Immutable &amp; composable</strong>
                                <p>
                                    Every builder call returns a new instance.
                                    Schemas are safe to share across modules
                                    without side effects.
                                </p>
                            </div>
                            <div className="schema-feature">
                                <span className="schema-feature-icon">📦</span>
                                <strong>Zero dependencies</strong>
                                <p>
                                    ~{smallGzip} gzipped (minimalist build) or ~
                                    {fullGzip}
                                    for the full build. Runs in Node, Deno, Bun,
                                    and modern browsers.
                                </p>
                            </div>
                            <div className="schema-feature">
                                <span className="schema-feature-icon">🔗</span>
                                <strong>
                                    Standard Schema &amp; Zod interop
                                </strong>
                                <p>
                                    Implements the{' '}
                                    <a
                                        href="https://standardschema.dev"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Standard Schema
                                    </a>{' '}
                                    spec, so it works alongside any compatible
                                    library out of the box — including Zod.
                                </p>
                            </div>
                            <div className="schema-feature">
                                <span className="schema-feature-icon">🔍</span>
                                <strong>Typed field-error selectors</strong>
                                <p>
                                    After validation, look up errors for a
                                    specific field using an arrow function —{' '}
                                    <code>
                                        result.getErrorsFor(u&nbsp;=&gt;&nbsp;u.email)
                                    </code>
                                    — instead of a plain string like{' '}
                                    <code>{"errors['email']"}</code>. TypeScript
                                    verifies the property exists at compile
                                    time, so a typo like{' '}
                                    <code>u&nbsp;=&gt;&nbsp;u.emal</code> is a
                                    build error, not a runtime surprise.
                                </p>
                            </div>
                        </div>

                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { object, string, number, type InferType } from '@cleverbrush/schema';

// ── 1. Define once, get the type for free ───────────────────────────
const UserSchema = object({
  name:  string().minLength(2, 'Name must be at least 2 characters'),
  email: string().minLength(5, 'Please enter a valid email'),
  age:   number().min(0).max(150)
});

type User = InferType<typeof UserSchema>;
// → { name: string; email: string; age: number }

// ── 2. Validate and read field-level errors with typed selectors ──────
const result = UserSchema.validate(rawInput);
if (!result.valid) {
  // getErrorsFor is a method on the result — no magic strings
  const nameErrors = result.getErrorsFor(u => u.name);
  console.log(nameErrors.errors); // ['Name must be at least 2 characters']
}`)
                                }}
                            />
                        </pre>
                    </div>
                </div>
            </section>

            {/* ── Ecosystem ─────────────────────────────────────────── */}
            <section className="section" id="ecosystem">
                <div className="container">
                    <h2 className="section-title">What the schema enables</h2>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>
                        @cleverbrush/schema&apos;s runtime introspection powers
                        a family of companion libraries. Define your data shape
                        once and get type-safe mapping, JSON Schema interop, and
                        headless React forms — all from the same schema object.
                    </p>

                    {/* Ecosystem diagram */}
                    <div className="ecosystem-diagram">
                        <div className="ecosystem-center">
                            <Link href="/schema" className="ecosystem-core">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                                @cleverbrush/schema
                            </Link>
                        </div>
                        <div className="ecosystem-spokes">
                            <div className="ecosystem-spoke">
                                <div className="ecosystem-spoke-icon">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M17 1l4 4-4 4" />
                                        <path d="M3 11V9a4 4 0 014-4h14" />
                                        <path d="M7 23l-4-4 4-4" />
                                        <path d="M21 13v2a4 4 0 01-4 4H3" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>@cleverbrush/mapper</strong>
                                    <span>
                                        Type-safe object mapping between two
                                        schemas. Compile-time completeness — the
                                        compiler errors if you forget a
                                        property.
                                    </span>
                                </div>
                                <div className="spoke-links">
                                    <Link
                                        href="/mapper"
                                        className="ecosystem-link"
                                    >
                                        Docs →
                                    </Link>
                                    <a
                                        href="https://www.npmjs.com/package/@cleverbrush/mapper"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="spoke-npm-link"
                                    >
                                        npm ↗
                                    </a>
                                </div>
                            </div>
                            <div className="ecosystem-spoke">
                                <div className="ecosystem-spoke-icon">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <rect
                                            x="3"
                                            y="3"
                                            width="18"
                                            height="18"
                                            rx="2"
                                        />
                                        <path d="M3 9h18" />
                                        <path d="M9 21V9" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>@cleverbrush/react-form</strong>
                                    <span>
                                        Headless, schema-driven React forms.
                                        Works with Material UI, Ant Design, or
                                        plain HTML inputs.
                                    </span>
                                </div>
                                <div className="spoke-links">
                                    <Link
                                        href="/react-form"
                                        className="ecosystem-link"
                                    >
                                        Docs →
                                    </Link>
                                    <a
                                        href="https://www.npmjs.com/package/@cleverbrush/react-form"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="spoke-npm-link"
                                    >
                                        npm ↗
                                    </a>
                                </div>
                            </div>
                            <div className="ecosystem-spoke">
                                <div className="ecosystem-spoke-icon">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="8" y1="13" x2="16" y2="13" />
                                        <line x1="8" y1="17" x2="16" y2="17" />
                                    </svg>
                                </div>
                                <div>
                                    <strong>@cleverbrush/schema-json</strong>
                                    <span>
                                        Bidirectional JSON Schema (Draft 7 /
                                        2020-12) interop — convert to and from
                                        typed schema builders.
                                    </span>
                                </div>
                                <div className="spoke-links">
                                    <Link
                                        href="/schema-json"
                                        className="ecosystem-link"
                                    >
                                        Docs →
                                    </Link>
                                    <a
                                        href="https://www.npmjs.com/package/@cleverbrush/schema-json"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="spoke-npm-link"
                                    >
                                        npm ↗
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Zod API compatibility */}
                    <div className="card" style={{ marginTop: '2rem' }}>
                        <h3>Familiar API — migrate from Zod field by field</h3>
                        <p>
                            Most Zod primitives are drop-in replacements. The
                            fluent builder style, <code>optional()</code>,{' '}
                            <code>default()</code>, <code>brand()</code>, and{' '}
                            <code>readonly()</code> all work identically. You
                            can adopt @cleverbrush/schema incrementally — even
                            wrapping existing Zod schemas with{' '}
                            <code>extern()</code> to compose them into new
                            objects.
                        </p>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`// ── Zod ───────────────────────────────────────────────────────────
import { z } from 'zod';
const UserZ = z.object({
  name:  z.string().min(2),
  email: z.string().min(5),
  age:   z.number().min(0).max(150),
});
type UserZ = z.infer<typeof UserZ>; // requires z.infer<>

// ── @cleverbrush/schema ──────────────────────────────────────────────
import { object, string, number, type InferType } from '@cleverbrush/schema';
const UserSchema = object({
  name:  string().minLength(2),
  email: string().minLength(5),
  age:   number().min(0).max(150),
});
type User = InferType<typeof UserSchema>; // { name: string; email: string; age: number } — identical to z.infer<typeof UserZ>

// Validate — result.valid narrows the type automatically
const result = UserSchema.validate(rawInput);
if (result.valid) {
  processUser(result.object); // typed as User ✓
}`)
                                }}
                            />
                        </pre>
                        <Link href="/playground" className="playground-link">
                            &#9654; Try this example in the Playground
                        </Link>
                    </div>

                    {/* Composability */}
                    <div className="card">
                        <h3>
                            Immutable &amp; composable — share schemas safely
                        </h3>
                        <p>
                            Every builder method returns a new instance. Schemas
                            can be exported, extended, or narrowed anywhere in
                            your codebase without risk of accidental mutation.
                        </p>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { object, string, number, union, boolean, array, type InferType } from '@cleverbrush/schema';

// Reusable building blocks
const EmailField = string().minLength(5).maxLength(254);
const NameField  = string().minLength(2).maxLength(50);

// Extend a base schema for two contexts — neither mutates the other
const CreateUserSchema = object({ name: NameField, email: EmailField });
const UpdateUserSchema = CreateUserSchema
  .addProps({ role: string().optional() });

// Discriminated unions with full type narrowing
const MediaSchema = union(object({ type: string().equals('image'), url: string(), width: number(), height: number() }))
  .or(object({ type: string().equals('video'), url: string(), duration: number() }))
  .or(object({ type: string().equals('text'),  body: string() }));
type Media = InferType<typeof MediaSchema>;
// { type: 'image'; url: string; width: number; height: number }
// | { type: 'video'; url: string; duration: number }
// | { type: 'text';  body: string }`)
                                }}
                            />
                        </pre>
                        <Link href="/playground" className="playground-link">
                            &#9654; Try this example in the Playground
                        </Link>
                    </div>

                    {/* Advanced: extern / Zod interop */}
                    <div className="card">
                        <h3>
                            Advanced: adopt incrementally with{' '}
                            <code>extern()</code>
                        </h3>
                        <p>
                            Already invested in Zod (or any{' '}
                            <a
                                href="https://standardschema.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Standard Schema v1
                            </a>{' '}
                            compatible library)? Wrap existing schemas with{' '}
                            <code>extern()</code> and use them as properties
                            inside <code>@cleverbrush/schema</code> objects.
                            Types are inferred across the boundary and{' '}
                            <code>getErrorsFor</code> selectors work through it
                            too.
                        </p>
                        <pre>
                            <code
                                dangerouslySetInnerHTML={{
                                    __html: highlightTS(`import { z } from 'zod';
import { object, date, number, extern, type InferType } from '@cleverbrush/schema';

// Your existing Zod schema — untouched
const zodAddress = z.object({ street: z.string(), city: z.string() });

// Compose it into a @cleverbrush/schema object
const OrderSchema = object({
  id:        number(),
  createdAt: date(),
  address:   extern(zodAddress),  // ← any Standard Schema v1 compatible library
});

type Order = InferType<typeof OrderSchema>;
// { id: number; createdAt: Date; address: { street: string; city: string } }`)
                                }}
                            />
                        </pre>
                        <Link
                            href="/playground/extern"
                            className="playground-link"
                        >
                            &#9654; Try extern() in the Playground
                        </Link>
                    </div>

                    {/* ── Quality & Testing ────────────────────────── */}
                    <div className="card quality-card">
                        <h3>Thoroughly Tested</h3>
                        <p>
                            Every package ships with a comprehensive unit test
                            suite run with{' '}
                            <a
                                href="https://vitest.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Vitest
                            </a>{' '}
                            across the full monorepo. Coverage is measured and
                            published on every release.
                        </p>
                        <div className="quality-stats">
                            <div className="quality-stat">
                                <span className="quality-stat-value">
                                    98.4%
                                </span>
                                <span className="quality-stat-label">
                                    Line coverage
                                </span>
                            </div>
                            <div className="quality-stat">
                                <span className="quality-stat-value">
                                    98.7%
                                </span>
                                <span className="quality-stat-label">
                                    Function coverage
                                </span>
                            </div>
                            <div className="quality-stat">
                                <span className="quality-stat-value">
                                    92.6%
                                </span>
                                <span className="quality-stat-label">
                                    Branch coverage
                                </span>
                            </div>
                        </div>
                        <a
                            href="https://github.com/cleverbrush/framework"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hero-btn hero-btn-secondary"
                        >
                            View source &amp; tests on GitHub →
                        </a>
                    </div>
                </div>
            </section>

            <BenchmarkSection />
            {/* ── Contribute CTA ──────────────────────────────────── */}
            <section className="section">
                <div className="container">
                    <div className="contribute-banner">
                        <div className="contribute-content">
                            <h2>
                                Help us build the future of typed web
                                development
                            </h2>
                            <p>
                                Cleverbrush libraries are open source and
                                community-driven. Whether it&apos;s fixing a
                                bug, improving docs, suggesting a feature, or
                                building a new library — every contribution
                                makes the ecosystem stronger for everyone.
                            </p>
                            <div className="contribute-actions">
                                <a
                                    href="https://github.com/cleverbrush/framework"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hero-btn hero-btn-primary"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    Contribute on GitHub
                                </a>
                                <a
                                    href="https://github.com/cleverbrush/framework/issues"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hero-btn hero-btn-secondary"
                                >
                                    Open an Issue
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
