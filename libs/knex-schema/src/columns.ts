// @cleverbrush/knex-schema — Column resolution and mapping

import type { SchemaBuilder } from '@cleverbrush/schema';
import {
    ObjectSchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import { getColumnName } from './extension.js';
import type { ColumnRef } from './types.js';

// ---------------------------------------------------------------------------
// Column map cache (schema → { propToCol, colToProp })
// ---------------------------------------------------------------------------

interface ColumnMapResult {
    propToCol: Map<string, string>;
    colToProp: Map<string, string>;
}

const columnMapCache = new WeakMap<object, ColumnMapResult>();

/**
 * Build a bidirectional column map from an ObjectSchemaBuilder's properties.
 * Uses `getExtension('columnName')` per property, falling back to the property key.
 * Result is cached per schema instance via WeakMap.
 */
export function buildColumnMap(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
): ColumnMapResult {
    const cached = columnMapCache.get(schema);
    if (cached) return cached;

    const introspected = schema.introspect() as any;
    const properties: Record<
        string,
        SchemaBuilder<any, any, any>
    > = introspected.properties ?? {};

    const propToCol = new Map<string, string>();
    const colToProp = new Map<string, string>();

    for (const propKey of Object.keys(properties)) {
        const propSchema = properties[propKey];
        const colName = getColumnName(propSchema, propKey);

        propToCol.set(propKey, colName);
        colToProp.set(colName, propKey);
    }

    const result: ColumnMapResult = { propToCol, colToProp };
    columnMapCache.set(schema, result);
    return result;
}

// ---------------------------------------------------------------------------
// Resolve a ColumnRef (string | accessor) to a SQL column name
// ---------------------------------------------------------------------------

/**
 * Resolve a ColumnRef to a plain SQL column name.
 *
 * - String refs are treated as **property keys** and translated to column
 *   names via the column map.
 * - Function refs (property accessor) are resolved via PropertyDescriptorTree,
 *   then translated to column names.
 */
export function resolveColumnRef(
    ref: ColumnRef<any>,
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    label: string
): string {
    if (typeof ref === 'string') {
        if (!ref) throw new Error(`${label} must be a non-empty string`);
        const { propToCol } = buildColumnMap(schema);
        const col = propToCol.get(ref);
        // If the string is a known property key, return its column name;
        // otherwise assume it's already a raw column name and pass through.
        return col ?? ref;
    }

    if (typeof ref === 'function') {
        const tree = ObjectSchemaBuilder.getPropertiesFor(schema as any);
        const descriptor = ref(tree as any);

        if (
            !descriptor ||
            typeof descriptor !== 'object' ||
            !(SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in descriptor)
        ) {
            throw new Error(
                `${label} accessor must return a valid property descriptor`
            );
        }

        const inner = (descriptor as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
        const introspected = schema.introspect() as any;
        const properties = introspected.properties ?? {};

        for (const propName of Object.keys(properties)) {
            const propDescriptor = (tree as any)[propName];
            if (
                propDescriptor &&
                (propDescriptor as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR] ===
                    inner
            ) {
                // Found the matching property — resolve to column name
                const { propToCol } = buildColumnMap(schema);
                return propToCol.get(propName) ?? propName;
            }
        }

        throw new Error(
            `${label} accessor did not match any property in the schema`
        );
    }

    throw new Error(
        `${label} must be a string or a property descriptor accessor function`
    );
}

/**
 * Resolve a ColumnRef to the **property key** (not the column name).
 * Used for result mapping.
 */
export function resolvePropertyKey(
    ref: ColumnRef<any>,
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    label: string
): string {
    if (typeof ref === 'string') {
        if (!ref) throw new Error(`${label} must be a non-empty string`);
        return ref;
    }

    if (typeof ref === 'function') {
        const tree = ObjectSchemaBuilder.getPropertiesFor(schema as any);
        const descriptor = ref(tree as any);

        if (
            !descriptor ||
            typeof descriptor !== 'object' ||
            !(SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in descriptor)
        ) {
            throw new Error(
                `${label} accessor must return a valid property descriptor`
            );
        }

        const inner = (descriptor as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
        const introspected = schema.introspect() as any;
        const properties = introspected.properties ?? {};

        for (const propName of Object.keys(properties)) {
            const propDescriptor = (tree as any)[propName];
            if (
                propDescriptor &&
                (propDescriptor as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR] ===
                    inner
            ) {
                return propName;
            }
        }

        throw new Error(
            `${label} accessor did not match any property in the schema`
        );
    }

    throw new Error(
        `${label} must be a string or a property descriptor accessor function`
    );
}
