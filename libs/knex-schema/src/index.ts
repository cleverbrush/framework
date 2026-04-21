// @cleverbrush/knex-schema — Type-safe schema-driven query builder for Knex

// Column resolution
export {
    buildColumnMap,
    resolveColumnRef,
    resolvePropertyKey
} from './columns.js';
// DDL generation
export { generateCreateTable } from './ddl.js';
// Schema extension (hasColumnName / hasTableName + DDL/ORM)
export {
    any,
    array,
    boolean,
    date,
    dbExtension,
    ddlExtension,
    EXTRA_TYPE_BRAND,
    func,
    getColumnName,
    getProjections,
    getTableName,
    METHOD_LITERAL_BRAND,
    number,
    object,
    string,
    union
} from './extension.js';
// Mappers (from knex-eager)
export { clearRow, MAPPERS, mapObject, mapValue } from './mappers.js';
// Migration generation
export {
    diffSchema,
    generateMigration,
    introspectDatabase
} from './migration.js';
// Raw query execution
export { rawQuery } from './raw.js';
export type { BoundQuery } from './SchemaQueryBuilder.js';
// Main entry point
export {
    createQuery,
    query,
    SchemaQueryBuilder
} from './SchemaQueryBuilder.js';

// Types
export type {
    AddColumnDiff,
    AddForeignKeyDiff,
    AddIndexDiff,
    AlterColumnDiff,
    ColumnRef,
    CursorPaginationResult,
    DatabaseCheckInfo,
    DatabaseColumnInfo,
    DatabaseForeignKeyInfo,
    DatabaseIndexInfo,
    DatabaseTableState,
    InsertType,
    JoinManySpec,
    JoinOneSpec,
    MigrationDiff,
    PaginationResult,
    RelationSpec,
    SchemaKeys,
    ValidatedJoinManySpec,
    ValidatedJoinOneSpec,
    ValidatedSpec,
    WithJoinedMany,
    WithJoinedOne
} from './types.js';
