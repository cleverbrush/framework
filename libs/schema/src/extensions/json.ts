import { defineExtension, withExtensions } from '../extension.js';
import { defineMetadataMethod } from '../metadata-extension.js';

/** A value representable as JSON without implicit conversion. */
export type JsonValue =
    | null
    | boolean
    | number
    | string
    | JsonValue[]
    | JsonObject;
/** An open JSON object, including nested extension properties. */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Assert strict JSON without invoking getters or serialization hooks.
 * Shared references are allowed; cycles and lossy JavaScript values are not.
 */
export function assertJsonValue(value: unknown): asserts value is JsonValue {
    const ancestors = new Set<object>();
    const pending: { value: unknown; path: string; leave?: boolean }[] = [
        { value, path: '$' }
    ];
    while (pending.length) {
        const item = pending.pop()!;
        const current = item.value;
        if (item.leave) {
            ancestors.delete(current as object);
            continue;
        }
        if (
            current === null ||
            typeof current === 'string' ||
            typeof current === 'boolean' ||
            (typeof current === 'number' && Number.isFinite(current))
        )
            continue;
        const invalid = (reason: string): never => {
            throw new TypeError(`${item.path}: ${reason}`);
        };
        if (typeof current !== 'object' || current === null)
            invalid('Expected a JSON value');
        const object = current as object;
        if (ancestors.has(object)) invalid('Cyclic JSON value');
        const array = Array.isArray(object);
        if (
            !array &&
            Object.getPrototypeOf(object) !== Object.prototype &&
            Object.getPrototypeOf(object) !== null
        )
            invalid('Expected a plain JSON object');
        ancestors.add(object);
        pending.push({ value: object, path: item.path, leave: true });
        const keys = Reflect.ownKeys(object);
        if (array && keys.length !== (object as unknown[]).length + 1)
            invalid('Sparse arrays or extra array properties are not JSON');
        for (const key of keys) {
            if (array && key === 'length') continue;
            const descriptor = Object.getOwnPropertyDescriptor(object, key)!;
            if (
                typeof key !== 'string' ||
                !descriptor.enumerable ||
                !('value' in descriptor)
            )
                invalid('Only enumerable string data properties are JSON');
            if (
                array &&
                (!/^(0|[1-9]\d*)$/.test(String(key)) ||
                    Number(key) >= (object as unknown[]).length)
            )
                invalid('Extra array properties are not JSON');
            pending.push({
                value: descriptor.value,
                path: `${item.path}[${JSON.stringify(key)}]`
            });
        }
    }
}

/** @internal Strict JSON validation shared by database-enabled factories. */
export function jsonValidator(value: unknown) {
    try {
        assertJsonValue(value);
        return { valid: true, errors: [] };
    } catch (error) {
        return {
            valid: false,
            errors: [
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Invalid JSON value'
                }
            ]
        };
    }
}

/** JSON document metadata, composable with database or application extensions. */
export const jsonExtensions = defineExtension({
    any: {
        jsonDocument: defineMetadataMethod('jsonDocument').argument<
            'value' | 'object'
        >()
    }
});
const schemas = withExtensions(jsonExtensions);

/** Strict JSON of any kind; null is itself a JSON value. */
export function jsonValue() {
    return schemas
        .any()
        .hasType<JsonValue>()
        .nullable()
        .jsonDocument('value')
        .addValidator(jsonValidator);
}

/** Strict JSON whose root is an object; all JSON keys are preserved. */
export function jsonObject() {
    return schemas
        .any()
        .hasType<JsonObject>()
        .jsonDocument('object')
        .addValidator(value => {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return {
                    valid: false,
                    errors: [{ message: 'Expected a JSON object' }]
                };
            return jsonValidator(value);
        });
}
