import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function ParseStringSection() {
    return (
        <>
            <div className="card">
                <h2>Parse String Schemas</h2>
                <a
                    href="/playground/parse-string-basic"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <p>
                    Use <code>parseString(objectSchema, templateFn)</code> to
                    validate a string against a template pattern and parse it
                    into a strongly-typed object. The template expression uses a
                    tagged-template syntax with type-safe property selectors —
                    you get full IntelliSense in the selector lambdas.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: static content
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { parseString, object, string, number, type InferType } from '@cleverbrush/schema';

const RouteSchema = parseString(
    object({ userId: string().uuid(), id: number().coerce() }),
    $t => $t\`/orders/\${t => t.id}/\${t => t.userId}\`
);

type Route = InferType<typeof RouteSchema>;
// { userId: string; id: number }

const result = RouteSchema.validate('/orders/42/550e8400-e29b-41d4-a716-446655440000');
// result.valid === true
// result.object === { id: 42, userId: '550e8400-...' }`)
                        }}
                    />
                </pre>

                <h3>Nested Objects</h3>
                <p>
                    Navigate deep properties via{' '}
                    <code>{'t => t.parent.child'}</code>. The builder
                    automatically constructs the nested result object:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: static content
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const schema = parseString(
    object({
        order: object({ id: number().coerce() }),
        user:  object({ name: string() })
    }),
    $t => $t\`/orders/\${t => t.order.id}/by/\${t => t.user.name}\`
);
// InferType → { order: { id: number }; user: { name: string } }

schema.validate('/orders/42/by/Alice');
// { valid: true, object: { order: { id: 42 }, user: { name: 'Alice' } } }`)
                        }}
                    />
                </pre>

                <h3>Coercion</h3>
                <p>
                    Captured segments are always strings. Property schemas
                    handle their own coercion — use <code>.coerce()</code> on{' '}
                    <code>number()</code>, <code>boolean()</code>, or{' '}
                    <code>date()</code> to convert from strings:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: static content
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const LogEntry = parseString(
    object({
        level:   string(),
        ts:      date().coerce(),
        message: string()
    }),
    $t => $t\`[\${t => t.level}] \${t => t.ts} \${t => t.message}\`
);`)
                        }}
                    />
                </pre>

                <h3>Error Messages</h3>
                <p>
                    Errors include the property path for easy debugging. Use{' '}
                    <code>{'{ doNotStopOnFirstError: true }'}</code> to collect
                    all segment errors at once:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: static content
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const result = RouteSchema.validate('/orders/abc/bad-uuid');
// result.errors[0].message → "id: expected an integer number"`)
                        }}
                    />
                </pre>

                <h3>Fluent Methods</h3>
                <p>All standard modifiers work and preserve type inference:</p>
                <div className="table-wrap">
                    <table className="api-table">
                        <thead>
                            <tr>
                                <th>Method</th>
                                <th>Effect</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <code>.optional()</code>
                                </td>
                                <td>
                                    Accepts <code>undefined</code> and{' '}
                                    <code>null</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.nullable()</code>
                                </td>
                                <td>
                                    Accepts <code>null</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.default(value)</code>
                                </td>
                                <td>
                                    Falls back to value when{' '}
                                    <code>undefined</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.brand(name)</code>
                                </td>
                                <td>Adds a type-level brand</td>
                            </tr>
                            <tr>
                                <td>
                                    <code>.readonly()</code>
                                </td>
                                <td>
                                    Marks result as <code>{'Readonly<T>'}</code>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h2>Coercion</h2>
                <a
                    href="/playground/coerce-methods"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <p>
                    The <code>number()</code>, <code>boolean()</code>, and{' '}
                    <code>date()</code> builders each have a{' '}
                    <code>.coerce()</code> method that adds a preprocessor to
                    convert string values to the target type. This is especially
                    useful with parse-string schemas, but also works standalone
                    for URL parameters, form inputs, or any other string source.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: static content
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { number, boolean, date } from '@cleverbrush/schema';

// number().coerce() — uses Number(value)
number().coerce().validate('42');    // { valid: true, object: 42 }
number().coerce().validate('hello'); // { valid: false } — NaN fails

// boolean().coerce() — "true" → true, "false" → false
boolean().coerce().validate('true');  // { valid: true, object: true }
boolean().coerce().validate('yes');   // { valid: false } — unrecognized

// date().coerce() — new Date(value) if valid
date().coerce().validate('2024-01-15'); // { valid: true, object: Date }
date().coerce().validate('nope');       // { valid: false } — invalid date`)
                        }}
                    />
                </pre>
                <p>
                    Non-string values pass through unchanged, so{' '}
                    <code>.coerce()</code> is safe to chain even when the input
                    might already be the correct type. All three methods return
                    a new immutable schema instance.
                </p>
            </div>
        </>
    );
}
