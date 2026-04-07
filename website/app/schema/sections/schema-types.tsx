import { highlightTS } from '@/lib/highlight';

export default function SchemaTypesSection() {
    return (
        <>
            {/* ── Schema Types ─────────────────────────────────── */}
            <div className="card">
                <h2>Schema Types</h2>
                <a href="/playground/schema-types" className="playground-link">
                    ▶ Open in Playground
                </a>
                <p>
                    Every builder function returns an immutable schema instance
                    with a fluent API. Here are all available types:
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
                                    Accepts any value. Useful as a placeholder
                                    or for untyped fields.
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
                                    <code>.email()</code>, <code>.url()</code>,{' '}
                                    <code>.uuid()</code>, <code>.ip()</code>,{' '}
                                    <code>.trim()</code>,{' '}
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
                                    <code>.min(n)</code>, <code>.max(n)</code>,{' '}
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
                                    Date values. Validates that the input is a
                                    valid Date instance.
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
                                    Function values. Useful for callback props
                                    in component schemas.
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
                                    Object schemas with named properties. The
                                    core building block for complex types.
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
                                    Array of items matching the given element
                                    schema.
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
                                    Fixed-length array with per-position types.
                                    Each index is validated against its own
                                    schema — mirrors TypeScript tuple types.
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
                                    <code>record(keySchema, valueSchema)</code>
                                </td>
                                <td>
                                    Object with dynamic string keys — mirrors
                                    TypeScript&apos;s{' '}
                                    <code>Record&lt;K, V&gt;</code>. Every key
                                    must satisfy <code>keySchema</code> and
                                    every value must satisfy{' '}
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
                                    <code>.addValidator(fn)</code> validation
                                    result: <code>.getErrorsFor(key?)</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>union(...schemas)</code>
                                </td>
                                <td>
                                    Value must match one of the provided schemas
                                    (logical OR).
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
                                    comment threads, nested menus, and any type
                                    that references itself.
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
        </>
    );
}
