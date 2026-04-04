import type { SchemaBuilder } from '@cleverbrush/schema';
import {
    any,
    array,
    boolean,
    nul,
    number,
    object,
    string,
    union
} from '@cleverbrush/schema';
import type { JsonSchemaNodeToBuilder } from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function fail(msg: string) {
    return { valid: false as const, errors: [{ message: msg }] };
}

function ok() {
    return { valid: true as const, errors: [] };
}

function buildNode(s: unknown): SchemaBuilder<any, any, any> {
    if (typeof s !== 'object' || s === null) return any();
    const node = s as Record<string, unknown>;

    let b: SchemaBuilder<any, any, any>;

    if ('enum' in node && Array.isArray(node['enum']))
        b = buildEnum(node['enum']);
    else if ('const' in node) b = buildConst(node['const']);
    else if ('anyOf' in node && Array.isArray(node['anyOf']))
        b = buildAnyOf(node['anyOf']);
    // allOf is not supported (no intersection builder); fall back to any()
    else if ('allOf' in node && Array.isArray(node['allOf'])) b = any();
    else if (!('type' in node)) b = any();
    else {
        switch (node['type']) {
            case 'string':
                b = buildString(node);
                break;
            case 'number':
                b = buildNumber(node, false);
                break;
            case 'integer':
                b = buildNumber(node, true);
                break;
            case 'boolean':
                b = boolean();
                break;
            case 'null':
                b = nul();
                break;
            case 'array':
                b = buildArray(node);
                break;
            case 'object':
                b = buildObject(node);
                break;
            default:
                b = any();
        }
    }

    if (node['readOnly'] === true) b = (b as any).readonly();
    return b;
}

function buildConst(val: unknown): SchemaBuilder<any, any, any> {
    if (typeof val === 'string') return string(val as any);
    if (typeof val === 'number') return number(val as any);
    if (typeof val === 'boolean') return boolean().equals(val);
    return any();
}

function buildString(
    node: Record<string, unknown>
): SchemaBuilder<any, any, any> {
    let b: any = string();
    const format = node['format'] as string | undefined;

    if (format === 'email') {
        b = b.email();
    } else if (format === 'uuid') {
        b = b.uuid();
    } else if (format === 'uri' || format === 'url') {
        b = b.url();
    } else if (format === 'ipv4') {
        b = b.ip({ version: 'v4' });
    } else if (format === 'ipv6') {
        b = b.ip({ version: 'v6' });
    } else if (format === 'date-time') {
        b = b.addValidator((v: unknown) =>
            typeof v === 'string' && !Number.isNaN(Date.parse(v))
                ? ok()
                : fail('must be a valid date-time string')
        );
    }

    if (typeof node['minLength'] === 'number')
        b = b.minLength(node['minLength']);
    if (typeof node['maxLength'] === 'number')
        b = b.maxLength(node['maxLength']);
    if (typeof node['pattern'] === 'string') {
        try {
            b = b.matches(new RegExp(node['pattern']));
        } catch {
            // invalid regex pattern — silently ignore
        }
    }
    return b;
}

function buildNumber(
    node: Record<string, unknown>,
    integer: boolean
): SchemaBuilder<any, any, any> {
    let b: any = integer ? number().isInteger() : number().isFloat();
    if (typeof node['minimum'] === 'number') b = b.min(node['minimum']);
    if (typeof node['maximum'] === 'number') b = b.max(node['maximum']);
    if (typeof node['multipleOf'] === 'number') {
        b = b.multipleOf(node['multipleOf']);
    }
    if (typeof node['exclusiveMinimum'] === 'number') {
        const min = node['exclusiveMinimum'];
        b = b.addValidator((v: unknown) =>
            typeof v === 'number' && v > min
                ? ok()
                : fail(`must be greater than ${min}`)
        );
    }
    if (typeof node['exclusiveMaximum'] === 'number') {
        const max = node['exclusiveMaximum'];
        b = b.addValidator((v: unknown) =>
            typeof v === 'number' && v < max
                ? ok()
                : fail(`must be less than ${max}`)
        );
    }
    return b;
}

function buildArray(
    node: Record<string, unknown>
): SchemaBuilder<any, any, any> {
    let b: any = array();
    if (node['items'] !== undefined) b = b.of(buildNode(node['items']));
    if (typeof node['minItems'] === 'number') b = b.minLength(node['minItems']);
    if (typeof node['maxItems'] === 'number') b = b.maxLength(node['maxItems']);
    return b;
}

function buildObject(
    node: Record<string, unknown>
): SchemaBuilder<any, any, any> {
    const props = node['properties'] as Record<string, unknown> | undefined;
    const requiredSet = new Set<string>(
        Array.isArray(node['required']) ? (node['required'] as string[]) : []
    );
    let b: any = object();
    if (props) {
        for (const [key, propNode] of Object.entries(props)) {
            const propBuilder = buildNode(propNode);
            b = b.addProp(
                key,
                requiredSet.has(key)
                    ? propBuilder.required()
                    : propBuilder.optional()
            );
        }
    }
    if (node['additionalProperties'] !== false) b = b.acceptUnknownProps();
    return b;
}

