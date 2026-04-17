import { InstallBanner } from '@cleverbrush/website-shared/components/InstallBanner';
import { fmtKB, loadBundleSizes } from '@cleverbrush/website-shared/lib/bundleSizes';
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function GettingStartedSection() {
    const bundleSizes = loadBundleSizes();
    return (
        <>
            <div className="section-header">
                <h1>@cleverbrush/schema</h1>
                <p className="subtitle">
                    Immutable, composable schema definitions with built-in
                    validation and TypeScript type inference.
                </p>
            </div>

            {/* ── Installation ─────────────────────────────────── */}
            <InstallBanner command="npm install @cleverbrush/schema" />
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
                                {bundleSizes.entries.map(e => (
                                    <tr key={e.import}>
                                        <td>
                                            <code>{e.import}</code>
                                            {e.description
                                                ? ` (${e.description})`
                                                : ''}
                                        </td>
                                        <td>{fmtKB(e.gzip)}</td>
                                        <td>{fmtKB(e.brotli)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="bundle-size-note">
                        The <code>sideEffects: false</code> flag is set in the
                        package manifest. When your bundler supports
                        tree-shaking, use the sub-path exports above to keep
                        your bundle smaller — each builder carries only its own
                        validation logic plus the shared{' '}
                        <code>SchemaBuilder</code> base (~2.7 KB gzip).
                    </p>
                </div>
            </details>

            {/* ── Why ──────────────────────────────────────────── */}
            <div className="why-box">
                <h2>💡 Why @cleverbrush/schema?</h2>

                <h3>The Problem</h3>
                <p>
                    In a typical TypeScript project, types and runtime
                    validation are separate concerns. You define a{' '}
                    <code>User</code> type in one file, then write Joi / Yup /
                    Zod schemas (or manual <code>if</code> checks) in another.
                    Over time these drift apart — the type says a field is
                    required, but the validation allows it to be{' '}
                    <code>undefined</code>. Tests pass, but production data
                    breaks because the validation didn&apos;t match the type.
                </p>

                <h3>The Solution</h3>
                <p>
                    <code>@cleverbrush/schema</code> lets you define a schema{' '}
                    <strong>once</strong> and derive both the TypeScript type
                    (via <code>InferType</code>) and runtime validation from the
                    same source. Because every method returns a{' '}
                    <strong>new builder instance</strong> (immutability), you
                    can safely compose and extend schemas without accidentally
                    mutating shared definitions.
                </p>

                <h3>The Unique Feature: PropertyDescriptors</h3>
                <p>
                    Unlike other schema libraries,{' '}
                    <code>@cleverbrush/schema</code> exposes a typed{' '}
                    <strong>property descriptor</strong> for every field in a
                    schema object. This lets you reference fields with a typed
                    arrow function — <code>u =&gt; u.address.city</code> —
                    instead of a string literal like{' '}
                    <code>&quot;address.city&quot;</code>. TypeScript verifies
                    the path at compile time, so renaming a field immediately
                    surfaces every stale reference as a compile error. No silent
                    runtime breakage from string paths that drift out of sync.
                    The <code>@cleverbrush/mapper</code> and{' '}
                    <code>@cleverbrush/react-form</code> packages both build on
                    this for type-safe field targeting.
                </p>

                <h3>Production Tested</h3>
                <p>
                    Every form, every API response mapping, and every validation
                    rule in{' '}
                    <a
                        href="https://cleverbrush.com/editor"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        cleverbrush.com/editor
                    </a>{' '}
                    is powered by <code>@cleverbrush/schema</code>. It handles
                    hundreds of schemas with nested objects, async validators,
                    and custom error messages in production every day.
                </p>
            </div>

            {/* ── How It Works ─────────────────────────────────── */}
            <div className="card">
                <h2>How It Works — Step by Step</h2>
                <ol>
                    <li>
                        <strong>Define a schema</strong> using builder functions
                        like <code>object()</code>, <code>string()</code>,{' '}
                        <code>number()</code> — chain constraints with a fluent
                        API
                    </li>
                    <li>
                        <strong>Infer the TypeScript type</strong> with{' '}
                        <code>type T = InferType&lt;typeof MySchema&gt;</code> —
                        no manual interface needed
                    </li>
                    <li>
                        <strong>Validate data</strong> with{' '}
                        <code>schema.validate(data)</code> — get typed results
                        with per-property errors (or{' '}
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
                        <code>@cleverbrush/mapper</code> for object mapping or{' '}
                        <code>@cleverbrush/react-form</code> for React forms —
                        same schema, everywhere
                    </li>
                </ol>
            </div>

            {/* ── Quick Start ──────────────────────────────────── */}
            <div className="card">
                <h2>Quick Start</h2>
                <a href="/playground/quick-start" className="playground-link">
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

// Invalid data produces structured errors
const bad = UserSchema.validate(
  { name: 'A', email: '', age: -5, isActive: true },
  { doNotStopOnFirstError: true }
);

console.log(bad.valid);  // false

// Use getErrorsFor() to inspect per-field errors
console.log(bad.getErrorsFor(u => u.name).errors);   // ['Name must be at least 2 characters']
console.log(bad.getErrorsFor(u => u.email).errors);  // ['Please enter a valid email address']
console.log(bad.getErrorsFor(u => u.age).errors);    // ['Age cannot be negative']`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}
