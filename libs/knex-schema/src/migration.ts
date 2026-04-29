// @cleverbrush/knex-schema — Schema diff & migration generation

import type { ObjectSchemaBuilder, SchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { generateCreateTableSource } from './ddl.js';
import type { Entity } from './entity.js';
import {
    getColumnName,
    getPolymorphicVariantSchemas,
    getTableName
} from './extension.js';
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
    MigrationDiff,
    SchemaSnapshot
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
// entitySchemaToTableState
// ---------------------------------------------------------------------------

/**
 * Derive a {@link DatabaseTableState} from a code-first `ObjectSchemaBuilder`
 * without connecting to the database.
 *
 * The result mirrors what {@link introspectDatabase} would return after the
 * schema has been fully applied, so it can be fed directly into
 * {@link diffSchema} as the `dbState` argument.  This is the foundation of
 * snapshot-based migration generation.
 *
 * @param schema - An `ObjectSchemaBuilder` with DDL extensions.
 * @returns A {@link DatabaseTableState} representing the schema's ideal DB shape.
 *
 * @example
 * ```ts
 * const state = entitySchemaToTableState(UserSchema);
 * // state.columns, state.foreignKeys, state.indexes …
 * ```
 */
export function entitySchemaToTableState(
    schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
): DatabaseTableState {
    const tableName = getTableName(schema);
    const introspected = schema.introspect() as any;
    const properties: Record<
        string,
        SchemaBuilder<any, any, any>
    > = introspected.properties ?? {};
    const tableExt: Record<string, any> = introspected.extensions ?? {};

    const columns: Record<string, DatabaseColumnInfo> = {};
    const indexes: DatabaseIndexInfo[] = [];
    const foreignKeys: DatabaseForeignKeyInfo[] = [];
    const checks: DatabaseCheckInfo[] = [];

    for (const [propKey, propSchema] of Object.entries(properties)) {
        const col = getColumnName(propSchema, propKey);
        const propIntrospected = propSchema.introspect() as any;
        const ext: Record<string, any> = propIntrospected.extensions ?? {};

        // Skip navigation properties (object/array without an explicit columnType).
        if (
            (propIntrospected.type === 'object' ||
                propIntrospected.type === 'array') &&
            !ext.columnType
        ) {
            continue;
        }

        columns[col] = {
            name: col,
            type: schemaTypeToDbType(propIntrospected, ext),
            nullable: !propIntrospected.isRequired,
            defaultValue: ext.defaultTo ?? null,
            maxLength: ext.maxLength ?? propIntrospected.maxLength ?? null,
            numericPrecision: null
        };

        if (ext.references) {
            foreignKeys.push({
                // Use Knex's default FK constraint naming convention
                constraintName: `${tableName}_${col}_foreign`,
                columnName: col,
                foreignTable: ext.references.table,
                foreignColumn: ext.references.column,
                deleteRule: (ext.onDelete ?? 'NO ACTION').toUpperCase(),
                updateRule: (ext.onUpdate ?? 'NO ACTION').toUpperCase()
            });
        }
    }

    // Timestamp columns (created_at / updated_at)
    if (tableExt.timestamps) {
        const ts = tableExt.timestamps;
        const createdAtCol: string = ts.createdAt ?? 'created_at';
        const updatedAtCol: string = ts.updatedAt ?? 'updated_at';
        columns[createdAtCol] = {
            name: createdAtCol,
            type: 'timestamp without time zone',
            nullable: false,
            defaultValue: 'now',
            maxLength: null,
            numericPrecision: null
        };
        columns[updatedAtCol] = {
            name: updatedAtCol,
            type: 'timestamp without time zone',
            nullable: false,
            defaultValue: 'now',
            maxLength: null,
            numericPrecision: null
        };
    }

    // Soft-delete column
    if (tableExt.softDelete) {
        const delCol: string = tableExt.softDelete.column ?? 'deleted_at';
        columns[delCol] = {
            name: delCol,
            type: 'timestamp without time zone',
            nullable: true,
            defaultValue: null,
            maxLength: null,
            numericPrecision: null
        };
    }

    // Non-unique indexes
    for (const idx of tableExt.indexes ?? []) {
        const idxName: string =
            idx.name ?? `idx_${(idx.columns as string[]).join('_')}`;
        indexes.push({
            name: idxName,
            columns: idx.columns,
            unique: idx.unique ?? false,
            definition: ''
        });
    }

    // Unique constraints
    for (const unq of tableExt.uniques ?? []) {
        const unqName: string =
            unq.name ?? `unq_${(unq.columns as string[]).join('_')}`;
        indexes.push({
            name: unqName,
            columns: unq.columns,
            unique: true,
            definition: ''
        });
    }

    return { columns, indexes, foreignKeys, checks };
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

    // Columns whose default values are owned by table-level extensions
    // (hasTimestamps, softDelete). Don't compare defaultValue for these —
    // the extension is authoritative.
    const extensionOwnedDefaults = new Set<string>();
    if (tableExt.timestamps) {
        extensionOwnedDefaults.add(tableExt.timestamps.createdAt);
        extensionOwnedDefaults.add(tableExt.timestamps.updatedAt);
    }

    // Set of schema-defined column names
    const schemaColumns = new Set<string>();

    // --- Column diff ---
    for (const [propKey, propSchema] of Object.entries(properties)) {
        const col = getColumnName(propSchema, propKey);
        const propIntrospected = propSchema.introspect() as any;
        const ext: Record<string, any> = propIntrospected.extensions ?? {};

        // Skip navigation properties (object/array without explicit columnType).
        if (
            (propIntrospected.type === 'object' ||
                propIntrospected.type === 'array') &&
            !ext.columnType
        ) {
            continue;
        }

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

            // Compare defaultValue (null / undefined both mean "no default")
            // Skip columns whose default is controlled by a table-level extension,
            // or auto-increment PKs whose nextval(...) default is DB-managed.
            if (
                !extensionOwnedDefaults.has(col) &&
                !ext.primaryKey?.autoIncrement
            ) {
                const snapshotDefault = dbCol.defaultValue ?? null;
                const schemaDefault = ext.defaultTo ?? null;
                if (snapshotDefault !== schemaDefault) {
                    changes.defaultValue = {
                        from: snapshotDefault,
                        to: schemaDefault
                    };
                }
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
    const { up, down } = buildAlterTableFragments(diff, tableName);

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
// tableExistsInDb
// ---------------------------------------------------------------------------

/**
 * Check whether a table exists in the connected PostgreSQL database.
 *
 * @param knex - A configured Knex instance (or transaction).
 * @param tableName - The table name to check.
 * @returns `true` when the table exists.
 *
 * @example
 * ```ts
 * const exists = await tableExistsInDb(knex, 'users');
 * if (!exists) await generateCreateTable(UserSchema)(knex);
 * ```
 */
export async function tableExistsInDb(
    knex: Knex,
    tableName: string
): Promise<boolean> {
    return knex.schema.hasTable(tableName);
}

// ---------------------------------------------------------------------------
// isDiffEmpty
// ---------------------------------------------------------------------------

/**
 * Return `true` when a {@link MigrationDiff} has no operations — i.e. the
 * database table is already in sync with the schema.
 */
export function isDiffEmpty(diff: MigrationDiff): boolean {
    return (
        diff.addColumns.length === 0 &&
        diff.dropColumns.length === 0 &&
        diff.alterColumns.length === 0 &&
        diff.addIndexes.length === 0 &&
        diff.dropIndexes.length === 0 &&
        diff.addForeignKeys.length === 0 &&
        diff.dropForeignKeys.length === 0
    );
}

// ---------------------------------------------------------------------------
// applyDiff
// ---------------------------------------------------------------------------

/**
 * Execute a {@link MigrationDiff} directly against a live database without
 * writing a migration file. Intended for `db push` (dev-only schema sync).
 *
 * Foreign-key constraint drops are executed as raw `ALTER TABLE … DROP
 * CONSTRAINT` statements before the main `alterTable` call.
 *
 * @param knex - A configured Knex instance or transaction.
 * @param diff - The diff from {@link diffSchema}.
 * @param tableName - The table to alter.
 *
 * @example
 * ```ts
 * const dbState = await introspectDatabase(knex, 'users');
 * const diff = diffSchema(UserSchema, dbState);
 * if (!isDiffEmpty(diff)) await applyDiff(knex, diff, 'users');
 * ```
 */
export async function applyDiff(
    knex: Knex,
    diff: MigrationDiff,
    tableName: string
): Promise<void> {
    if (isDiffEmpty(diff)) return;

    // FK constraint drops require raw SQL (we only have constraint names, not
    // column names, in the diff so Knex's dropForeign helper cannot be used).
    for (const constraintName of diff.dropForeignKeys) {
        await knex.raw('ALTER TABLE ?? DROP CONSTRAINT ??', [
            tableName,
            constraintName
        ]);
    }

    const hasTableChanges =
        diff.addColumns.length > 0 ||
        diff.dropColumns.length > 0 ||
        diff.alterColumns.length > 0 ||
        diff.addIndexes.length > 0 ||
        diff.dropIndexes.length > 0 ||
        diff.addForeignKeys.length > 0;

    if (!hasTableChanges) return;

    await knex.schema.alterTable(tableName, table => {
        // Add columns
        for (const col of diff.addColumns) {
            let column = buildColumnFromDbType(
                table as unknown as Knex.CreateTableBuilder,
                col.name,
                col.type
            );
            if (col.nullable) column = column.nullable();
            else column = column.notNullable();
            if (col.defaultValue !== undefined) {
                if (col.defaultValue === 'now') {
                    column = column.defaultTo(knex.fn.now());
                } else if (
                    typeof col.defaultValue === 'object' &&
                    col.defaultValue !== null &&
                    col.defaultValue.raw
                ) {
                    column = column.defaultTo(knex.raw(col.defaultValue.raw));
                } else {
                    column = column.defaultTo(col.defaultValue);
                }
            }
            if (col.references) {
                const fkBuilder = column
                    .references(col.references.column)
                    .inTable(col.references.table);
                if (col.onDelete) fkBuilder.onDelete(col.onDelete);
                if (col.onUpdate) fkBuilder.onUpdate(col.onUpdate);
            }
        }

        // Drop columns
        for (const colName of diff.dropColumns) {
            table.dropColumn(colName);
        }

        // Alter nullable / default
        for (const col of diff.alterColumns) {
            for (const [key, change] of Object.entries(col.changes)) {
                if (key === 'nullable') {
                    if (change.to) {
                        (table as any).setNullable(col.name);
                    } else {
                        (table as any).dropNullable(col.name);
                    }
                } else if (key === 'defaultValue') {
                    if (change.to === null) {
                        table.dropColumn(col.name); // fallback — handled in source gen
                    } else {
                        // ALTER COLUMN SET DEFAULT is not directly in Knex builder;
                        // handled via raw in source generation
                    }
                }
            }
        }

        // Add indexes
        for (const idx of diff.addIndexes) {
            if (idx.unique) {
                table.unique(
                    idx.columns,
                    idx.name ? { indexName: idx.name } : undefined
                );
            } else {
                table.index(idx.columns, idx.name);
            }
        }

        // Drop indexes
        for (const idx of diff.dropIndexes) {
            table.dropIndex([], idx);
        }

        // Add foreign keys
        for (const fk of diff.addForeignKeys) {
            let builder = table
                .foreign(fk.column)
                .references(fk.foreignColumn)
                .inTable(fk.foreignTable);
            if (fk.onDelete) builder = builder.onDelete(fk.onDelete);
            if (fk.onUpdate) builder = builder.onUpdate(fk.onUpdate);
        }
    });
}

// ---------------------------------------------------------------------------
// generateMigrationsForContext
// ---------------------------------------------------------------------------

/**
 * Generate a single combined migration (up + down) for a set of entities by
 * diffing the current code-first schemas against a **serialized snapshot**
 * stored in the repository — no live database connection required.
 *
 * For each entity's table the function:
 * - **New tables** (in entities but not in `prevSnapshot`): emits `CREATE TABLE`.
 * - **Existing tables** (in both): diffs entity schema against the snapshot
 *   state via {@link diffSchema} and emits `ALTER TABLE` when changes exist.
 * - **Dropped tables** (in `prevSnapshot` but not in entities): emits
 *   `DROP TABLE` with a best-effort `CREATE TABLE` in the `down` direction.
 * - Orders tables topologically by FK dependencies so parent tables are
 *   created before child tables in `up` (and dropped after in `down`).
 *
 * @param entities - The entities from your {@link EntityMap}.
 * @param prevSnapshot - The last committed {@link SchemaSnapshot} (empty on first run).
 * @returns `{ up, down, full, isEmpty, nextSnapshot }` where `nextSnapshot`
 *   should be written to disk after the migration file is created.
 *
 * @example
 * ```ts
 * const prev = loadSnapshot('./migrations/snapshot.json');
 * const result = generateMigrationsForContext(
 *     Object.values({ todos: TodoEntity, users: UserEntity }),
 *     prev
 * );
 * if (!result.isEmpty) {
 *     fs.writeFileSync('migrations/20260423000000_init.ts', result.full);
 *     writeSnapshot('./migrations/snapshot.json', result.nextSnapshot);
 * }
 * ```
 */
export function generateMigrationsForContext(
    entities: Entity<any, any>[],
    prevSnapshot: SchemaSnapshot
): {
    up: string;
    down: string;
    full: string;
    isEmpty: boolean;
    nextSnapshot: SchemaSnapshot;
} {
    // 1. Collect all (schema, tableName) pairs including CTI variant tables
    const tableEntries: {
        schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>;
        tableName: string;
    }[] = [];

    for (const entity of entities) {
        const schema = entity.schema;
        const tableName = getTableName(schema);
        tableEntries.push({ schema, tableName });

        // CTI variant tables each have their own tableName extension set
        for (const vs of getPolymorphicVariantSchemas(schema)) {
            const variantTableName = vs.getExtension('tableName') as
                | string
                | undefined;
            if (variantTableName) {
                tableEntries.push({ schema: vs, tableName: variantTableName });
            }
        }
    }

    // 2. Deduplicate (STI variants share the base table)
    const seen = new Set<string>();
    const uniqueEntries = tableEntries.filter(e => {
        if (seen.has(e.tableName)) return false;
        seen.add(e.tableName);
        return true;
    });

    // 3. Topological sort by FK dependencies
    const sorted = topologicalSort(uniqueEntries);

    // 4. Generate CREATE or ALTER fragment for each current table
    const upParts: string[] = [];
    const downParts: string[] = [];

    const currentTableNames = new Set(sorted.map(e => e.tableName));

    for (const { schema, tableName } of sorted) {
        const snapshotState = prevSnapshot.tables[tableName];
        if (!snapshotState) {
            // New table — emit CREATE TABLE
            const { up, down } = generateCreateTableSource(schema);
            upParts.push(up);
            downParts.push(down);
        } else {
            // Existing table — diff schema against snapshot (pure, no DB)
            const diff = diffSchema(schema, snapshotState);
            if (!isDiffEmpty(diff)) {
                const { up, down } = buildAlterTableFragments(diff, tableName);
                upParts.push(up);
                downParts.push(down);
            }
        }
    }

    // 5. Tables in snapshot but absent from current entities → DROP TABLE
    for (const tableName of Object.keys(prevSnapshot.tables)) {
        if (!currentTableNames.has(tableName)) {
            const state = prevSnapshot.tables[tableName];
            const { up, down } = generateDropTableSource(tableName, state);
            upParts.push(up);
            // Recreate before other downs so FK deps are satisfied
            downParts.unshift(down);
        }
    }

    const isEmpty = upParts.length === 0;

    // Down reverses creation order so child tables are dropped before parents
    const up = upParts.join('\n\n');
    const down = [...downParts].reverse().join('\n\n');

    const full = `import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
${isEmpty ? '    // No changes needed' : up}
}

export async function down(knex: Knex): Promise<void> {
${isEmpty ? '    // No changes needed' : down}
}
`;

    // Build the next snapshot from current entity schemas
    const nextTables: Record<string, DatabaseTableState> = {};
    for (const { schema, tableName } of sorted) {
        nextTables[tableName] = entitySchemaToTableState(schema);
    }
    const nextSnapshot: SchemaSnapshot = { version: 1, tables: nextTables };

    return { up, down, full, isEmpty, nextSnapshot };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * @internal
 * Emit `DROP TABLE` (up) and a best-effort `CREATE TABLE` reconstruction
 * (down) from a {@link DatabaseTableState} stored in the snapshot.
 * Called for tables that exist in the previous snapshot but are absent from
 * the current entity set.
 */
function generateDropTableSource(
    tableName: string,
    state: DatabaseTableState
): { up: string; down: string } {
    const up =
        `    // TODO: review destructive change — dropped table '${tableName}'\n` +
        `    await knex.schema.dropTableIfExists(${JSON.stringify(tableName)});`;

    // Reconstruct CREATE TABLE from snapshot state using specificType for
    // all columns so the raw DB types are preserved faithfully.
    const colLines: string[] = [];
    for (const [colName, col] of Object.entries(state.columns)) {
        let line = `        table.specificType(${JSON.stringify(colName)}, ${JSON.stringify(col.type)})`;
        if (col.nullable) line += '.nullable()';
        else line += '.notNullable()';
        if (col.defaultValue !== null && col.defaultValue !== undefined) {
            line += `.defaultTo(${JSON.stringify(col.defaultValue)})`;
        }
        colLines.push(line + ';');
    }
    for (const fk of state.foreignKeys) {
        colLines.push(
            `        table.foreign(${JSON.stringify(fk.columnName)}).references(${JSON.stringify(fk.foreignColumn)}).inTable(${JSON.stringify(fk.foreignTable)}).onDelete(${JSON.stringify(fk.deleteRule)}).onUpdate(${JSON.stringify(fk.updateRule)});`
        );
    }
    for (const idx of state.indexes) {
        if (idx.unique) {
            colLines.push(
                `        table.unique(${JSON.stringify(idx.columns)}, { indexName: ${JSON.stringify(idx.name)} });`
            );
        } else {
            colLines.push(
                `        table.index(${JSON.stringify(idx.columns)}, ${JSON.stringify(idx.name)});`
            );
        }
    }

    const down =
        `    await knex.schema.createTable(${JSON.stringify(tableName)}, (table) => {\n` +
        colLines.join('\n') +
        '\n    });';

    return { up, down };
}

/**
 * @internal
 * Extract the body of a MigrationDiff into up/down Knex schema code strings
 * (indented 4 spaces, wrapped in `alterTable` when non-empty).
 * Used by both {@link generateMigration} and {@link generateMigrationsForContext}.
 */
function buildAlterTableFragments(
    diff: MigrationDiff,
    tableName: string
): { up: string; down: string } {
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
            } else if (key === 'defaultValue') {
                const toVal = change.to;
                const fromVal = change.from;
                if (toVal === null) {
                    upLines.push(
                        `        table.timestamp('${col.name}').alter();  // DROP DEFAULT`
                    );
                    downLines.push(
                        `        table.timestamp('${col.name}').defaultTo(knex.fn.now()).alter();`
                    );
                } else {
                    upLines.push(
                        `        table.timestamp('${col.name}').notNullable().defaultTo(knex.fn.now()).alter();`
                    );
                    downLines.push(
                        fromVal === null
                            ? `        table.timestamp('${col.name}').notNullable().alter();`
                            : `        table.timestamp('${col.name}').notNullable().defaultTo(knex.fn.now()).alter();`
                    );
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

    return { up, down };
}

/** @internal Build a Knex ColumnBuilder from a PostgreSQL data type string (runtime use). */
function buildColumnFromDbType(
    table: Knex.CreateTableBuilder,
    name: string,
    dbType: string
): Knex.ColumnBuilder {
    switch (dbType) {
        case 'integer':
            return table.integer(name);
        case 'character varying':
            return table.string(name);
        case 'text':
            return table.text(name);
        case 'boolean':
            return table.boolean(name);
        case 'timestamp without time zone':
        case 'timestamp':
            return table.timestamp(name);
        case 'double precision':
        case 'float':
            return table.float(name);
        case 'jsonb':
        case 'json':
            return table.specificType(name, 'jsonb');
        case 'uuid':
            return table.uuid(name);
        default:
            return table.specificType(name, dbType);
    }
}

/**
 * @internal
 * Topologically sort table entries by FK dependency so parent tables
 * come first in `up` (and last in `down`). Falls back to original order
 * for cycles or external references.
 */
function topologicalSort(
    entries: {
        schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>;
        tableName: string;
    }[]
): typeof entries {
    const tableSet = new Set(entries.map(e => e.tableName));
    const deps = new Map<string, Set<string>>();

    for (const { schema, tableName } of entries) {
        const depSet = new Set<string>();
        const properties: Record<string, any> =
            (schema.introspect() as any).properties ?? {};
        for (const [, propSchema] of Object.entries(properties)) {
            const ext =
                ((propSchema as any).introspect?.() as any)?.extensions ?? {};
            if (ext.references?.table && tableSet.has(ext.references.table)) {
                depSet.add(ext.references.table);
            }
        }
        deps.set(tableName, depSet);
    }

    // Kahn's algorithm
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>(); // dep -> tables that depend on it
    for (const { tableName } of entries) {
        inDegree.set(tableName, 0);
        graph.set(tableName, []);
    }
    for (const { tableName } of entries) {
        for (const dep of deps.get(tableName) ?? []) {
            graph.get(dep)!.push(tableName);
            inDegree.set(tableName, (inDegree.get(tableName) ?? 0) + 1);
        }
    }

    const queue: string[] = [];
    for (const [t, deg] of inDegree) {
        if (deg === 0) queue.push(t);
    }

    const sortedNames: string[] = [];
    while (queue.length > 0) {
        const t = queue.shift()!;
        sortedNames.push(t);
        for (const dependent of graph.get(t) ?? []) {
            const newDeg = inDegree.get(dependent)! - 1;
            inDegree.set(dependent, newDeg);
            if (newDeg === 0) queue.push(dependent);
        }
    }

    // Append any cycles / unresolved entries in their original relative order
    const sortedSet = new Set(sortedNames);
    const remaining = entries.filter(e => !sortedSet.has(e.tableName));
    const byName = new Map(entries.map(e => [e.tableName, e]));
    return [...sortedNames.map(t => byName.get(t)!), ...remaining];
}

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
