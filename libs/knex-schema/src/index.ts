// @cleverbrush/knex-schema — Type-safe schema-driven query builder for Knex

// Column resolution
export {
    buildColumnMap,
    resolveColumnRef,
    resolvePropertyKey
} from './columns.js';

// Schema extension (hasColumnName / hasTableName)
export {
    any,
    array,
    boolean,
    date,
    dbExtension,
    func,
    getColumnName,
    getTableName,
    number,
    object,
    string,
    union
} from './extension.js';
// Mappers (from knex-eager)
export { clearRow, MAPPERS, mapObject, mapValue } from './mappers.js';
export type { BoundQuery } from './SchemaQueryBuilder.js';
// Main entry point
export {
    createQuery,
    query,
    SchemaQueryBuilder
} from './SchemaQueryBuilder.js';

// Types
export type {
    ColumnRef,
    InsertType,
    JoinManySpec,
    JoinOneSpec,
    SchemaKeys,
    ValidatedJoinManySpec,
    ValidatedJoinOneSpec,
    ValidatedSpec,
    WithJoinedMany,
    WithJoinedOne
} from './types.js';
