import type { SchemaBuilder } from '@cleverbrush/schema';
import { assertJsonValue } from './json-validation.js';

type Schema = SchemaBuilder<any, any, any, any, any>;

/** @internal Whether an explicit object column stores a JSON document. */
export function isJsonColumn(schema: Schema | undefined): boolean {
    const info = schema?.introspect();
    return (
        info?.type === 'object' &&
        /^jsonb?$/i.test(String(info.extensions?.columnType))
    );
}

function validateExtras(schema: Schema, value: unknown): void {
    if (value === null || value === undefined) return;
    const info = schema.introspect() as any;
    if (
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
                if (!('value' in descriptor))
                    throw new TypeError(
                        'JSON properties must not be accessors'
                    );
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
 * @internal Validate object storage and extension data before binding JSON text.
 * Declared fields retain their existing serialization, including dates. Input
 * preprocessors and defaults are not replayed at the persistence boundary.
 */
export function encodeJsonColumn(
    schema: Schema | undefined,
    value: unknown
): unknown {
    if (!schema || !isJsonColumn(schema)) return value;
    const info = schema.introspect();
    if (value === undefined && !info.isRequired) return undefined;
    if (value === null && (info.isNullable || !info.isRequired)) return null;
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        (Object.getPrototypeOf(value) !== Object.prototype &&
            Object.getPrototypeOf(value) !== null)
    )
        throw new TypeError('Expected a JSON object document');
    validateExtras(schema, value);
    return JSON.stringify(value);
}

/** @internal Optional and nullable JSON object columns accept SQL NULL. */
export function isStorageNullable(info: {
    type: string;
    isRequired: boolean;
    isNullable: boolean;
    extensions?: Record<string, unknown>;
}): boolean {
    return (
        !info.isRequired ||
        (info.type === 'object' &&
            /^jsonb?$/i.test(String(info.extensions?.columnType)) &&
            info.isNullable)
    );
}
