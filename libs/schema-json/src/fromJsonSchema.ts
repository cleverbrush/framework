import type { SchemaBuilder } from '@cleverbrush/schema';
import {
    any,
    array,
    boolean,
    number,
    object,
    string,
    union
} from '@cleverbrush/schema';
import type { JsonSchemaNodeToBuilder } from './types.js';

// ---------------------------------------------------------------------------
// Private regex constants (same patterns as the built-in string extensions)
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IPV4_RE =
    /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

const IPV6_RE =
    /^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$|^::(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4}$|^(?:[0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}$|^(?:[0-9a-f]{1,4}:){1,5}(?::[0-9a-f]{1,4}){1,2}$|^(?:[0-9a-f]{1,4}:){1,4}(?::[0-9a-f]{1,4}){1,3}$|^(?:[0-9a-f]{1,4}:){1,3}(?::[0-9a-f]{1,4}){1,4}$|^(?:[0-9a-f]{1,4}:){1,2}(?::[0-9a-f]{1,4}){1,5}$|^[0-9a-f]{1,4}:(?::[0-9a-f]{1,4}){1,6}$|^::$/i;

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

    if ('enum' in node && Array.isArray(node['enum']))
        return buildEnum(node['enum']);
    if ('const' in node) return buildConst(node['const']);
    if ('anyOf' in node && Array.isArray(node['anyOf']))
        return buildAnyOf(node['anyOf']);
    if ('allOf' in node && Array.isArray(node['allOf']))
        return buildAnyOf(node['allOf']);
    if (!('type' in node)) return any();

    switch (node['type']) {
        case 'string':
            return buildString(node);
        case 'number':
            return buildNumber(node, false);
        case 'integer':
            return buildNumber(node, true);
        case 'boolean':
            return boolean();
        case 'null':
            return (any() as any).addValidator((v: unknown) =>
                v === null ? ok() : fail('must be null')
            );
        case 'array':
            return buildArray(node);
        case 'object':
            return buildObject(node);
        default:
            return any();
    }
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
        b = b.addValidator((v: unknown) =>
            typeof v === 'string' && EMAIL_RE.test(v)
                ? ok()
                : fail('must be a valid email address')
        );
    } else if (format === 'uuid') {
        b = b.addValidator((v: unknown) =>
            typeof v === 'string' && UUID_RE.test(v)
                ? ok()
                : fail('must be a valid UUID')
        );
    } else if (format === 'uri' || format === 'url') {
        b = b.addValidator((v: unknown) => {
            if (typeof v !== 'string') return fail('must be a valid URI');
            try {
                new URL(v);
                return ok();
            } catch {
                return fail('must be a valid URI');
            }
        });
    } else if (format === 'ipv4') {
        b = b.addValidator((v: unknown) =>
            typeof v === 'string' && IPV4_RE.test(v)
                ? ok()
                : fail('must be a valid IPv4 address')
        );
    } else if (format === 'ipv6') {
        b = b.addValidator((v: unknown) =>
            typeof v === 'string' && IPV6_RE.test(v)
                ? ok()
                : fail('must be a valid IPv6 address')
        );
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
    if (typeof node['pattern'] === 'string')
        b = b.matches(new RegExp(node['pattern']));
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
        const n = node['multipleOf'];
        b = b.addValidator((v: unknown) =>
            typeof v === 'number' &&
            Math.abs(v % n) < 1e-10 * Math.max(Math.abs(v), 1)
                ? ok()
                : fail(`must be a multiple of ${n}`)
        );
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
    if (node['additionalProperties'] === true) b = b.acceptUnknownProps();
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
 * | `anyOf` / `allOf`              | `union(…)` / `SchemaBuilder`    |
 * | `minLength` / `maxLength`      | `.minLength()` / `.maxLength()` |
 * | `pattern`                      | `.matches(regex)`               |
 * | `minimum` / `maximum`          | `.min()` / `.max()`             |
 * | `exclusiveMinimum` / `exclusiveMaximum` | `.min()` / `.max()` (exclusive) |
 * | `multipleOf`                   | `.divisibleBy()`                |
 * | `minItems` / `maxItems`        | `.minLength()` / `.maxLength()` |
 * | `format: 'email'`              | `.email()` extension            |
 * | `format: 'uuid'`               | `.uuid()` extension             |
 * | `format: 'uri'` / `'url'`      | `.url()` extension              |
 * | `format: 'ipv4'`               | `.ip({ version: 'v4' })`        |
 * | `format: 'ipv6'`               | `.ip({ version: 'v6' })`        |
 * | `format: 'date-time'`          | `.matches(iso8601 regex)`       |
 *
 * Keywords **not** supported: `$ref`, `$defs`, `if/then/else`,
 * `not`, `contains`, `unevaluatedProperties`, `contentEncoding`.
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
