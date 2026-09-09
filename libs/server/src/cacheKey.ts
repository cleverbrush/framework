import type { CacheTagDefinition } from './CacheTag.js';

type CacheRoot = Parameters<
    CacheTagDefinition['properties'][string]['getValue']
>[0];

/** Encode values without coercion, delimiter ambiguity, or lost date precision. */
function encode(value: unknown, ancestors: Set<object>): unknown {
    if (value === null) return ['null'];
    switch (typeof value) {
        case 'undefined':
            return ['undefined'];
        case 'string':
        case 'boolean':
            return [typeof value, value];
        case 'number':
            return ['number', Object.is(value, -0) ? '-0' : String(value)];
        case 'bigint':
            return ['bigint', String(value)];
        case 'object': {
            if (ancestors.has(value)) {
                throw new TypeError(
                    'Cache tag values must not contain cycles.'
                );
            }
            if (value instanceof Date) {
                if (!Number.isFinite(value.getTime())) {
                    throw new TypeError('Cache tag dates must be valid.');
                }
                return ['date', value.toISOString()];
            }
            const prototype = Object.getPrototypeOf(value);
            if (
                !Array.isArray(value) &&
                prototype !== Object.prototype &&
                prototype !== null
            ) {
                throw new TypeError('Unsupported cache tag object.');
            }
            if (Object.getOwnPropertySymbols(value).length > 0) {
                throw new TypeError(
                    'Cache tag values cannot have symbol keys.'
                );
            }
            ancestors.add(value);
            try {
                if (Array.isArray(value)) {
                    if (
                        Object.keys(value).some(
                            key =>
                                !/^(0|[1-9]\d*)$/.test(key) ||
                                Number(key) >= value.length
                        )
                    ) {
                        throw new TypeError(
                            'Cache tag arrays cannot have named properties.'
                        );
                    }
                    return [
                        'array',
                        Array.from({ length: value.length }, (_, index) => {
                            const property = Object.getOwnPropertyDescriptor(
                                value,
                                index
                            );
                            if (property && !('value' in property)) {
                                throw new TypeError(
                                    'Cache tag values cannot contain getters.'
                                );
                            }
                            return encode(property?.value, ancestors);
                        })
                    ];
                }
                return [
                    'object',
                    Object.keys(value)
                        .sort()
                        .map(key => {
                            const property = Object.getOwnPropertyDescriptor(
                                value,
                                key
                            )!;
                            if (!('value' in property)) {
                                throw new TypeError(
                                    'Cache tag values cannot contain getters.'
                                );
                            }
                            return [key, encode(property.value, ancestors)];
                        })
                ];
            } finally {
                ancestors.delete(value);
            }
        }
        default:
            throw new TypeError(
                `Unsupported cache tag value: ${typeof value}.`
            );
    }
}

/**
 * Compute a versioned, deterministic key from a tag and selected request values.
 *
 * Format: `ct2:` followed by JSON `[tagName, [[property, encodedValue], ...]]`.
 * Properties and object keys are sorted by code units. Values are type-tagged;
 * Dates retain millisecond precision. Missing/undefined selected properties are
 * omitted. Even property-free tags use this format; base invalidation labels
 * remain the original names. All cache writers/invalidators must use the same
 * version and retire old entries when upgrading.
 *
 * @throws TypeError for cyclic values, invalid dates, functions, symbols,
 * accessor properties, or objects other than arrays, dates and plain objects.
 */
export function computeCacheKey(
    tag: CacheTagDefinition,
    root: CacheRoot
): string {
    const parts: Array<[string, unknown]> = [];
    for (const key of Object.keys(tag.properties).sort()) {
        const result = tag.properties[key].getValue(root);
        if (result.success && result.value !== undefined) {
            parts.push([key, encode(result.value, new Set())]);
        }
    }
    return `ct2:${JSON.stringify([tag.name, parts])}`;
}
