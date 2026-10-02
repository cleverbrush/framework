import { assertJsonValue, type SchemaBuilder } from '@cleverbrush/schema';

type Schema = SchemaBuilder<any, any, any, any, any>;

/** @internal Whether an explicit column stores a JSON document. */
export function isJsonColumn(schema: Schema | undefined): boolean {
    const info = schema?.introspect();
    return (
        !!info &&
        (typeof info.extensions?.jsonDocument === 'string' ||
            /^jsonb?$/i.test(String(info.extensions?.columnType)))
    );
}

function validateExtras(schema: Schema, value: unknown): void {
    if (value === null || value === undefined) return;
    const info = schema.introspect() as any;
    if (info.extensions?.jsonDocument) {
        assertJsonValue(value);
        schema.parse(value);
    } else if (
        info.type === 'object' &&
        typeof value === 'object' &&
        !Array.isArray(value)
    ) {
        for (const key of Reflect.ownKeys(value)) {
            const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
            const child =
                typeof key === 'string' && Object.hasOwn(info.properties, key)
                    ? info.properties[key]
                    : undefined;
            if (child) {
                if ('value' in descriptor)
                    validateExtras(child, descriptor.value);
            } else if (info.acceptUnknownProps) {
                if (
                    typeof key !== 'string' ||
                    !descriptor.enumerable ||
                    !('value' in descriptor)
                )
                    throw new TypeError(
                        'JSON extension properties must be enumerable string data properties'
                    );
                assertJsonValue(descriptor.value);
            }
        }
    } else if (
        info.type === 'array' &&
        Array.isArray(value) &&
        info.elementSchema
    ) {
        for (const item of value) validateExtras(info.elementSchema, item);
    }
}

/**
 * @internal Validate document contracts and bind JSON text explicitly. PostgreSQL
 * otherwise treats JS arrays as SQL arrays and strings as already encoded JSON.
 */
export function encodeJsonColumn(
    schema: Schema | undefined,
    value: unknown
): unknown {
    if (!schema || !isJsonColumn(schema)) return value;
    const info = schema.introspect();
    if (value === undefined && !info.isRequired) return undefined;
    if (info.extensions?.jsonDocument) {
        if (
            value === null &&
            info.isNullable &&
            info.extensions.jsonDocument === 'object'
        )
            return null;
        assertJsonValue(value);
        schema.parse(value);
    } else {
        if (value === null || value === undefined) return value;
        validateExtras(schema, value);
    }
    return JSON.stringify(value);
}

/** @internal SQL nullability for JSON documents; JSON null is a value, not SQL NULL. */
export function isStorageNullable(info: {
    isRequired: boolean;
    isNullable: boolean;
    extensions?: Record<string, unknown>;
}): boolean {
    return (
        !info.isRequired ||
        (info.extensions?.jsonDocument === 'object' && info.isNullable)
    );
}
