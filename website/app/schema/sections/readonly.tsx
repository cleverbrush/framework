import { highlightTS } from '@/lib/highlight';

export default function ReadonlySection() {
    return (
        <>
            <div className="card">
                <h2>Readonly Modifier</h2>
                <a
                    href="/playground/readonly-modifier"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <p>
                    Every schema builder supports <code>.readonly()</code>. This
                    is a <strong>type-level-only</strong> modifier — it marks
                    the inferred TypeScript type as immutable, but does not
                    alter validation behaviour or freeze the validated value at
                    runtime.
                </p>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Builder</th>
                                <th>
                                    Effect on <code>InferType&lt;T&gt;</code>
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
                                    <code>push</code>, <code>pop</code>, etc. at
                                    the type level
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
                                    <code>number</code>, <code>boolean</code>{' '}
                                    are already immutable
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
                    <strong>shallow</strong> — only top-level object properties
                    or the array itself are marked readonly. For deeply nested
                    immutability, apply <code>.readonly()</code> at each level.
                </p>
            </div>
        </>
    );
}
