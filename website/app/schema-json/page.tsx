import { InstallBanner } from '@/app/InstallBanner';
import { highlightTS } from '@/lib/highlight';

export default function SchemaJsonPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>@cleverbrush/schema-json</h1>
                    <p className="subtitle">
                        Bidirectional JSON Schema (Draft 7 / 2020-12) interop —
                        convert existing JSON Schemas to fully-typed{' '}
                        <code>@cleverbrush/schema</code> builders and back.
                    </p>
                </div>

                {/* ── Installation ─────────────────────────────────── */}
                <InstallBanner
                    commands={[
                        {
                            command: 'npm install @cleverbrush/schema-json',
                            label: '@cleverbrush/schema-json'
                        },
                        {
                            command: 'npm install @cleverbrush/schema',
                            label: 'peer dependency'
                        }
                    ]}
                />

                {/* ── What it does ─────────────────────────────────── */}
                <div className="why-box">
                    <h2>💡 What it does</h2>

                    <h3>JSON Schema → typed builder</h3>
                    <p>
                        Pass any JSON Schema literal to{' '}
                        <code>fromJsonSchema()</code> and get back a{' '}
                        <code>@cleverbrush/schema</code> builder whose
                        TypeScript type exactly mirrors the schema structure —
                        required vs optional properties, literal types from{' '}
                        <code>const</code> and <code>enum</code>, nested objects
                        and arrays, all inferred at compile time. No code
                        generation, no extra build step.
                    </p>

                    <h3>Builder → JSON Schema</h3>
                    <p>
                        Pass any <code>@cleverbrush/schema</code> builder to{' '}
                        <code>toJsonSchema()</code> and get a plain JSON Schema
                        object. Use it in OpenAPI specs, form generators, or any
                        JSON Schema consumer. All declarative constraints
                        (formats, min/max, patterns, enums) round-trip cleanly.
                    </p>

                    <h3>When to use this library</h3>
                    <ul>
                        <li>
                            <strong>Consuming external APIs</strong> — you have
                            a JSON Schema from an OpenAPI spec or third-party
                            service and want to validate data with full
                            TypeScript inference.
                        </li>
                        <li>
                            <strong>OpenAPI round-trip</strong> — generate JSON
                            Schemas from your validators to embed in API specs.
                        </li>
                        <li>
                            <strong>Incremental migration</strong> — convert an
                            existing JSON Schema catalogue to{' '}
                            <code>@cleverbrush/schema</code> builders one step
                            at a time.
                        </li>
                    </ul>
                </div>

                {/* ── fromJsonSchema ───────────────────────────────── */}
                <div className="card">
                    <h2>
                        <code>fromJsonSchema(schema)</code>
                    </h2>
                    <p>
                        Converts a JSON Schema literal to a{' '}
                        <code>@cleverbrush/schema</code> builder. Pass the
                        schema with{' '}
                        <strong>
                            <code>as const</code>
                        </strong>{' '}
                        — this is required for TypeScript to infer precise
                        builder and value types.
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    `import { fromJsonSchema } from '@cleverbrush/schema-json';
import type { InferFromJsonSchema } from '@cleverbrush/schema-json';

// Define the JSON Schema once — use as const for precise inference
const UserJsonSchema = {
  type: 'object',
  properties: {
    id:    { type: 'string', format: 'uuid' },
    name:  { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    age:   { type: 'integer', minimum: 0 },
    role:  { enum: ['admin', 'user', 'guest'] },
  },
  required: ['id', 'name', 'email'],
} as const;

// TypeScript infers the value type from the JSON Schema — no duplication!
type User = InferFromJsonSchema<typeof UserJsonSchema>;
// {
//   id: string;
//   name: string;
//   email: string;
//   age?: number;
//   role?: 'admin' | 'user' | 'guest';
// }

const UserSchema = fromJsonSchema(UserJsonSchema);

// Validate data — result.object is fully typed as User
const result = UserSchema.validate({
  id: 'a1b2c3d4-e5f6-1234-8abc-000000000001',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
});`
                                )
                            }}
                        />
                    </pre>

                    <h3>Supported JSON Schema keywords</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Keyword</th>
                                    <th>Builder equivalent</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>type: &apos;string&apos;</code>
                                    </td>
                                    <td>
                                        <code>string()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>type: &apos;number&apos;</code>
                                    </td>
                                    <td>
                                        <code>number()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>type: &apos;integer&apos;</code>
                                    </td>
                                    <td>
                                        <code>number()</code> with integer flag
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>type: &apos;boolean&apos;</code>
                                    </td>
                                    <td>
                                        <code>boolean()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>type: &apos;array&apos;</code> +{' '}
                                        <code>items</code>
                                    </td>
                                    <td>
                                        <code>array(itemBuilder)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>type: &apos;object&apos;</code> +{' '}
                                        <code>properties</code>
                                    </td>
                                    <td>
                                        <code>{'object({ … })'}</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>required: […]</code>
                                    </td>
                                    <td>required / optional per property</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>additionalProperties: true</code>
                                    </td>
                                    <td>
                                        <code>.acceptUnknownProps()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>const</code>
                                    </td>
                                    <td>literal builder</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>enum</code>
                                    </td>
                                    <td>
                                        <code>union(…)</code> of const builders
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>anyOf</code> / <code>allOf</code>
                                    </td>
                                    <td>
                                        <code>union(…)</code> / fallback
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>discriminator</code>
                                    </td>
                                    <td>
                                        auto-emitted for discriminated{' '}
                                        <code>union()</code> branches
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>minLength</code> /{' '}
                                        <code>maxLength</code>
                                    </td>
                                    <td>
                                        <code>.minLength()</code> /{' '}
                                        <code>.maxLength()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>pattern</code>
                                    </td>
                                    <td>
                                        <code>.matches(regex)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>minimum</code> /{' '}
                                        <code>maximum</code>
                                    </td>
                                    <td>
                                        <code>.min()</code> /{' '}
                                        <code>.max()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>exclusiveMinimum</code> /{' '}
                                        <code>exclusiveMaximum</code>
                                    </td>
                                    <td>
                                        <code>.min()</code> /{' '}
                                        <code>.max()</code> exclusive
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>multipleOf</code>
                                    </td>
                                    <td>
                                        <code>number().multipleOf(n)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>minItems</code> /{' '}
                                        <code>maxItems</code>
                                    </td>
                                    <td>
                                        <code>.minLength()</code> /{' '}
                                        <code>.maxLength()</code> on array
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>format: &apos;email&apos;</code>
                                    </td>
                                    <td>
                                        <code>.email()</code> extension
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>format: &apos;uuid&apos;</code>
                                    </td>
                                    <td>
                                        <code>.uuid()</code> extension
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>format: &apos;uri&apos;</code> /{' '}
                                        <code>&apos;url&apos;</code>
                                    </td>
                                    <td>
                                        <code>.url()</code> extension
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>format: &apos;ipv4&apos;</code>
                                    </td>
                                    <td>
                                        <code>.ip({"{ version: 'v4' }"})</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>format: &apos;ipv6&apos;</code>
                                    </td>
                                    <td>
                                        <code>.ip({"{ version: 'v6' }"})</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>
                                            format: &apos;date-time&apos;
                                        </code>
                                    </td>
                                    <td>
                                        <code>.matches(iso8601 regex)</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>readOnly: true</code>
                                    </td>
                                    <td>
                                        <code>.readonly()</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>description</code>
                                    </td>
                                    <td>
                                        <code>.describe(text)</code>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── toJsonSchema ─────────────────────────────────── */}
                <div className="card">
                    <h2>
                        <code>toJsonSchema(schema, opts?)</code>
                    </h2>
                    <p>
                        Converts any <code>@cleverbrush/schema</code> builder to
                        a JSON Schema object. Declarative constraints (formats,
                        min/max, patterns, enum/const literals,
                        required/optional per property) round-trip cleanly.
                        Descriptions set via <code>.describe(text)</code> are
                        emitted as the <code>description</code> field on the
                        corresponding JSON Schema node.
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    `import { toJsonSchema } from '@cleverbrush/schema-json';
import { object, string, number, array } from '@cleverbrush/schema';

const ProductSchema = object({
  sku:   string().uuid(),
  name:  string().minLength(1).maxLength(255),
  price: number().min(0),
  tags:  array(string()).optional(),
});

// Default: JSON Schema Draft 2020-12 with $schema header
const spec = toJsonSchema(ProductSchema);
// {
//   "$schema": "https://json-schema.org/draft/2020-12/schema",
//   "type": "object",
//   "properties": {
//     "sku":   { "type": "string", "format": "uuid" },
//     "name":  { "type": "string", "minLength": 1, "maxLength": 255 },
//     "price": { "type": "number", "minimum": 0 },
//     "tags":  { "type": "array", "items": { "type": "string" } }
//   },
//   "required": ["sku", "name", "price"]
// }

// Embed in an OpenAPI spec (suppress $schema header)
const openApiSchema = toJsonSchema(ProductSchema, { $schema: false });

// Use Draft 07 format
const draft7Schema = toJsonSchema(ProductSchema, { draft: '07' });

// Use nameResolver to emit $ref pointers for named component schemas
// (used internally by @cleverbrush/server-openapi — see SchemaRegistry)
const registry = new Map([['Product', ProductSchema]]);
const withRefs = toJsonSchema(ProductSchema, {
    $schema: false,
    nameResolver: (schema) => {
        for (const [name, s] of registry) {
            if (s === schema) return name;
        }
        return null;
    },
});
// Instead of inlining, nodes matching a registry entry become:
// { "$ref": "#/components/schemas/Product" }`
                                )
                            }}
                        />
                    </pre>
                </div>

                {/* ── TypeScript inference ─────────────────────────── */}
                <div className="why-box">
                    <h2>🔷 TypeScript inference utilities</h2>

                    <h3>
                        <code>InferFromJsonSchema&lt;S&gt;</code>
                    </h3>
                    <p>
                        Derives the TypeScript value type from a
                        statically-known JSON Schema — purely at the type level,
                        no runtime call needed.
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    `import type { InferFromJsonSchema } from '@cleverbrush/schema-json';

const S = {
  type: 'object',
  properties: {
    id:   { type: 'integer' },
    name: { type: 'string' },
  },
  required: ['id'],
} as const;

type Item = InferFromJsonSchema<typeof S>;
// { id: number; name?: string }`
                                )
                            }}
                        />
                    </pre>

                    <h3>
                        <code>JsonSchemaNodeToBuilder&lt;S&gt;</code>
                    </h3>
                    <p>
                        Maps a statically-known JSON Schema node to the exact{' '}
                        <code>@cleverbrush/schema</code> builder type. Use this
                        when you want the builder type without calling{' '}
                        <code>fromJsonSchema</code> at runtime.
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    `import type { JsonSchemaNodeToBuilder } from '@cleverbrush/schema-json';

const S = { type: 'string', format: 'email' } as const;
type B = JsonSchemaNodeToBuilder<typeof S>;
// StringSchemaBuilder<string, true>`
                                )
                            }}
                        />
                    </pre>
                </div>

                {/* ── Limitations ──────────────────────────────────── */}
                <div className="card">
                    <h2>Limitations</h2>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Limitation</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        Custom validators (
                                        <code>addValidator</code>)
                                    </td>
                                    <td>
                                        Not representable in JSON Schema —
                                        omitted in <code>toJsonSchema</code>{' '}
                                        output; not recoverable by{' '}
                                        <code>fromJsonSchema</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>$ref</code> / <code>$defs</code>
                                    </td>
                                    <td>
                                        Not supported in{' '}
                                        <code>fromJsonSchema</code>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>if</code> / <code>then</code> /{' '}
                                        <code>else</code>, <code>not</code>
                                    </td>
                                    <td>Not supported</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>allOf</code> in{' '}
                                        <code>fromJsonSchema</code>
                                    </td>
                                    <td>
                                        Falls back to{' '}
                                        <code>
                                            SchemaBuilder&lt;unknown&gt;
                                        </code>{' '}
                                        (no deep schema merge)
                                    </td>
                                </tr>
                                <tr>
                                    <td>Dual IP format (both v4 + v6)</td>
                                    <td>
                                        <code>format</code> omitted in{' '}
                                        <code>toJsonSchema</code> output; no
                                        single JSON Schema keyword covers both
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>nameResolver</code> +{' '}
                                        <code>$ref</code> round-trip
                                    </td>
                                    <td>
                                        <code>nameResolver</code> emits{' '}
                                        <code>$ref</code> pointers based on an
                                        external registry;{' '}
                                        <code>fromJsonSchema</code> does not
                                        resolve <code>$ref</code> — they fall
                                        back to <code>any()</code>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
