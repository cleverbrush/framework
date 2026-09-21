// @cleverbrush/knex-schema — Type-safe schema-driven query builder for Knex

export type {
    AliasTables,
    JoinedProjection,
    JoinPredicate,
    TableAlias
} from './aliased-query.js';
// Types
export { AliasedQueryBuilder, alias, and, eq, or } from './aliased-query.js';
export type {
    PrimaryKeyColumns,
    RowVersionColumn,
    RowVersionStrategy
} from './columns.js';
// Column resolution
export {
    buildColumnMap,
    getPrimaryKeyColumns,
    getRowVersionColumn,
    resolveColumnRef,
    resolvePropertyKey
} from './columns.js';
// DDL generation
export {
    generateCreatePolymorphicTables,
    generateCreateTable,
    generateCreateTableSource
} from './ddl.js';
export type {
    EntityPropSelector,
    EntityRelationKeys,
    EntityRelations,
    EntitySchema,
    EntityVariantUnion,
    RelationInfo,
    SchemaProps,
    UnwrapNavSchema,
    VariantBranch,
    WithRelation
} from './entity.js';
// Entity wrapper
export { defineEntity, Entity } from './entity.js';
export type {
    AggregateExpression,
    AggregateOptions,
    AggregateResult,
    AliasedColumn,
    OutputSchema
} from './expressions.js';
export { aggregate } from './expressions.js';
// Schema extension (hasColumnName / hasTableName + DDL/ORM)
export {
    any,
    array,
    boolean,
    COMPOSITE_PRIMARY_KEY_BRAND,
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
    PRIMARY_KEY_BRAND,
    string,
    union
} from './extension.js';
// Mappers (from knex-eager)
export { clearRow, MAPPERS, mapObject, mapValue } from './mappers.js';
// Migration generation
export {
    applyDiff,
    diffSchema,
    type EntitySchemaValidationIssue,
    type EntitySchemaValidationResult,
    entitySchemaToTableState,
    generateMigration,
    generateMigrationsForContext,
    introspectDatabase,
    isDiffEmpty,
    tableExistsInDb,
    validateEntitiesAgainstDatabase
} from './migration.js';
export type { CompositeCursorOptions } from './operations/composite-cursor.js';
// Raw query execution
export { rawQuery } from './raw.js';
export type { BoundQuery } from './SchemaQueryBuilder.js';
// Main entry point
export {
    createQuery,
    query,
    SchemaQueryBuilder
} from './SchemaQueryBuilder.js';
// Snapshot-based migration
export {
    entitiesToSnapshot,
    loadSnapshot,
    writeSnapshot
} from './snapshot.js';
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
    InferDatabaseRow,
    InferDatabaseValue,
    InsertType,
    JoinManySpec,
    JoinOneSpec,
    MigrationDiff,
    PaginationResult,
    PrimaryKeyOf,
    PrimaryKeyValueOf,
    RelationSpec,
    ResolvedVariantConfig,
    ResolvedVariantSpec,
    SchemaKeys,
    SchemaSnapshot,
    SelectProjection,
    SelectSelector,
    ValidatedJoinManySpec,
    ValidatedJoinOneSpec,
    ValidatedSpec,
    VariantStorageType,
    WithJoinedMany,
    WithJoinedOne
} from './types.js';
