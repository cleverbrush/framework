// @cleverbrush/knex-schema — Schema diff & migration generation

import type { ObjectSchemaBuilder, SchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { getColumnName } from './extension.js';
import type {
    AddColumnDiff,
    AddForeignKeyDiff,
    AddIndexDiff,
    AlterColumnDiff,
    DatabaseCheckInfo,
    DatabaseColumnInfo,
    DatabaseForeignKeyInfo,
    DatabaseIndexInfo,
    DatabaseTableState,
    MigrationDiff
} from './types.js';

// ---------------------------------------------------------------------------
// Database introspection
// ---------------------------------------------------------------------------

/**
 * Normalize raw database query results into a {@link DatabaseTableState}.
 * @internal
 */
function normalizeDbState(
    columns: any[],
    indexes: any[],
    foreignKeys: any[],
    checks: any[]
): DatabaseTableState {
    const colMap: Record<string, DatabaseColumnInfo> = {};
    for (const row of columns) {
        colMap[row.column_name] = {
            name: row.column_name,
            type: row.data_type,
            nullable: row.is_nullable === 'YES',
            defaultValue: row.column_default ?? null,
            maxLength: row.character_maximum_length ?? null,
            numericPrecision: row.numeric_precision ?? null
        };
    }

    const idxList: DatabaseIndexInfo[] = indexes.map((row: any) => ({
        name: row.indexname,
        columns: Array.isArray(row.columns) ? row.columns : [],
        unique: (row.indexdef ?? '').toUpperCase().includes('UNIQUE'),
        definition: row.indexdef ?? ''
    }));

    const fkList: DatabaseForeignKeyInfo[] = foreignKeys.map((row: any) => ({
        constraintName: row.constraint_name,
        columnName: row.column_name,
        foreignTable: row.foreign_table,
        foreignColumn: row.foreign_column,
        deleteRule: row.delete_rule,
        updateRule: row.update_rule
    }));

    const chkList: DatabaseCheckInfo[] = checks.map((row: any) => ({
        name: row.conname,
        definition: row.definition
    }));

    return {
        columns: colMap,
        indexes: idxList,
        foreignKeys: fkList,
        checks: chkList
    };
}

/**
 * Introspect a PostgreSQL table and return its current state.
 *
 * Queries `information_schema.columns`, `pg_indexes`, `pg_constraint`, and
 * referential constraint metadata to build a complete picture of the table's
 * columns, indexes, foreign keys, and check constraints.
 *
 * @param knex - A configured Knex instance connected to a PostgreSQL database.
 * @param tableName - The table name to introspect.
 * @returns The current database state for the table.
 *
 * @example
 * ```ts
 * const dbState = await introspectDatabase(knex, 'users');
 * console.log(dbState.columns); // { id: { type: 'integer', ... }, ... }
 * ```
 */
export async function introspectDatabase(
    knex: Knex,
    tableName: string
): Promise<DatabaseTableState> {
    const [columns, indexes, foreignKeys, checks] = await Promise.all([
        knex.raw(
            `SELECT column_name, data_type, is_nullable, column_default,
                    character_maximum_length, numeric_precision
             FROM information_schema.columns
             WHERE table_name = ? AND table_schema = 'public'
             ORDER BY ordinal_position`,
            [tableName]
        ),
        knex.raw(
            `SELECT indexname, indexdef,
                    array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns
             FROM pg_indexes
             JOIN pg_class t ON t.relname = ?
             JOIN pg_index ix ON ix.indrelid = t.oid
             JOIN pg_class i ON i.oid = ix.indexrelid AND i.relname = pg_indexes.indexname
             JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
             WHERE pg_indexes.tablename = ?
             GROUP BY indexname, indexdef`,
            [tableName, tableName]
        ),
        knex.raw(
            `SELECT tc.constraint_name, kcu.column_name,
                    ccu.table_name AS foreign_table, ccu.column_name AS foreign_column,
                    rc.delete_rule, rc.update_rule
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu USING (constraint_name, table_schema)
             JOIN information_schema.constraint_column_usage ccu USING (constraint_name, table_schema)
             JOIN information_schema.referential_constraints rc USING (constraint_name, constraint_schema)
             WHERE tc.table_name = ? AND tc.constraint_type = 'FOREIGN KEY'`,
            [tableName]
        ),
        knex.raw(
            `SELECT conname, pg_get_constraintdef(oid) as definition
             FROM pg_constraint
             WHERE conrelid = ?::regclass AND contype = 'c'`,
            [tableName]
        )
    ]);

    return normalizeDbState(
        columns.rows,
        indexes.rows,
        foreignKeys.rows,
        checks.rows
    );
}

// ---------------------------------------------------------------------------
// Schema → column info extraction
// ---------------------------------------------------------------------------

/** @internal Map a schema type to a PostgreSQL data_type string for comparison. */
function schemaTypeToDbType(
    introspected: any,
    ext: Record<string, any>
): string {
    if (ext.columnType) return ext.columnType;
    if (ext.primaryKey?.autoIncrement) return 'integer';
    switch (introspected.type) {
        case 'string':
            return 'character varying';
        case 'number':
            return introspected.isInteger !== false
                ? 'integer'
                : 'double precision';
        case 'boolean':
            return 'boolean';
        case 'date':
            return 'timestamp without time zone';
        default:
            return 'text';
    }
}

// ---------------------------------------------------------------------------
// diffSchema
// ---------------------------------------------------------------------------

/**
 * Compare a code-first schema model against a live database table state and
 * produce a diff describing the changes needed to bring the database in sync.
 *
 * @param schema - The code-first `ObjectSchemaBuilder`.
 * @param dbState - The current database state from {@link introspectDatabase}.
 * @returns A {@link MigrationDiff} describing columns, indexes, and foreign
 *   keys to add, drop, or alter.
 *
 * @example
 * ```ts
 * const dbState = await introspectDatabase(knex, 'users');
 * const diff = diffSchema(UserSchema, dbState);
 * if (diff.addColumns.length > 0) {
 *     const migration = generateMigration(diff, 'users');
 *     console.log(migration.up);
 * }
 * ```
 */
export function diffSchema(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    dbState: DatabaseTableState
): MigrationDiff {
    const introspected = schema.introspect() as any;
    const properties: Record<
        string,
        SchemaBuilder<any, any, any>
    > = introspected.properties ?? {};
    const tableExt: Record<string, any> = introspected.extensions ?? {};

    const addColumns: AddColumnDiff[] = [];
    const dropColumns: string[] = [];
    const alterColumns: AlterColumnDiff[] = [];
    const addIndexes: AddIndexDiff[] = [];
    const dropIndexes: string[] = [];
    const addForeignKeys: AddForeignKeyDiff[] = [];
    const dropForeignKeys: string[] = [];

    // Set of schema-defined column names
    const schemaColumns = new Set<string>();

    // --- Column diff ---
    for (const [propKey, propSchema] of Object.entries(properties)) {
        const col = getColumnName(propSchema, propKey);
        const propIntrospected = propSchema.introspect() as any;
        const ext: Record<string, any> = propIntrospected.extensions ?? {};
        schemaColumns.add(col);

        const dbCol = dbState.columns[col];
        if (!dbCol) {
            // Column exists in schema but not in DB → add
            addColumns.push({
                name: col,
                type: schemaTypeToDbType(propIntrospected, ext),
                nullable: !propIntrospected.isRequired,
                defaultValue: ext.defaultTo,
                references: ext.references,
                onDelete: ext.onDelete,
                onUpdate: ext.onUpdate
            });
        } else {
            // Column exists in both → check for alterations
            const changes: Record<string, { from: any; to: any }> = {};

            const expectedNullable = !propIntrospected.isRequired;
            if (dbCol.nullable !== expectedNullable) {
                changes.nullable = {
                    from: dbCol.nullable,
                    to: expectedNullable
                };
            }

            if (Object.keys(changes).length > 0) {
                alterColumns.push({ name: col, changes });
            }
        }

        // Foreign key diff
        if (ext.references) {
            const existingFK = dbState.foreignKeys.find(
                fk => fk.columnName === col
            );
            if (!existingFK) {
                addForeignKeys.push({
                    column: col,
                    foreignTable: ext.references.table,
                    foreignColumn: ext.references.column,
                    onDelete: ext.onDelete,
                    onUpdate: ext.onUpdate
                });
            }
        }
    }

    // Include timestamp columns in schema column set
    if (tableExt.timestamps) {
        schemaColumns.add(tableExt.timestamps.createdAt);
        schemaColumns.add(tableExt.timestamps.updatedAt);
    }
    if (tableExt.softDelete) {
        schemaColumns.add(tableExt.softDelete.column);
    }

    // Columns in DB but not in schema → drop
    for (const colName of Object.keys(dbState.columns)) {
        if (!schemaColumns.has(colName)) {
            dropColumns.push(colName);
        }
    }

    // --- Index diff ---
    const schemaIndexNames = new Set<string>();

    for (const idx of tableExt.indexes ?? []) {
        const idxName = idx.name ?? `idx_${idx.columns.join('_')}`;
        schemaIndexNames.add(idxName);
        const existingIdx = dbState.indexes.find(
            dbIdx => dbIdx.name === idxName
        );
        if (!existingIdx) {
            addIndexes.push({
                columns: idx.columns,
                name: idx.name,
                unique: idx.unique
            });
        }
    }

    for (const unq of tableExt.uniques ?? []) {
        const unqName = unq.name ?? `unq_${unq.columns.join('_')}`;
        schemaIndexNames.add(unqName);
        const existingIdx = dbState.indexes.find(
            dbIdx => dbIdx.name === unqName
        );
        if (!existingIdx) {
            addIndexes.push({
                columns: unq.columns,
                name: unq.name,
                unique: true
            });
        }
    }

    // FK constraints that exist in DB but not in schema → drop
    for (const fk of dbState.foreignKeys) {
        const propSchema = Object.entries(properties).find(([propKey, ps]) => {
            return getColumnName(ps, propKey) === fk.columnName;
        });
        if (propSchema) {
            const ext = (propSchema[1].introspect() as any).extensions ?? {};
            if (!ext.references) {
                dropForeignKeys.push(fk.constraintName);
            }
        } else {
            dropForeignKeys.push(fk.constraintName);
        }
    }

    return {
        addColumns,
        dropColumns,
        alterColumns,
        addIndexes,
        dropIndexes,
        addForeignKeys,
        dropForeignKeys
    };
}

// ---------------------------------------------------------------------------
// generateMigration
// ---------------------------------------------------------------------------

/**
 * Generate migration `up` and `down` code strings from a {@link MigrationDiff}.
 *
 * The generated code is valid TypeScript that uses Knex's schema builder API.
 * Write it to a migration file and run via Knex's migration system.
 *
 * @param diff - The schema diff from {@link diffSchema}.
 * @param tableName - The table name to alter.
 * @returns An object with `up` and `down` migration code strings.
 *
 * @example
 * ```ts
 * const diff = diffSchema(UserSchema, dbState);
 * const migration = generateMigration(diff, 'users');
 * fs.writeFileSync('migration.ts', migration.full);
 * ```
 */
export function generateMigration(
    diff: MigrationDiff,
    tableName: string
): { up: string; down: string; full: string } {
    const upLines: string[] = [];
    const downLines: string[] = [];

    // --- ADD COLUMNS ---
    for (const col of diff.addColumns) {
        const typeCall = col.type.includes(' ')
            ? `table.specificType('${col.name}', '${col.type}')`
            : `table.${mapTypeToKnex(col.type)}('${col.name}')`;

        let line = `        ${typeCall}`;
        if (col.nullable) line += '.nullable()';
        else line += '.notNullable()';
        if (col.defaultValue !== undefined) {
            line += `.defaultTo(${formatDefault(col.defaultValue)})`;
        }
        line += ';';

        upLines.push(line);
        downLines.push(`        table.dropColumn('${col.name}');`);
    }

    // --- DROP COLUMNS ---
    for (const col of diff.dropColumns) {
        upLines.push(`        table.dropColumn('${col}');`);
        downLines.push(
            `        // TODO: recreate column '${col}' with original definition`
        );
    }

    // --- ALTER COLUMNS ---
    for (const col of diff.alterColumns) {
        for (const [key, change] of Object.entries(col.changes)) {
            if (key === 'nullable') {
                if (change.to) {
                    upLines.push(`        table.setNullable('${col.name}');`);
                    downLines.push(
                        `        table.dropNullable('${col.name}');`
                    );
                } else {
                    upLines.push(`        table.dropNullable('${col.name}');`);
                    downLines.push(`        table.setNullable('${col.name}');`);
                }
            }
        }
    }

    // --- ADD INDEXES ---
    for (const idx of diff.addIndexes) {
        const cols = JSON.stringify(idx.columns);
        if (idx.unique) {
            upLines.push(
                `        table.unique(${cols}${idx.name ? `, { indexName: '${idx.name}' }` : ''});`
            );
            downLines.push(
                `        table.dropUnique(${cols}${idx.name ? `, '${idx.name}'` : ''});`
            );
        } else {
            upLines.push(
                `        table.index(${cols}${idx.name ? `, '${idx.name}'` : ''});`
            );
            downLines.push(
                `        table.dropIndex([]${idx.name ? `, '${idx.name}'` : ''});`
            );
        }
    }

    // --- DROP INDEXES ---
    for (const idx of diff.dropIndexes) {
        upLines.push(`        table.dropIndex([], '${idx}');`);
        downLines.push(
            `        // TODO: recreate index '${idx}' with original definition`
        );
    }

    // --- ADD FOREIGN KEYS ---
    for (const fk of diff.addForeignKeys) {
        let line = `        table.foreign('${fk.column}').references('${fk.foreignColumn}').inTable('${fk.foreignTable}')`;
        if (fk.onDelete) line += `.onDelete('${fk.onDelete}')`;
        if (fk.onUpdate) line += `.onUpdate('${fk.onUpdate}')`;
        line += ';';
        upLines.push(line);
        downLines.push(`        table.dropForeign('${fk.column}');`);
    }

    // --- DROP FOREIGN KEYS ---
    for (const fk of diff.dropForeignKeys) {
        upLines.push(`        // TODO: drop foreign key constraint '${fk}'`);
    }

    const isEmpty = upLines.length === 0;

    const up = isEmpty
        ? `    // No changes needed`
        : `    await knex.schema.alterTable('${tableName}', (table) => {\n${upLines.join('\n')}\n    });`;

    const down = isEmpty
        ? `    // No changes needed`
        : `    await knex.schema.alterTable('${tableName}', (table) => {\n${downLines.join('\n')}\n    });`;

    const full = `import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
${up}
}

export async function down(knex: Knex): Promise<void> {
${down}
}
`;

    return { up, down, full };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @internal Map a PostgreSQL data type string to a Knex column method name. */
function mapTypeToKnex(type: string): string {
    switch (type) {
        case 'integer':
            return 'integer';
        case 'character varying':
            return 'string';
        case 'text':
            return 'text';
        case 'boolean':
            return 'boolean';
        case 'timestamp without time zone':
        case 'timestamp':
            return 'timestamp';
        case 'double precision':
        case 'float':
            return 'float';
        case 'jsonb':
        case 'json':
            return 'jsonb';
        case 'uuid':
            return 'uuid';
        default:
            return `specificType('${type}')` as any;
    }
}

/** @internal Format a default value for migration code generation. */
function formatDefault(value: any): string {
    if (value === 'now') return 'knex.fn.now()';
    if (typeof value === 'object' && value !== null && value.raw) {
        return `knex.raw('${value.raw.replace(/'/g, "\\'")}')`;
    }
    if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
    return String(value);
}
