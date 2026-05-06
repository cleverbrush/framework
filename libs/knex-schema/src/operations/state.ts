// @cleverbrush/knex-schema — Shared mutable state store for SchemaQueryBuilder

import type { ObjectSchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import type {
    ResolvedVariantConfig,
    ValidatedSpec,
    VariantWhereFilter
} from '../types.js';

export interface QueryBuilderState {
    knex: Knex;
    baseQuery: Knex.QueryBuilder;
    localSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>;
    specs: ValidatedSpec[];
    tableName: string;

    /** SQL column names explicitly passed to `.select()`. null = SELECT *. */
    explicitSelects: string[] | null;

    /** Column-selection mode: null, 'select', 'aggregate', or 'projection'. */
    selectionMode: 'select' | 'aggregate' | 'projection' | null;

    /** Name of the projection currently applied, for error messages. */
    appliedProjection: string | null;

    /** When true, soft-delete filter is NOT applied. */
    includeDeleted: boolean;

    /** When true, only soft-deleted rows are returned. */
    onlyDeleted: boolean;

    /** When true, default scope is not applied. */
    skipDefaultScope: boolean;

    /** Resolved variant config, lazily populated. undefined = not yet read; null = not polymorphic. */
    variantConfig: ResolvedVariantConfig | null | undefined;

    /** When set, only these discriminator values are returned. null = all variants. */
    enabledVariants: Set<string> | null;

    /** Pending per-variant WHERE filters registered via .whereVariant(). */
    variantWhereFilters: VariantWhereFilter[];

    /** Variant-relation eager-load requests registered via .includeVariant(). */
    variantRelationIncludes: Array<{
        variantKey: string;
        relationName: string;
        customize?: (q: SchemaQueryBuilder<any, any>) => void;
    }>;

    /** Memoized result of buildQuery(). null = needs rebuild. */
    cachedBuiltQuery: Knex.QueryBuilder | null;
}

const STATE = new WeakMap<SchemaQueryBuilder<any, any>, QueryBuilderState>();

export function getState(
    builder: SchemaQueryBuilder<any, any>
): QueryBuilderState {
    const s = STATE.get(builder);
    if (!s) {
        throw new Error(
            'SchemaQueryBuilder state not found — builder was not properly initialized'
        );
    }
    return s;
}

export function setState(
    builder: SchemaQueryBuilder<any, any>,
    state: QueryBuilderState
): void {
    STATE.set(builder, state);
}
