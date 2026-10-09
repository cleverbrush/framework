// @cleverbrush/knex-schema — Shared mutable state store for QuerySource

import type { ObjectSchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import type { QuerySource } from '../QuerySource.js';
import type {
    ResolvedVariantConfig,
    ValidatedSpec,
    VariantWhereFilter
} from '../types.js';

export interface QueryBuilderState {
    /** Decode write-returning property rows before lifecycle hooks observe them. */
    decodeRow?: (row: Record<string, any>) => Record<string, any>;
    /** Raw callbacks have no statically declared result shape for opt-in reads. */
    opaqueReadShape?: boolean;
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
    /** Output aliases and decoders for typed object projections. */
    projectionColumns: Record<string, string | Knex.Raw> | null;
    projectionDecoders: Record<string, (value: unknown) => unknown>;
    hiddenColumns: Set<string>;

    /** Immutable public query snapshot supplied to observational delete hooks. */
    hookQuery?: unknown;

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
        customize?: (q: QuerySource<any, any>) => void;
    }>;

    /** Memoized result of buildQuery(). null = needs rebuild. */
    cachedBuiltQuery: Knex.QueryBuilder | null;
}

const STATE = new WeakMap<QuerySource<any, any>, QueryBuilderState>();

export function getState(builder: QuerySource<any, any>): QueryBuilderState {
    const s = STATE.get(builder);
    if (!s) {
        throw new Error(
            'QuerySource state not found — builder was not properly initialized'
        );
    }
    return s;
}

export function setState(
    builder: QuerySource<any, any>,
    state: QueryBuilderState
): void {
    STATE.set(builder, state);
}
