import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function SchemaModifiersSection() {
    return (
        <>
            <div className="section-header">
                <h1>Schema Modifiers</h1>
                <p className="subtitle">
                    Modifiers augment a schema with metadata or behavior without
                    changing its core type. Every modifier returns a new
                    immutable builder instance.
                </p>
            </div>

            {/* ── Default Values ───────────────────────────────── */}
            <div className="card" id="default-values">
                <h2>Default Values</h2>
                <a
                    href="/playground/default-values"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <p>
                    Every schema builder supports <code>.default(value)</code>.
                    When the input is <code>undefined</code>, the default value
                    is used instead — and the result is still validated against
                    the schema&apos;s constraints.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
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
type Port = InferType<typeof Port>; // number

// Use factories for mutable values to avoid shared references
const Config = object({
  host: string().default('localhost'),
  port: number().default(8080),
  tags: array(string()).default(() => []),
  createdAt: date().default(() => new Date())
});`)
                        }}
                    />
                </pre>
                <p>
                    Default values are exposed via <code>.introspect()</code>:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const schema = string().default('hello');
const info = schema.introspect();
console.log(info.hasDefault);    // true
console.log(info.defaultValue);  // 'hello'`)
                        }}
                    />
                </pre>
            </div>

            {/* ── Catch / Fallback ─────────────────────────────── */}
            <div className="card" id="catch-fallback">
                <h2>Catch / Fallback</h2>
                <a href="/playground/catch-static" className="playground-link">
                    ▶ Open in Playground
                </a>
                <p>
                    Every schema builder supports <code>.catch(value)</code>.
                    When validation <strong>fails for any reason</strong> —
                    wrong type, constraint violation, missing required value —
                    the fallback is returned as a successful result instead of
                    errors.
                </p>
                <p>
                    Unlike <code>.default()</code>, which only fires when the
                    input is <code>undefined</code>, <code>.catch()</code> fires
                    on <strong>any</strong> validation failure. When{' '}
                    <code>.catch()</code> is set, <code>.validate()</code> will{' '}
                    <strong>never</strong> return an invalid result.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
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

// Factory for mutable fallback values
const Tags = array(string()).catch(() => []);
const r1 = Tags.validate(null);  // { valid: true, object: [] }
const r2 = Tags.validate(null);  // { valid: true, object: [] }
// r1.object !== r2.object  — a fresh [] each time

// Introspectable
const schema = string().catch('unknown');
console.log(schema.introspect().hasCatch);    // true
console.log(schema.introspect().catchValue);  // 'unknown'`)
                        }}
                    />
                </pre>
            </div>

            {/* ── Readonly ─────────────────────────────────────── */}
            <div className="card" id="readonly">
                <h2>Readonly</h2>
                <a
                    href="/playground/readonly-modifier"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <p>
                    <code>.readonly()</code> is a{' '}
                    <strong>type-level-only</strong> modifier — it marks the
                    inferred TypeScript type as immutable without altering
                    validation or freezing the value at runtime.
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
                                    <code>{'Readonly<{ … }>'}</code>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <code>array(…).readonly()</code>
                                </td>
                                <td>
                                    <code>{'ReadonlyArray<T>'}</code>
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
                                <td>Identity — already immutable</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, array, string, number, type InferType } from '@cleverbrush/schema';

const UserSchema = object({ name: string(), age: number() }).readonly();
type User = InferType<typeof UserSchema>;
// Readonly<{ name: string; age: number }>

const TagsSchema = array(string()).readonly();
type Tags = InferType<typeof TagsSchema>;
// ReadonlyArray<string>

console.log(UserSchema.introspect().isReadonly); // true`)
                        }}
                    />
                </pre>
                <p>
                    <strong>Note:</strong> <code>.readonly()</code> is{' '}
                    <strong>shallow</strong>. For deeply nested immutability,
                    apply it at each level.
                </p>
            </div>

            {/* ── Describe ─────────────────────────────────────── */}
            <div className="card" id="describe">
                <h2>Describe</h2>
                <a
                    href="/playground/describe-metadata"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <p>
                    <code>.describe(text)</code> attaches a human-readable
                    description as <strong>metadata only</strong> — no effect on
                    validation. The description is accessible via{' '}
                    <code>.introspect().description</code> and is automatically
                    emitted by <code>toJsonSchema()</code>.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';
import { toJsonSchema } from '@cleverbrush/schema-json';

const ProductSchema = object({
    id:    string().uuid().describe('Unique product identifier'),
    name:  string().nonempty().describe('Display name shown to customers'),
    price: number().positive().describe('Price in USD')
}).describe('A product in the catalogue');

// Read at runtime
console.log(ProductSchema.introspect().description);
// 'A product in the catalogue'

// toJsonSchema emits description fields automatically
const schema = toJsonSchema(ProductSchema, { $schema: false });
// { type: 'object', description: 'A product in the catalogue', properties: { … } }`)
                        }}
                    />
                </pre>
            </div>

            {/* ── schemaName ───────────────────────────────────── */}
            <div className="card" id="schema-name">
                <h2>schemaName</h2>
                <p>
                    <code>.schemaName(name)</code> attaches a component name for
                    OpenAPI tooling. When used with{' '}
                    <a
                        href="https://github.com/cleverbrush/framework/tree/master/libs/server-openapi"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <code>@cleverbrush/server-openapi</code>
                    </a>
                    , schemas with a name are automatically extracted into{' '}
                    <code>components/schemas</code> and referenced via{' '}
                    <code>$ref</code>.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, string, number } from '@cleverbrush/schema';

const UserSchema = object({
    id:   number(),
    name: string().nonempty(),
}).schemaName('User');

console.log(UserSchema.introspect().schemaName); // 'User'

// In the generated OpenAPI spec:
// { "$ref": "#/components/schemas/User" }`)
                        }}
                    />
                </pre>
            </div>

            {/* ── Promise Schemas ──────────────────────────────── */}
            <div className="card" id="promise-schema">
                <h2>Promise Schemas</h2>
                <p>
                    Use <code>promise()</code> to validate that a value is a
                    Promise (or any thenable). Pass an optional schema to
                    annotate the resolved value type.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: syntax highlight
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { promise, string, number, object, InferType } from '@cleverbrush/schema';

// Untyped — accepts any Promise
const schema = promise();
type Result = InferType<typeof schema>; // Promise<any>

// Typed — constrains the resolved value
const userPromise = promise(
    object({ id: number(), name: string() })
);
type UserPromise = InferType<typeof userPromise>;
// Promise<{ id: number; name: string }>

// Set/replace resolved type incrementally
const refined = promise()
    .hasResolvedType(number())
    .optional()
    .default(Promise.resolve(0));`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}
