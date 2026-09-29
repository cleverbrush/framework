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
                <h3>Optional and nullable fallbacks</h3>
                <p>
                    Fallback values and factories respect the resolved output
                    type: optional schemas allow <code>undefined</code>, and
                    nullable schemas allow <code>null</code>.
                </p>
                <pre>
                    <code>{`const text = string().optional().catch(undefined);
const nullableText = string().nullable().catch(() => null);

text.parse(42); // undefined
nullableText.parse(42); // null
array(text).parse(['ok', 42]); // ['ok', undefined] — no entries dropped`}</code>
                </pre>
                <p>
                    Fallbacks are opt-in. A property fallback does not make a
                    malformed required root object valid, and a fallback factory
                    runs only when validation fails.
                </p>
                <p>
                    Legacy optional schemas accept <code>null</code> at runtime
                    even when their inferred type omits it. A fallback does not
                    replace a value that passed validation, so normalize null
                    explicitly when your application requires undefined:
                </p>
                <pre>
                    <code>{`const normalizedText = string().optional()
    .addPreprocessor(value => value == null ? undefined : value)
    .catch(undefined);

normalizedText.parse(null); // undefined`}</code>
                </pre>
                <p>
                    Preprocessors may return optional/nullable values, including
                    asynchronously. Their callback parameter types do not
                    guarantee that unknown input already has that type; guard
                    untrusted values before using type-specific methods. Use{' '}
                    <code>parseAsync</code> / <code>validateAsync</code> for
                    async callbacks. Existing <code>InferType</code> and{' '}
                    <code>hasType</code> behavior is unchanged; static overrides
                    do not convert or validate runtime values.
                </p>
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
                        <caption className="visually-hidden">
                            API reference table
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">Builder</th>
                                <th scope="col">
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
                <h3>Reuse the definition with ordinary modifiers</h3>
                <pre>
                    <code>{`const History = object({
    current: UserSchema,
    previous: UserSchema.optional().nullable().describe('Previous user')
});
// One User component, with local annotations and nullability for previous.`}</code>
                </pre>
                <p>
                    No wrapper is needed. The original remains unchanged, and
                    concrete builder methods, extensions, inference and nested
                    property selectors are preserved. Modifier chains reference
                    the original definition, not another alias.
                </p>
                <ul>
                    <li>
                        Presence/nullability: <code>optional</code>,{' '}
                        <code>required</code>, <code>nullable</code>,{' '}
                        <code>notNullable</code>.
                    </li>
                    <li>
                        Annotations: <code>describe</code>, <code>example</code>
                        , <code>readonly</code>.
                    </li>
                    <li>
                        Type-only changes: <code>brand</code>,{' '}
                        <code>hasType</code>, <code>clearHasType</code>,{' '}
                        <code>optimize</code>.
                    </li>
                </ul>
                <h3>Shape and rule changes become unnamed</h3>
                <p>
                    Property edits, partial/pick/omit, constraints, validators,
                    preprocessors, defaults, fallbacks and their available clear
                    methods discard inherited names. Extension changes detach
                    conservatively too. Later annotations or optionality do not
                    reconnect the derivative; existing nested named children
                    still reuse their own definitions.
                </p>
                <pre>
                    <code>{`const PatchUser = UserSchema.partial(); // unnamed
const UserWithEmail = UserSchema.addProp('email', string()); // unnamed
const PublicUser = UserSchema.omit('id').schemaName('PublicUser');
const ShortName = string().schemaName('Name').maxLength(20); // unnamed`}</code>
                </pre>
                <p>
                    Apply <code>schemaName</code> after shape/rule edits when
                    the result needs a stable component name. Code that
                    previously relied on edits retaining an inherited name
                    should name the final result explicitly.
                </p>
                <p>
                    Explicit naming always creates an independent definition,
                    even on an alias. Independent definitions sharing a name
                    still conflict, including identical shapes; use-site
                    modifiers of the same definition do not.
                </p>
                <p>
                    Canonical-reference metadata affects exporters, not runtime
                    validation. Defaults and fallbacks follow ordinary builder
                    semantics; <code>clearDefault()</code> removes the default
                    completely without revealing a hidden canonical default.
                    JSON Schema, OpenAPI and AsyncAPI keep one canonical
                    definition with local annotations and nullability.
                </p>
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
