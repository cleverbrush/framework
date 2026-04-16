/**
 * Serializes a flat object into a URL query string.
 *
 * - `null` and `undefined` values are skipped.
 * - `Date` values are serialized as ISO-8601 strings.
 * - Arrays are serialized as repeated keys: `tags=a&tags=b`.
 * - All other values are stringified with `String()`.
 *
 * @param query - The query parameters object.
 * @returns A query string **without** the leading `?`, or an empty string
 *   if no parameters are present.
 *
 * @internal
 */
export function serializeQuery(
    query: Record<string, unknown> | undefined
): string {
    if (!query) return '';

    const parts: string[] = [];

    for (const [key, value] of Object.entries(query)) {
        if (value == null) continue;

        if (Array.isArray(value)) {
            for (const item of value) {
                if (item == null) continue;
                parts.push(
                    `${encodeURIComponent(key)}=${encodeURIComponent(formatValue(item))}`
                );
            }
        } else {
            parts.push(
                `${encodeURIComponent(key)}=${encodeURIComponent(formatValue(value))}`
            );
        }
    }

    return parts.join('&');
}

function formatValue(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    return String(value);
}
