// @cleverbrush/knex-schema — Type-safe schema-driven query builder for Knex

// Column resolution
export {
    buildColumnMap,
    resolveColumnRef,
    resolvePropertyKey
} from './columns.js';
// DDL generation
export { generateCreatePolymorphicTables, generateCreateTable } from './ddl.js';
export type {
    EntityRelationKeys,
    EntityRelations,
    EntitySchema,
    EntityVariantInput,
    KeyTree,
    RelationInfo,
    SchemaProps,
    UnwrapNavSchema,
    WithRelation
} from './entity.js';
// Entity wrapper
export { defineEntity, Entity } from './entity.js';
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
    getPolymorphicVariantSchemas,
    getProjections,
    getTableName,
    getVariants,
    METHOD_LITERAL_BRAND,
    number,
    object,
    POLYMORPHIC_TYPE_BRAND,
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
    ResolvedVariantConfig,
    ResolvedVariantSpec,
    SchemaKeys,
    ValidatedJoinManySpec,
    ValidatedJoinOneSpec,
    ValidatedSpec,
    VariantSpecInput,
    VariantStorageType,
    WithJoinedMany,
    WithJoinedOne
} from './types.js';
