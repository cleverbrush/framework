// @cleverbrush/knex-schema — Column resolution and mapping

import type { SchemaBuilder } from '@cleverbrush/schema';
import {
    ObjectSchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';
import type { Knex } from 'knex';
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
// Resolve a ColumnRef (string | accessor) to a SQL column name or Knex.Raw
// ---------------------------------------------------------------------------

/**
 * Build a `Knex.Raw` expression for accessing a nested JSON/JSONB path.
 *
 * - Single-key path: `"col"->>'key'` (text output, `->>` operator).
 * - Multi-key path:  `"col"#>>'{a,b,...}'` (text output, `#>>` operator).
 *
 * Both use positional bindings to prevent SQL injection.
 */
function jsonPathRaw(knex: Knex, col: string, jsonPath: string[]): Knex.Raw {
    if (jsonPath.length === 1) {
        return knex.raw('??->?', [col, jsonPath[0]]);
    }
    // #>> expects a text array literal, e.g. '{address,city}'
    const pathLiteral = `{${jsonPath.join(',')}}`;
    return knex.raw('??#>?', [col, pathLiteral]);
}

/**
 * Resolve a ColumnRef to a plain SQL column name (or a Knex.Raw expression for
 * nested JSON paths when `knex` is supplied).
 *
 * - String refs are treated as **property keys** (or dot-separated nested paths
 *   such as `'address.city'`) and translated to column names via the column map.
 * - Function refs (property accessor) are resolved via PropertyDescriptorTree,
 *   then translated to column names.  Nested accessors (e.g. `t => t.address.city`)
 *   produce a `Knex.Raw` JSON-path expression when `knex` is provided.
 *
 * @param ref    - Column reference (property key, dotted path, or accessor fn).
 * @param schema - Root ObjectSchemaBuilder.
 * @param label  - Human-readable label for error messages.
 * @param knex   - Knex instance.  Required for nested JSON-path refs; when omitted
 *                 and a nested path is detected, an error is thrown.
 */
export function resolveColumnRef(
    ref: ColumnRef<any>,
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    label: string,
    knex: Knex
): string | Knex.Raw;
export function resolveColumnRef(
    ref: ColumnRef<any>,
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    label: string
): string;
export function resolveColumnRef(
    ref: ColumnRef<any>,
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    label: string,
    knex?: Knex
): string | Knex.Raw {
    if (typeof ref === 'string') {
        if (!ref) throw new Error(`${label} must be a non-empty string`);

        // Dotted paths like 'address.city' — first segment is the top-level prop.
        if (ref.includes('.')) {
            const [topProp, ...jsonPath] = ref.split('.');
            const { propToCol } = buildColumnMap(schema);
            const col = propToCol.get(topProp) ?? topProp;
            if (!knex) {
                throw new Error(
                    `${label}: a Knex instance is required to resolve nested JSON path '${ref}'`
                );
            }
            return jsonPathRaw(knex, col, jsonPath);
        }

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
        const pointer: string = inner.toJsonPointer();

        // pointer is an RFC-6901 JSON Pointer, e.g. '' (root), '/name', '/address/city'
        if (!pointer) {
            throw new Error(`${label} accessor returned the root descriptor`);
        }

        // Split '/address/city' → ['address', 'city']
        const segments = pointer
            .slice(1)
            .split('/')
            .map((s: string) => s.replace(/~1/g, '/').replace(/~0/g, '~'));

        if (segments.length === 0) {
            throw new Error(`${label} accessor returned the root descriptor`);
        }

        const [topProp, ...jsonPath] = segments;
        const { propToCol } = buildColumnMap(schema);
        const col = propToCol.get(topProp) ?? topProp;

        if (jsonPath.length === 0) {
            // Top-level property — plain column name
            return col;
        }

        // Nested path — need Knex.Raw
        if (!knex) {
            throw new Error(
                `${label}: a Knex instance is required to resolve nested JSON path '${pointer}'`
            );
        }
        return jsonPathRaw(knex, col, jsonPath);
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
        const pointer: string = inner.toJsonPointer();

        if (!pointer) {
            throw new Error(`${label} accessor returned the root descriptor`);
        }

        // Return the first segment (top-level property key) for mapping purposes
        const topProp = pointer.slice(1).split('/')[0];
        return topProp.replace(/~1/g, '/').replace(/~0/g, '~');
    }

    throw new Error(
        `${label} must be a string or a property descriptor accessor function`
    );
}

// ---------------------------------------------------------------------------
// Primary-key introspection
// ---------------------------------------------------------------------------

/**
 * Result of {@link getPrimaryKeyColumns}.
 *
 * `propertyKeys` are the schema property names (the keys you'd use in
 * `.where(t => t.id, ...)` style accessors); `columnNames` are the SQL
 * column names after applying any `hasColumnName()` overrides. Order is
 * preserved: composite-PK ordering matches the user's `hasPrimaryKey()`
 * declaration; single-PK arrays have length 1.
 *
 * @public
 */
export interface PrimaryKeyColumns {
    readonly propertyKeys: readonly string[];
    readonly columnNames: readonly string[];
}

/**
 * Resolve the primary-key columns of a schema at runtime.
 *
 * Composite primary keys (declared via `.hasPrimaryKey([...])` on the
 * object schema) take precedence over single-column primary keys. The
 * `columns` argument to `.hasPrimaryKey()` may contain either property keys
 * or SQL column names — both forms are accepted and normalised.
 *
 * Returns `{ propertyKeys: [], columnNames: [] }` when no primary key is
 * declared.
 *
 * @public
 */
export function getPrimaryKeyColumns(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
): PrimaryKeyColumns {
    const introspected = schema.introspect() as {
        properties?: Record<string, SchemaBuilder<any, any, any>>;
        extensions?: Record<string, unknown>;
    };
    const properties = introspected.properties ?? {};
    const extensions = introspected.extensions ?? {};
    const { propToCol, colToProp } = buildColumnMap(schema);

    // Composite PK takes precedence.
    const composite = extensions.compositePrimaryKey as
        | readonly string[]
        | undefined;
    if (composite && composite.length > 0) {
        const propertyKeys: string[] = [];
        const columnNames: string[] = [];
        for (const entry of composite) {
            // Accept either column name or property key.
            if (propToCol.has(entry)) {
                propertyKeys.push(entry);
                columnNames.push(propToCol.get(entry) as string);
            } else if (colToProp.has(entry)) {
                columnNames.push(entry);
                propertyKeys.push(colToProp.get(entry) as string);
            } else {
                // Unknown identifier — pass through as both (best effort).
                propertyKeys.push(entry);
                columnNames.push(entry);
            }
        }
        return { propertyKeys, columnNames };
    }

    // Single-column PK — first property whose schema carries the
    // `primaryKey` extension wins.
    for (const [propKey, propSchema] of Object.entries(properties)) {
        const propExt =
            (
                propSchema as {
                    introspect?: () => {
                        extensions?: Record<string, unknown>;
                    };
                }
            ).introspect?.().extensions ?? {};
        if (propExt.primaryKey) {
            return {
                propertyKeys: [propKey],
                columnNames: [propToCol.get(propKey) ?? propKey]
            };
        }
    }

    return { propertyKeys: [], columnNames: [] };
}
