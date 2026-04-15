import type { SchemaBuilder } from '@cleverbrush/schema';
import type { ToJsonSchemaOptions } from './types.js';

type Out = Record<string, unknown>;

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeJsonPointerSegment(s: string): string {
    return s.replace(/~/g, '~0').replace(/\//g, '~1');
}

type Resolver =
    | ((schema: SchemaBuilder<any, any, any>) => string | null)
    | undefined;

function convertNodeInner(
    schema: SchemaBuilder<any, any, any>,
    resolver: Resolver
): Out {
    const info = schema.introspect() as any;
    const ext: Record<string, unknown> = info.extensions ?? {};
    const readOnly: Out = info.isReadonly === true ? { readOnly: true } : {};

    switch (info.type) {
        case 'string': {
            if (info.equalsTo !== undefined)
                return { ...readOnly, const: info.equalsTo };
            const out: Out = { ...readOnly, type: 'string' };
            if (ext['email'] === true) {
                out['format'] = 'email';
            } else if (ext['uuid'] === true) {
                out['format'] = 'uuid';
            } else if (ext['url']) {
                out['format'] = 'uri';
            } else if (ext['ip']) {
                const ver =
                    typeof ext['ip'] === 'object'
                        ? (ext['ip'] as any).version
                        : undefined;
                if (ver === 'v4') out['format'] = 'ipv4';
                else if (ver === 'v6') out['format'] = 'ipv6';
                // both versions: no single standard JSON Schema format — omit
            }
            if (info.minLength !== undefined) out['minLength'] = info.minLength;
            if (info.maxLength !== undefined) out['maxLength'] = info.maxLength;
            // .nonempty() sets minLength via extension; if not already set
            if (ext['nonempty'] === true && out['minLength'] === undefined)
                out['minLength'] = 1;
            if (info.matches instanceof RegExp) {
                if (info.matches.flags !== '') {
                    throw new Error(
                        `Cannot convert RegExp /${info.matches.source}/${info.matches.flags} to JSON Schema pattern: RegExp flags are not representable in standard JSON Schema.`
                    );
                }
                out['pattern'] = info.matches.source;
            } else if (info.startsWith !== undefined) {
                out['pattern'] = `^${escapeRegex(info.startsWith)}`;
            } else if (info.endsWith !== undefined) {
                out['pattern'] = `${escapeRegex(info.endsWith)}$`;
            }
            if (Array.isArray(ext['oneOf']) && ext['oneOf'].length > 0)
                out['enum'] = [...(ext['oneOf'] as unknown[])];
            return out;
        }

        case 'number': {
            if (info.equalsTo !== undefined)
                return { ...readOnly, const: info.equalsTo };
            const out: Out = {
                ...readOnly,
                type: info.isInteger ? 'integer' : 'number'
            };
            if (info.min !== undefined) out['minimum'] = info.min;
            if (info.max !== undefined) out['maximum'] = info.max;
            if (ext['multipleOf'] !== undefined)
                out['multipleOf'] = ext['multipleOf'];
            if (ext['positive'] === true) out['exclusiveMinimum'] = 0;
            if (ext['negative'] === true) out['exclusiveMaximum'] = 0;
            if (Array.isArray(ext['oneOf']) && ext['oneOf'].length > 0)
                out['enum'] = [...(ext['oneOf'] as unknown[])];
            return out;
        }

        case 'boolean': {
            if (info.equalsTo !== undefined)
                return { ...readOnly, const: info.equalsTo };
            return { ...readOnly, type: 'boolean' };
        }

        case 'date':
            return { ...readOnly, type: 'string', format: 'date-time' };

        case 'array': {
            const out: Out = { ...readOnly, type: 'array' };
            if (info.elementSchema)
                out['items'] = convertNode(info.elementSchema, resolver);
            if (info.minLength !== undefined) out['minItems'] = info.minLength;
            if (info.maxLength !== undefined) out['maxItems'] = info.maxLength;
            if (ext['nonempty'] === true && out['minItems'] === undefined)
                out['minItems'] = 1;
            return out;
        }

        case 'tuple': {
            const elements: SchemaBuilder<any, any, any>[] =
                info.elements ?? [];
            const out: Out = {
                type: 'array',
                prefixItems: elements.map(e => convertNode(e, resolver)),
                minItems: elements.length
            };
            if (info.restSchema) {
                out['items'] = convertNode(info.restSchema, resolver);
            } else {
                out['items'] = false;
                out['maxItems'] = elements.length;
            }
            return out;
        }

        case 'object': {
            const out: Out = { ...readOnly, type: 'object' };
            const props = info.properties as
                | Record<string, SchemaBuilder<any, any, any>>
                | undefined;
            if (props) {
                const outProps: Record<string, unknown> = {};
                const required: string[] = [];
                for (const [key, propSchema] of Object.entries(props)) {
                    outProps[key] = convertNode(propSchema, resolver);
                    if ((propSchema.introspect() as any).isRequired !== false)
                        required.push(key);
                }
                out['properties'] = outProps;
                if (required.length > 0) out['required'] = required;
            }
            if (info.acceptUnknownProps === false)
                out['additionalProperties'] = false;
            return out;
        }

        case 'null':
            return { ...readOnly, type: 'null' };

        case 'union': {
            const options: SchemaBuilder<any, any, any>[] = info.options ?? [];
            const enumValues: unknown[] = [];
            let allConst = options.length > 0;
            for (const opt of options) {
                const oi = opt.introspect() as any;
                if (
                    (oi.type === 'string' ||
                        oi.type === 'number' ||
                        oi.type === 'boolean') &&
                    oi.equalsTo !== undefined
                ) {
                    enumValues.push(oi.equalsTo);
                } else {
                    allConst = false;
                    break;
                }
            }
            if (allConst) return { ...readOnly, enum: enumValues };

            const converted = options.map(o => convertNode(o, resolver));
            const out: Out = {
                ...readOnly,
                anyOf: converted
            };

            // Emit discriminator keyword for discriminated unions
            const discriminatorProp: string | undefined =
                info.discriminatorPropertyName;
            if (discriminatorProp) {
                const disc: Out = { propertyName: discriminatorProp };
                // Only emit mapping when every option resolved to a $ref
                // and every discriminator value can be populated.
                const mapping: Record<string, string> = {};
                let allRefsMapped = options.length > 0;
                for (let i = 0; i < options.length; i++) {
                    const ref = converted[i]['$ref'];
                    if (typeof ref !== 'string') {
                        allRefsMapped = false;
                        break;
                    }

                    const oi = options[i].introspect() as any;
                    const props:
                        | Record<string, SchemaBuilder<any, any, any>>
                        | undefined = oi.properties;
                    const discriminatorSchema = props?.[discriminatorProp];
                    if (!discriminatorSchema) {
                        allRefsMapped = false;
                        break;
                    }

                    const propInfo = discriminatorSchema.introspect() as any;
                    if (propInfo.equalsTo === undefined) {
                        allRefsMapped = false;
                        break;
                    }

                    mapping[String(propInfo.equalsTo)] = ref;
                }
                if (allRefsMapped) disc['mapping'] = mapping;
                out['discriminator'] = disc;
            }

            return out;
        }

        case 'lazy': {
            // Resolve the lazy schema once and delegate conversion.
            // If the resolved schema has a name registered in the nameResolver,
            // convertNode will short-circuit to a $ref — breaking recursive cycles.
            // Recursive schemas without a registered name will cause infinite
            // recursion here; callers must use .schemaName() to break the cycle.
            const resolved: SchemaBuilder<any, any, any> = info.getter();
            return convertNode(resolved, resolver);
        }

        default:
            return {};
    }
}

function convertNode(
    schema: SchemaBuilder<any, any, any>,
    resolver: Resolver
): Out {
    if (resolver) {
        const name = resolver(schema);
        if (typeof name === 'string' && name.length > 0) {
            return {
                $ref: `#/components/schemas/${escapeJsonPointerSegment(name)}`
            };
        }
    }
    const out = convertNodeInner(schema, resolver);
    const info = schema.introspect() as any;
    if (typeof info.description === 'string' && info.description !== '')
        out['description'] = info.description;

    // Emit default for serializable primitives (not factory functions)
    if (
        info.hasDefault === true &&
        info.defaultValue !== undefined &&
        typeof info.defaultValue !== 'function'
    ) {
        out['default'] = info.defaultValue;
    }

    // Handle nullable — JSON Schema 2020-12 style: type becomes an array
    if (info.isNullable === true) {
        if (out['anyOf'] !== undefined) {
            // Union type — add { type: 'null' } to anyOf if not already present
            const anyOf = out['anyOf'] as Out[];
            const hasNull = anyOf.some(o => o['type'] === 'null');
            if (!hasNull) anyOf.push({ type: 'null' });
        } else if (out['enum'] !== undefined) {
            // Enum — add null to enum values if not already present
            const enumValues = out['enum'] as unknown[];
            if (!enumValues.includes(null)) out['enum'] = [...enumValues, null];
        } else if (typeof out['type'] === 'string') {
            // Simple type — make it an array: ["string", "null"]
            out['type'] = [out['type'], 'null'];
        } else if (out['const'] !== undefined) {
            // Const value — convert to oneOf with null
            const constVal = out['const'];
            delete out['const'];
            out['anyOf'] = [{ const: constVal }, { type: 'null' }];
        }
    }

    return out;
}

/**
 * Converts a `@cleverbrush/schema` builder to a JSON Schema object.
 *
 * @remarks
 * **What round-trips cleanly**: all declarative constraints — type, format,
 * minLength/maxLength, minimum/maximum, multipleOf, pattern, required/optional
 * per property, additionalProperties, items, enum/const literals, anyOf/union.
 *
 * **What is silently omitted**:
 * - Custom validators added via `addValidator` (no JSON Schema equivalent)
 * - Preprocessors added via `addPreprocessor`
 * - JSDoc comments on schema properties
 * - `exclusiveMinimum`/`exclusiveMaximum` constraints from `fromJsonSchema`
 *   (stored as custom validators — not introspectable; only `positive()`/
 *   `negative()` extension-based exclusives are emitted)
 * - IP format with both v4 _and_ v6 allowed simultaneously (no single
 *   standard JSON Schema format covers both; the `format` keyword is omitted
 *   in that case)
 *
 * By default the output includes a `$schema` header for JSON Schema Draft
 * 2020-12. Pass `{ $schema: false }` when embedding the result in an OpenAPI
 * specification, or `{ draft: '07' }` for Draft 07 compatibility.
 *
 * @param schema - Any `@cleverbrush/schema` builder instance.
 * @param opts   - Optional output configuration (see {@link ToJsonSchemaOptions}).
 * @returns A plain JSON-serialisable object representing the schema.
 *
 * @example
 * ```ts
 * import { toJsonSchema } from '@cleverbrush/schema-json';
 * import { object, string, number } from '@cleverbrush/schema';
 *
 * const UserSchema = object({
 *   name:  string().minLength(1),
 *   email: string().email(),
 *   age:   number().optional(),
 * });
 *
 * const spec = toJsonSchema(UserSchema);
 * // {
 * //   "$schema": "https://json-schema.org/draft/2020-12/schema",
 * //   "type": "object",
 * //   "properties": {
 * //     "name":  { "type": "string", "minLength": 1 },
 * //     "email": { "type": "string", "format": "email" },
 * //     "age":   { "type": "number" }
 * //   },
 * //   "required": ["name", "email"]
 * // }
 * ```
 *
 * @example
 * ```ts
 * // Embed in an OpenAPI spec (strip the $schema header)
 * toJsonSchema(schema, { $schema: false });
 *
 * // Use JSON Schema Draft 07
 * toJsonSchema(schema, { draft: '07' });
 * ```
 */
export function toJsonSchema(
    schema: SchemaBuilder<any, any, any, any, any>,
    opts?: ToJsonSchemaOptions
): Record<string, unknown> {
    const body = convertNode(schema, opts?.nameResolver);
    if (opts?.$schema === false) return body;
    const draft = opts?.draft ?? '2020-12';
    const uri =
        draft === '07'
            ? 'http://json-schema.org/draft-07/schema#'
            : 'https://json-schema.org/draft/2020-12/schema';
    return { $schema: uri, ...body };
}
