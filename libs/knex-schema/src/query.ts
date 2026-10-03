import type { Knex } from 'knex';
import { AliasedQueryBuilder } from './AliasedQueryBuilder.js';
import {
    AliasedQuerySource,
    type AliasTables,
    isTableAlias,
    type TableAlias
} from './aliased-query.js';
import { finishParameterizedQuery } from './compiled-query.js';
import { getTableName } from './extension.js';
import type { QueryView } from './parameter-types.js';
import { QuerySource } from './QuerySource.js';
import type { ReadObject } from './read-schema.js';
import {
    createReadQuery,
    type SchemaAwareQuery
} from './SchemaQueryBuilder.js';
import { describeConnection } from './sql-description.js';

// Register the private SQL/write planner before creating relation queries.
void QuerySource;

/** Define a reusable aliased SELECT. Supply Knex at invocation or query(knex, ...args). */
export function query<S extends ReadObject, N extends string>(
    schema: TableAlias<S, N>
): QueryView<AliasedQueryBuilder<AliasTables<S, N>, never, [], false>, false>;
/**
 * Define an immutable, non-thenable query without creating a Knex client.
 * Selectors and scopes run once during construction. Supply a connection or
 * transaction when calling the definition, query(knex, ...args) or toSQL(knex, ...args).
 */
export function query<S extends ReadObject>(
    schema: S
): SchemaAwareQuery<S, false>;

/** Create an immutable, lazy query with an automatically inferred row schema. */
export function query<S extends ReadObject, N extends string>(
    knex: Knex,
    schema: TableAlias<S, N>
): AliasedQueryBuilder<AliasTables<S, N>>;
/** Create an immutable table or polymorphic query. Raw output requires apply(..., { output }). */
export function query<S extends ReadObject>(
    knex: Knex,
    schema: S
): SchemaAwareQuery<S>;
export function query(
    connectionOrSchema: Knex | ReadObject | TableAlias<any, any>,
    suppliedSchema?: ReadObject | TableAlias<any, any>,
    ...unsupported: unknown[]
): any {
    if (unsupported.length)
        throw new TypeError(
            'Raw query sources are not supported; use apply(..., { output })'
        );
    const knex =
        suppliedSchema === undefined
            ? describeConnection()
            : (connectionOrSchema as Knex);
    const schema = (suppliedSchema ?? connectionOrSchema) as
        | ReadObject
        | TableAlias<any, any>;
    if (isTableAlias(schema))
        return finishParameterizedQuery(
            new AliasedQueryBuilder(new AliasedQuerySource(knex, schema))
        );
    return finishParameterizedQuery(
        createReadQuery(knex, schema, knex(getTableName(schema)))
    );
}

/** Connection-bound query factory. Query configuration is lazy and immutable. */
export interface BoundQuery {
    /** Start a flat multi-table query. Select its output before execution. */
    <S extends ReadObject, N extends string>(
        schema: TableAlias<S, N>
    ): AliasedQueryBuilder<AliasTables<S, N>>;
    /** Start a schema-backed table query. */
    <S extends ReadObject>(schema: S): SchemaAwareQuery<S>;
    /** Reuse an existing transaction without committing it. */
    withTransaction(trx: Knex.Transaction): BoundQuery;
    /** Run work atomically with a transaction-bound factory. */
    transaction<T>(callback: (db: BoundQuery) => Promise<T>): Promise<T>;
}

/** Bind query() to a connection while preserving schema and alias inference. */
export function createQuery(knex: Knex): BoundQuery {
    return Object.assign(
        (schema: any, ...unsupported: unknown[]) => {
            if (unsupported.length)
                throw new TypeError(
                    'Raw query sources are not supported; use apply(..., { output })'
                );
            return query(knex, schema);
        },
        {
            withTransaction: (trx: Knex.Transaction) => createQuery(trx),
            transaction: <T>(callback: (db: BoundQuery) => Promise<T>) =>
                knex.transaction(trx => callback(createQuery(trx)))
        }
    ) as BoundQuery;
}
