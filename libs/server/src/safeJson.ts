/**
 * Safe JSON utilities to prevent prototype pollution and excessive nesting.
 *
 * @module
 * @internal
 */

/** Default maximum nesting depth for parsed JSON objects. */
export const MAX_JSON_DEPTH = 64;

/**
 * Parse a JSON string while stripping dangerous keys (`__proto__`,
 * `constructor`) that could lead to prototype pollution.
 *
 * Uses a `JSON.parse` reviver to remove polluting keys during parsing,
 * which is more efficient than a post-parse walk.
 *
 * @throws {SyntaxError} If `raw` is not valid JSON.
 */
export function safeJsonParse(raw: string): unknown {
    return JSON.parse(raw, (key, value) => {
        if (key === '__proto__' || key === 'constructor') {
            return undefined;
        }
        return value;
    });
}

/**
 * Walk a parsed JSON value and throw if the nesting depth exceeds
 * `maxDepth`. Must be called after parsing.
 *
 * Only objects and arrays contribute to depth; primitives do not.
 *
 * @throws {Error} When nesting exceeds `maxDepth`.
 */
export function checkJsonDepth(
    value: unknown,
    maxDepth: number = MAX_JSON_DEPTH
): void {
    walk(value, 0, maxDepth);
}

function walk(value: unknown, current: number, max: number): void {
    if (value === null || typeof value !== 'object') return;
    if (current >= max) {
        throw new Error(`JSON nesting depth exceeds maximum of ${max}`);
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            walk(item, current + 1, max);
        }
    } else {
        for (const v of Object.values(value as Record<string, unknown>)) {
            walk(v, current + 1, max);
        }
    }
}
