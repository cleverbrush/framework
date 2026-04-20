/**
 * Options for the safe serializer.
 */
export interface SerializationOptions {
    /** Maximum nesting depth for objects/arrays. @default 10 */
    maxDepth?: number;
    /** Maximum length for string values before truncation. @default 32768 */
    maxStringLength?: number;
}

const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_MAX_STRING_LENGTH = 32_768;

/**
 * Safely serializes a value for structured logging, handling:
 * - Circular references → `"[Circular]"`
 * - Depth limits → `"[Object]"` or `"[Array]"`
 * - BigInt → string representation
 * - Buffer → `"[Buffer(N bytes)]"`
 * - Functions → `"[Function: name]"`
 * - Symbols → `"[Symbol: description]"`
 * - Error objects → `{ message, stack, name, ...ownProperties }`
 * - Long strings → truncated with `"...(truncated)"`
 *
 * @param value - the value to serialize
 * @param options - serialization limits
 * @returns a JSON-safe representation of the value
 */
export function safeSerialize(
    value: unknown,
    options?: SerializationOptions
): unknown {
    const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
    const maxStringLength =
        options?.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;
    const seen = new Set<object>();

    return serialize(value, 0);

    function serialize(val: unknown, depth: number): unknown {
        if (val === null || val === undefined) {
            return val;
        }

        switch (typeof val) {
            case 'string':
                if (val.length > maxStringLength) {
                    return val.slice(0, maxStringLength) + '...(truncated)';
                }
                return val;

            case 'number':
            case 'boolean':
                return val;

            case 'bigint':
                return val.toString();

            case 'symbol':
                return `[Symbol: ${val.description ?? ''}]`;

            case 'function':
                return `[Function: ${val.name || 'anonymous'}]`;

            case 'object':
                return serializeObject(val as object, depth);

            default:
                return String(val);
        }
    }

    function serializeObject(obj: object, depth: number): unknown {
        // Buffer check
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) {
            return `[Buffer(${obj.length} bytes)]`;
        }

        // Error objects — extract structured data
        if (obj instanceof Error) {
            const result: Record<string, unknown> = {
                name: obj.name,
                message: obj.message,
                stack: obj.stack
            };
            for (const key of Object.getOwnPropertyNames(obj)) {
                if (key !== 'name' && key !== 'message' && key !== 'stack') {
                    result[key] = serialize((obj as any)[key], depth + 1);
                }
            }
            return result;
        }

        // Circular reference check
        if (seen.has(obj)) {
            return '[Circular]';
        }

        // Depth limit
        if (depth >= maxDepth) {
            return Array.isArray(obj) ? '[Array]' : '[Object]';
        }

        seen.add(obj);

        try {
            if (Array.isArray(obj)) {
                return obj.map(item => serialize(item, depth + 1));
            }

            // Date objects
            if (obj instanceof Date) {
                return obj.toISOString();
            }

            // RegExp
            if (obj instanceof RegExp) {
                return obj.toString();
            }

            // Map
            if (obj instanceof Map) {
                const result: Record<string, unknown> = {};
                for (const [key, val] of obj) {
                    result[String(key)] = serialize(val, depth + 1);
                }
                return result;
            }

            // Set
            if (obj instanceof Set) {
                return [...obj].map(item => serialize(item, depth + 1));
            }

            // Plain objects
            const result: Record<string, unknown> = {};
            for (const key of Object.keys(obj)) {
                result[key] = serialize((obj as any)[key], depth + 1);
            }
            return result;
        } finally {
            seen.delete(obj);
        }
    }
}
