/**
 * Creates a preprocessor function that splits a string value by the given
 * separator and trims each resulting element.
 *
 * Intended for use with `array()` schemas to parse comma-separated (or
 * similarly delimited) environment variable values.
 *
 * @param separator - The delimiter string (e.g. `','`, `';'`, `' '`).
 * @returns A preprocessor function suitable for `schema.addPreprocessor()`.
 *
 * @example
 * ```ts
 * env('ALLOWED_ORIGINS', array(string()).addPreprocessor(splitBy(','), { mutates: false }))
 * // "a, b, c" → ['a', 'b', 'c']
 * ```
 */
export function splitBy(separator: string): (value: unknown) => unknown {
    return (value: unknown): unknown => {
        if (typeof value === 'string') {
            return value.split(separator).map(s => s.trim());
        }
        return value;
    };
}
