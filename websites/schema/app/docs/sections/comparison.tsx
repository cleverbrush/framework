import Link from 'next/link';

export default function ComparisonSection() {
    return (
        <>
            {/* ── Zod deep-dive ─────────────────────────────────── */}
            <div className="why-box">
                <h2>@cleverbrush/schema vs Zod</h2>
                <p>
                    Zod is the industry standard for TypeScript schema
                    validation — battle-tested, widely supported, and
                    API-compatible with most ecosystem tooling.{' '}
                    <code>@cleverbrush/schema</code> was designed with Zod as a
                    reference point: the primitives and fluent builder style are
                    intentionally familiar so migration is incremental.
                </p>
                <p>
                    Where they differ is in areas Zod never tackled: typed
                    field-error selectors, runtime schema introspection, and a
                    first-class extension system.
                </p>
            </div>

            <div className="card">
                <h2>Key differences at a glance</h2>
                <div className="table-wrap">
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Capability</th>
                                <th>@cleverbrush/schema</th>
                                <th>Zod 3/4</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>TypeScript type inference</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>
                                    <code>InferType&lt;&gt;</code> vs{' '}
                                    <code>z.infer&lt;&gt;</code>
                                </td>
                            </tr>
                            <tr>
                                <td>Fluent / chainable API</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>Nearly identical call sites</td>
                            </tr>
                            <tr>
                                <td>Immutable schemas</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>
                                    Both return a new instance on every method
                                </td>
                            </tr>
                            <tr>
                                <td>Zero runtime dependencies</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>Both have no external deps</td>
                            </tr>
                            <tr>
                                <td>Bundle size (gzipped full)</td>
                                <td>~15 KB</td>
                                <td>~14 KB (v3) / ~6 KB (v4)</td>
                                <td>
                                    Tree-shakeable — single builder entry points
                                    as small as ~4 KB
                                </td>
                            </tr>
                            <tr>
                                <td>Validation speed (array of 100 objects)</td>
                                <td className="check">34 K ops/s</td>
                                <td>17 K ops/s</td>
                                <td>~2× faster in benchmarks</td>
                            </tr>
                            <tr>
                                <td>Standard Schema v1</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>
                                    Both work with TanStack Form, T3 Env, etc.
                                </td>
                            </tr>
                            <tr>
                                <td>Custom error messages</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>Identical capability</td>
                            </tr>
                            <tr>
                                <td>Default values</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>
                                    Identical: <code>.default(value)</code> or
                                    factory fn
                                </td>
                            </tr>
                            <tr>
                                <td>Branded types</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>Identical API</td>
                            </tr>
                            <tr>
                                <td>Readonly schemas</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>Identical API</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Typed field-error selectors</strong>
                                </td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td>
                                    <code>
                                        result.getErrorsFor(u =&gt; u.field)
                                    </code>{' '}
                                    — typos caught at compile time
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>
                                        Runtime schema introspection
                                    </strong>
                                </td>
                                <td className="check">✓</td>
                                <td className="partial">~</td>
                                <td>
                                    <code>.introspect()</code> returns a typed
                                    stable descriptor tree; Zod exposes
                                    internals via <code>._def</code> /{' '}
                                    <code>._zod.def</code> (undocumented,
                                    unstable API)
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>
                                        PropertyDescriptors / metadata
                                    </strong>
                                </td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td>
                                    Per-field labels, descriptions, metadata
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>JSDoc comment preservation</strong>
                                </td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td>
                                    Carry JSDoc through to form labels and JSON
                                    Schema
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Type-safe extension system</strong>
                                </td>
                                <td className="check">✓</td>
                                <td className="partial">limited</td>
                                <td>
                                    Add typed methods to builders; Zod only has{' '}
                                    <code>.refine()</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>
                                        extern() — Standard Schema interop
                                    </strong>
                                </td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td>
                                    Wrap any Standard Schema v1 library (incl.
                                    Zod) as a property
                                </td>
                            </tr>
                            <tr>
                                <td>Per-property error inspection</td>
                                <td className="check">✓</td>
                                <td className="partial">path-based</td>
                                <td>
                                    Zod uses string/index paths; cleverbrush
                                    uses typed lambda selectors
                                </td>
                            </tr>
                            <tr>
                                <td>Sync + async validation</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>Identical capability</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.tuple([...])</code>
                                </td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>
                                    Use <code>tuple([...])</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.record(key, value)</code>
                                </td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>
                                    Use <code>record(string(), value)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>z.map()</code> / <code>z.set()</code>
                                </td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td>
                                    Use <code>any().hasType(Map)</code> /{' '}
                                    <code>any().hasType(Set)</code> with
                                    preprocessors or custom validators
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p style={{ marginTop: '1rem' }}>
                    <Link
                        href="/migrating-from-zod"
                        className="playground-link"
                    >
                        ▶ Full Zod → @cleverbrush/schema migration guide
                    </Link>
                </p>
            </div>

            {/* ── vs Yup / Joi ──────────────────────────────────── */}
            <div className="card">
                <h2>Comparison with other validation libraries</h2>
                <p>
                    How does <code>@cleverbrush/schema</code> compare to broader
                    alternatives?
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
                                <td>Zero dependencies</td>
                                <td className="check">✓</td>
                                <td className="check">✓</td>
                                <td className="cross">✗</td>
                                <td className="cross">✗</td>
                            </tr>
                            <tr>
                                <td>Runtime introspection</td>
                                <td className="check">✓</td>
                                <td className="partial">~</td>
                                <td className="cross">✗</td>
                                <td className="partial">~</td>
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
        </>
    );
}
