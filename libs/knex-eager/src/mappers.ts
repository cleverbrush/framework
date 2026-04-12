import type { ValidatedSpec } from './types.js';

// ---------------------------------------------------------------------------
// Built-in named mappers (same concept as the old MAPPERS registry)
// ---------------------------------------------------------------------------
export const MAPPERS: Record<string, (value: any) => any> = {
    date_from_json: (value: any) => {
        if (!value) return value;
        return new Date(Date.parse(value));
    }
};

// ---------------------------------------------------------------------------
// mapValue — apply a mapper (function or built-in name) to a value
// ---------------------------------------------------------------------------
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
// clearRow — remove internal row_number field, apply mappers to joined data
// ---------------------------------------------------------------------------
export function clearRow(
    row: Record<string, any>,
    oneSpecs: Array<ValidatedSpec & { type: 'one' }>,
    manySpecs: Array<ValidatedSpec & { type: 'many' }>
): Record<string, any> {
    if (typeof row.row_number !== 'undefined') {
        delete row.row_number;
    }

    // Apply mappers to single joined objects
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

    // Apply mappers to collection joined objects
    for (const spec of manySpecs) {
        const fieldName = spec.as;
        if (Array.isArray(row[fieldName])) {
            for (let k = 0; k < row[fieldName].length; k++) {
                if (row[fieldName][k]) {
                    delete row[fieldName][k].row_number;
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
