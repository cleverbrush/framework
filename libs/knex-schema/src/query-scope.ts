import type { Knex } from 'knex';
import type { ParameterReader } from './parameter-types.js';
import type { ReadRelations } from './read-entity.js';
import type {
    ReadPredicateSelector,
    ReadPredicates
} from './read-predicates.js';
import type { ReadObject } from './read-schema.js';
import type { ReadColumns } from './SchemaQueryBuilder.js';

/** Shape-preserving immutable API supplied to named and default scopes. */
export interface QueryScope<S extends ReadObject>
    extends ReadPredicates<
        ReadColumns<S, keyof ReadRelations<S>>,
        [],
        ScopeParameterReader<S>
    > {
    /** Append native column ordering. Return the new query. */
    orderBy(
        column: ReadPredicateSelector<ReadColumns<S, keyof ReadRelations<S>>>,
        direction?: 'asc' | 'desc'
    ): this;
    /** Append trusted ordering with captured bindings. */
    orderByRaw(sql: string, bindings?: readonly Knex.RawBinding[]): this;
    /** Limit a new query without changing its row shape. */
    limit(count: number): this;
    /** Offset a new query without changing its row shape. */
    offset(count: number): this;
}

interface ScopeParameterReader<S extends ReadObject> extends ParameterReader {
    readonly result: QueryScope<S>;
}