function buildEnum(values: unknown[]): SchemaBuilder<any, any, any> {
    if (values.length === 0) return any();
    const [first, ...rest] = values;
    let b: any = union(buildConst(first));
    for (const v of rest) b = b.or(buildConst(v));
    return b;
}

function buildAnyOf(options: unknown[]): SchemaBuilder<any, any, any> {
    if (options.length === 0) return any();
    const [first, ...rest] = options;
    let b: any = union(buildNode(first));
    for (const opt of rest) b = b.or(buildNode(opt));
    return b;
}

/**
 * Converts a JSON Schema object into a `@cleverbrush/schema` builder.
 *
 * @remarks
 * **`as const` is required for precise TypeScript inference.**  Without it
 * TypeScript widens string literals to `string` and the inferred builder
 * type collapses to `SchemaBuilder<unknown>`. Always pass the schema literal
 * (or the variable holding it) with `as const`.
 *
 * **Supported JSON Schema keywords**
 *
 * | Keyword                        | Builder equivalent              |
 * | ------------------------------ | ------------------------------- |
 * | `type: 'string'`               | `string()`                      |
 * | `type: 'number'`               | `number()`                      |
 * | `type: 'integer'`              | `number()` (integer flag)       |
 * | `type: 'boolean'`              | `boolean()`                     |
 * | `type: 'null'`                 | `SchemaBuilder<null>`           |
 * | `type: 'array'` + `items`      | `array(itemBuilder)`            |
 * | `type: 'object'` + `properties`| `object({ … })`                 |
 * | `required: […]`                | required / optional per-prop    |
 * | `additionalProperties: true`   | `.acceptUnknownProps()`         |
 * | `const`                        | `string/number/boolean eq`      |
 * | `enum`                         | `union(…)`                      |
 * | `anyOf`                        | `union(…)`                      |
 * | `minLength` / `maxLength`      | `.minLength()` / `.maxLength()` |
 * | `pattern`                      | `.matches(regex)` (invalid patterns silently ignored) |
 * | `minimum` / `maximum`          | `.min()` / `.max()`             |
 * | `exclusiveMinimum` / `exclusiveMaximum` | custom validator (not round-trippable via `toJsonSchema`) |
 * | `multipleOf`                   | `.multipleOf()`                 |
 * | `minItems` / `maxItems`        | `.minLength()` / `.maxLength()` |
 * | `format: 'email'`              | `.email()` extension            |
 * | `format: 'uuid'`               | `.uuid()` extension             |
 * | `format: 'uri'` / `'url'`      | `.url()` extension              |
 * | `format: 'ipv4'`               | `.ip({ version: 'v4' })`        |
 * | `format: 'ipv6'`               | `.ip({ version: 'v6' })`        |
 * | `format: 'date-time'`          | `.matches(iso8601 regex)`       |
 *
 * Keywords **not** supported: `allOf` (falls back to `any()`), `$ref`,
 * `$defs`, `if/then/else`, `not`, `contains`, `unevaluatedProperties`,
 * `contentEncoding`.
 *
 * @param schema - A JSON Schema literal.  Pass with `as const` for precise
 *   TypeScript type inference on the returned builder.
 * @returns A `@cleverbrush/schema` builder whose static type mirrors the
 *   structure described by the JSON Schema node.
 *
 * @example
 * ```ts
 * import { fromJsonSchema } from '@cleverbrush/schema-json';
 *
 * const schema = fromJsonSchema({
 *   type: 'object',
 *   properties: {
 *     name:  { type: 'string', minLength: 1 },
 *     score: { type: 'number', minimum: 0, maximum: 100 },
 *   },
 *   required: ['name'],
 * } as const);
 *
 * schema.parse({ name: 'Alice', score: 95 });
 * // TypeScript infers: { name: string; score?: number }
 * ```
 *
 * @example
 * ```ts
 * // Union types via `enum`
 * const statusSchema = fromJsonSchema({
 *   enum: ['active', 'inactive', 'pending']
 * } as const);
 *
 * statusSchema.parse('active'); // valid — 'active' | 'inactive' | 'pending'
 * ```
 *
 * @example
 * ```ts
 * // Use InferFromJsonSchema to derive the TypeScript type statically
 * import type { InferFromJsonSchema } from '@cleverbrush/schema-json';
 *
 * const S = { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] } as const;
 * type Payload = InferFromJsonSchema<typeof S>; // { id: number }
 * const payloadSchema = fromJsonSchema(S);
 * ```
 */
export function fromJsonSchema<const S>(schema: S): JsonSchemaNodeToBuilder<S> {
    return buildNode(schema) as JsonSchemaNodeToBuilder<S>;
}
