// @cleverbrush/knex-schema — DDL generation from schema introspection

import type { ObjectSchemaBuilder, SchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import {
    getColumnName,
    getPolymorphicVariantSchemas,
    getTableName
} from './extension.js';

// ---------------------------------------------------------------------------
// Type mapping
// ---------------------------------------------------------------------------

/**
 * Resolve the Knex column type from a schema property's introspection data and
 * DDL extensions.
 *
 * Priority:
 * 1. Explicit `columnType` extension (e.g. `'text'`, `'uuid'`, `'jsonb'`).
 * 2. Schema type (`string`, `number`, `boolean`, `date`).
 *
 * @param table - Knex table builder.
 * @param col - SQL column name.
 * @param introspected - Result of `propSchema.introspect()`.
 * @param ext - The property's `extensions` object.
 * @returns A Knex column builder.
 */
function resolveColumnType(
    table: Knex.CreateTableBuilder,
    col: string,
    introspected: any,
    ext: Record<string, any>
): Knex.ColumnBuilder {
    if (ext.columnType) {
        return table.specificType(col, ext.columnType);
    }
    switch (introspected.type) {
        case 'string': {
            const maxLen = ext.maxLength ?? introspected.maxLength ?? undefined;
            return maxLen ? table.string(col, maxLen) : table.string(col);
        }
        case 'number':
            return introspected.isInteger !== false
                ? table.integer(col)
                : table.float(col);
        case 'boolean':
            return table.boolean(col);
        case 'date':
            return table.timestamp(col);
        case 'object':
            // Nested objects are stored as jsonb by default; override via .columnType()
            return table.specificType(col, 'jsonb');
        default:
            return table.specificType(col, 'text');
    }
}

/**
 * Apply a default value to a Knex column builder.
 *
 * Handles special values:
 * - `'now'` → `knex.fn.now()`
 * - `'auto_increment'` → no-op (handled by `table.increments()`)
 * - `{ raw: string }` → `knex.raw(expression)`
 * - Otherwise → literal value.
 *
 * @param column - Knex column builder.
 * @param defaultValue - The default value from the `defaultTo` extension.
 * @param knex - Knex instance (needed for `fn.now()` and `raw()`).
 * @returns The column builder with the default applied.
 */
function applyDefault(
    column: Knex.ColumnBuilder,
    defaultValue: any,
    knex: Knex
): Knex.ColumnBuilder {
    if (defaultValue === 'now') return column.defaultTo(knex.fn.now());
    if (defaultValue === 'auto_increment') return column;
    if (
        typeof defaultValue === 'object' &&
        defaultValue !== null &&
        defaultValue.raw
    ) {
        return column.defaultTo(knex.raw(defaultValue.raw));
    }
    return column.defaultTo(defaultValue);
}

// ---------------------------------------------------------------------------
// generateCreateTable
// ---------------------------------------------------------------------------

/**
 * Generate a Knex `schema.createTable()` call from an ObjectSchemaBuilder's
 * introspected metadata and DDL extensions.
 *
 * Returns a function that accepts a Knex instance and returns a
 * `SchemaBuilder` (thenable). Call it inside a migration or setup script:
 *
 * @param schema - An `ObjectSchemaBuilder` with `.hasTableName()` and
 *   column-level DDL extensions (`.primaryKey()`, `.references()`, etc.).
 * @returns `(knex: Knex) => Knex.SchemaBuilder` — a function that creates the
 *   table when executed.
 *
 * @example
 * ```ts
 * const createUsersTable = generateCreateTable(UserSchema);
 * await createUsersTable(knex);
 * ```
 */
export function generateCreateTable(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
): (knex: Knex) => Knex.SchemaBuilder {
    const tableName = getTableName(schema);
    const introspected = schema.introspect() as any;
    const tableExt: Record<string, any> = introspected.extensions ?? {};

    return (knex: Knex) => {
        const builder = knex.schema.createTable(
            tableName,
            (table: Knex.CreateTableBuilder) => {
                const properties: Record<
                    string,
                    SchemaBuilder<any, any, any>
                > = introspected.properties ?? {};

                for (const [propKey, propSchema] of Object.entries(
                    properties
                )) {
                    const col = getColumnName(propSchema, propKey);
                    const propIntrospected = propSchema.introspect() as any;
                    const ext: Record<string, any> =
                        propIntrospected.extensions ?? {};

                    // Determine column builder
                    let column: Knex.ColumnBuilder;

                    if (ext.primaryKey?.autoIncrement) {
                        column = table.increments(col);
                    } else {
                        column = resolveColumnType(
                            table,
                            col,
                            propIntrospected,
                            ext
                        );
                    }

                    // Primary key (non-auto-increment)
                    if (ext.primaryKey && !ext.primaryKey.autoIncrement) {
                        column = column.primary();
                    }

                    // Unique constraint
                    if (ext.unique) {
                        column = column.unique(
                            typeof ext.unique === 'string'
                                ? { indexName: ext.unique }
                                : undefined
                        );
                    }

                    // Index
                    if (ext.index) {
                        column = column.index(
                            typeof ext.index === 'string'
                                ? ext.index
                                : undefined
                        );
                    }

                    // Default value
                    if (ext.defaultTo !== undefined) {
                        column = applyDefault(column, ext.defaultTo, knex);
                    }

                    // Nullability
                    if (
                        propIntrospected.isRequired &&
                        !ext.primaryKey?.autoIncrement
                    ) {
                        column = column.notNullable();
                    } else if (!propIntrospected.isRequired) {
                        column = column.nullable();
                    }

                    // Foreign key references
                    if (ext.references) {
                        const fkBuilder = column
                            .references(ext.references.column)
                            .inTable(ext.references.table);
                        if (ext.onDelete) fkBuilder.onDelete(ext.onDelete);
                        if (ext.onUpdate) fkBuilder.onUpdate(ext.onUpdate);
                    }

                    // Column-level CHECK constraint
                    if (ext.check) {
                        table.check(ext.check);
                    }
                }

                // ----- Table-level constraints from object extensions -----

                // Composite indexes
                for (const idx of tableExt.indexes ?? []) {
                    if (idx.unique) {
                        table.unique(idx.columns, {
                            indexName: idx.name ?? undefined
                        });
                    } else {
                        table.index(idx.columns, idx.name ?? undefined);
                    }
                }

                // Composite unique constraints
                for (const unq of tableExt.uniques ?? []) {
                    table.unique(unq.columns, {
                        indexName: unq.name ?? undefined
                    });
                }

                // Table-level CHECK constraints
                for (const chk of tableExt.checks ?? []) {
                    table.check(chk);
                }

                // Composite primary key
                if (tableExt.compositePrimaryKey) {
                    table.primary(tableExt.compositePrimaryKey);
                }

                // Raw columns (not backed by schema properties)
                for (const rawCol of tableExt.rawColumns ?? []) {
                    table.specificType(rawCol.name, rawCol.definition);
                }

                // Timestamps (auto-added columns)
                if (tableExt.timestamps) {
                    table
                        .timestamp(tableExt.timestamps.createdAt)
                        .defaultTo(knex.fn.now())
                        .notNullable();
                    table
                        .timestamp(tableExt.timestamps.updatedAt)
                        .defaultTo(knex.fn.now())
                        .notNullable();
                }

                // Soft delete column
                if (tableExt.softDelete) {
                    table.timestamp(tableExt.softDelete.column).nullable();
                }
            }
        );

        // Raw indexes are executed as separate statements after table creation
        const rawIndexes: string[] = tableExt.rawIndexes ?? [];
        if (rawIndexes.length > 0) {
            return builder.then(async () => {
                for (const rawIdx of rawIndexes) {
                    await knex.raw(rawIdx);
                }
            }) as any;
        }

        return builder;
    };
}

// ---------------------------------------------------------------------------
// generateCreatePolymorphicTables
// ---------------------------------------------------------------------------

/**
 * Generate a series of Knex `schema.createTable()` calls for a polymorphic
 * schema and all its CTI variant tables.
 *
 * Returns an array of `(knex: Knex) => Knex.SchemaBuilder` functions — one
 * for the base table and one for each CTI variant. STI variants add their
 * columns to the base table itself so no extra table is needed.
 *
 * Execute them sequentially in a migration:
 *
 * @param schema - The base `ObjectSchemaBuilder` with `.withVariants()` applied.
 * @returns An array of table-creation functions to execute in order.
 *
 * @example
 * ```ts
 * const creators = generateCreatePolymorphicTables(FileSchema);
 * for (const create of creators) {
 *     await create(knex);
 * }
 * ```
 */
export function generateCreatePolymorphicTables(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
): Array<(knex: Knex) => Knex.SchemaBuilder> {
    const result: Array<(knex: Knex) => Knex.SchemaBuilder> = [
        generateCreateTable(schema)
    ];

    const variantSchemas = getPolymorphicVariantSchemas(schema);
    for (const variantSchema of variantSchemas) {
        // Only CTI variants have their own table
        const tableName = variantSchema.getExtension('tableName') as
            | string
            | undefined;
        if (tableName) {
            result.push(generateCreateTable(variantSchema));
        }
    }

    return result;
}
