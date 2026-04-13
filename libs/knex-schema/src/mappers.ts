// @cleverbrush/knex-schema — Post-load value transformers (from knex-eager)

import type { ValidatedSpec } from './types.js';

// ---------------------------------------------------------------------------
// Built-in named mappers
// ---------------------------------------------------------------------------

/**
 * Built-in named value mapper functions.
 *
 * Each entry maps a string key to a transformation function. Pass the key as
 * the `mapper` argument to {@link mapValue} instead of a custom function.
 *
 * Currently available:
 * - `date_from_json` — converts a JSON date string (`string | null`) to a
 *   JavaScript `Date` object (or passes through falsy values unchanged).
 */
export const MAPPERS: Record<string, (value: any) => any> = {
    date_from_json: (value: any) => {
        if (!value) return value;
        return new Date(Date.parse(value));
    }
};

// ---------------------------------------------------------------------------
// mapValue — apply a mapper (function or built-in name) to a value
// ---------------------------------------------------------------------------

/**
 * Apply a single mapper to a value.
 *
 * @param mapper - Either a transformation function `(v: any) => any`, or a
 *   string key referencing one of the {@link MAPPERS} built-ins (e.g.
 *   `'date_from_json'`).
 * @param value - The raw value to transform.
 * @returns The transformed value.
 *
 * @throws If `mapper` is a string that does not exist in {@link MAPPERS}.
 */
export function mapValue(mapper: ((v: any) => any) | string, value: any): any {
    if (typeof mapper === 'string') {
        if (typeof MAPPERS[mapper] !== 'function') {
            throw new Error(`unknown mapper "${mapper}"`);
        }
        return MAPPERS[mapper](value);
    }
    if (typeof mapper === 'function') {
        return mapper(value);
    }
    throw new Error("couldn't map value");
}

// ---------------------------------------------------------------------------
// mapObject — apply mappers to all matching keys of an object
// ---------------------------------------------------------------------------

/**
 * Apply a map of per-key transformations to an object, returning a new object
 * with the transformed values.
 *
 * Keys not present in `mappers` are copied through unchanged. Keys present in
 * `mappers` are passed through {@link mapValue}.
 *
 * @param obj - The source object (e.g. a raw database row).
 * @param mappers - A `Record` mapping property keys to mapper functions or
 *   {@link MAPPERS} built-in names.
 * @returns A shallow copy of `obj` with the specified values transformed.
 *
 * @throws If `obj` is `null` or a non-object, it is returned as-is.
 */
export function mapObject<T extends Record<string, any>>(
    obj: T,
    mappers: Record<string, ((v: any) => any) | string>
): T {
    if (!mappers) throw new Error('mappers should be an object');
    if (!obj || typeof obj !== 'object' || obj === null) return obj;

    const result = {} as Record<string, any>;
    for (const key of Object.keys(obj)) {
        result[key] = mappers[key]
            ? mapValue(mappers[key], obj[key])
            : obj[key];
    }
    return result as T;
}

// ---------------------------------------------------------------------------
// clearRow — apply mappers to joined data in a result row
// ---------------------------------------------------------------------------

/**
 * Apply value mappers to the joined fields of a result row in place.
 *
 * After an eager-loaded query resolves, joined objects and arrays may contain
 * raw database values that need transformation (e.g. date strings → `Date`).
 * This function iterates over the one-to-one and one-to-many specs, applies
 * the `mappers` defined on each spec to the nested data, and returns the
 * mutated row.
 *
 * This is an internal helper used by {@link SchemaQueryBuilder}'s result
 * mapping pipeline. Exported to allow custom post-processing if needed.
 *
 * @param row - The raw result row (mutated in place).
 * @param oneSpecs - Validated one-to-one join specs with optional `mappers`.
 * @param manySpecs - Validated one-to-many join specs with optional `mappers`.
 * @returns The mutated `row` object.
 */
export function clearRow(
    row: Record<string, any>,
    oneSpecs: Array<ValidatedSpec & { type: 'one' }>,
    manySpecs: Array<ValidatedSpec & { type: 'many' }>
): Record<string, any> {
    for (const spec of oneSpecs) {
        const fieldName = spec.as;
        if (
            spec.mappers &&
            typeof row[fieldName] !== 'undefined' &&
            row[fieldName] !== null
        ) {
            row[fieldName] = mapObject(row[fieldName], spec.mappers);
        }
    }

    for (const spec of manySpecs) {
        const fieldName = spec.as;
        if (Array.isArray(row[fieldName])) {
            for (let k = 0; k < row[fieldName].length; k++) {
                if (row[fieldName][k]) {
                    if (spec.mappers) {
                        row[fieldName][k] = mapObject(
                            row[fieldName][k],
                            spec.mappers
                        );
                    }
                }
            }
        }
    }

    return row;
}
