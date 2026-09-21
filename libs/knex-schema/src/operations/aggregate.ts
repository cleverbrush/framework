import { ObjectSchemaBuilder } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { resolveColumnRef } from '../columns.js';
import {
    type AggregateKind,
    type AggregateOptions,
    compileAggregate,
    createAggregate,
    type SelectableColumn
} from '../expressions.js';
import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import type { ColumnRef } from '../types.js';
import {
    buildQuery,
    getEffectiveBaseQuery,
    getSchemaQueryBuilderCtor
} from './helpers.js';
import { getState } from './state.js';

/** Clone Framework metadata as well as Knex state; terminal helpers never mutate the source. */
export function cloneQuery(
    builder: SchemaQueryBuilder<any, any>
): SchemaQueryBuilder<any, any> {
    const state = getState(builder);
    const Constructor = getSchemaQueryBuilderCtor();
    const copy = new Constructor(
        state.knex,
        state.localSchema,
        state.baseQuery.clone()
    );
    Object.assign(getState(copy), state, {
        baseQuery: state.baseQuery.clone(),
        specs: state.specs.map(spec => ({
            ...spec,
            foreignQuery: spec.foreignQuery.clone()
        })),
        explicitSelects: state.explicitSelects
            ? [...state.explicitSelects]
            : null,
        projectionColumns: state.projectionColumns
            ? { ...state.projectionColumns }
            : null,
        projectionDecoders: { ...state.projectionDecoders },
        hiddenColumns: new Set(state.hiddenColumns),
        variantWhereFilters: [...state.variantWhereFilters],
        variantRelationIncludes: [...state.variantRelationIncludes],
        enabledVariants: state.enabledVariants
            ? new Set(state.enabledVariants)
            : null,
        cachedBuiltQuery: null
    });
    return copy;
}

/** Knex clause inspection is isolated here and covered by SQL regression tests. */
export function statements(query: Knex.QueryBuilder): any[] {
    return (query as any)._statements;
}

export function assertScalarSource(query: Knex.QueryBuilder): void {
    if (
        statements(query).some(
            s =>
                s.grouping === 'group' ||
                s.grouping === 'having' ||
                s.distinct ||
                s.distinctOn ||
                s.type === 'aggregate' ||
                s.type === 'aggregateRaw'
        )
    ) {
        throw new Error(
            'Scalar aggregates require an ungrouped, non-distinct source; use aggregate expressions for grouped results'
        );
    }
}

export async function scalarAggregate<
    S extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(
    builder: SchemaQueryBuilder<S, any>,
    kind: AggregateKind,
    column?: ColumnRef<S>,
    options?: AggregateOptions<any>
): Promise<any> {
    const copy = cloneQuery(builder);
    const state = getState(copy);
    // Materialize scopes before checking query shape/removing paging. A default
    // scope may itself supply pagination, selection, or grouping clauses.
    state.baseQuery = getEffectiveBaseQuery(copy).clone();
    state.skipDefaultScope = true;
    state.includeDeleted = true;
    state.onlyDeleted = false;
    assertScalarSource(state.baseQuery);
    if (Object.keys(state.projectionDecoders).length) {
        throw new Error(
            'Cannot apply a scalar aggregate to an aggregate projection'
        );
    }
    const tree = ObjectSchemaBuilder.getPropertiesFor(state.localSchema);
    const descriptor: SelectableColumn | undefined =
        column === undefined
            ? undefined
            : typeof column === 'function'
              ? column(tree as any)
              : tree[column];
    if (column !== undefined && !descriptor)
        throw new Error('Unknown aggregate column');
    const value = createAggregate(kind, descriptor, options);
    const compiled = compileAggregate(state.knex, value, () => {
        const resolved = resolveColumnRef(
            column as ColumnRef<any>,
            state.localSchema,
            kind,
            state.knex
        );
        return resolved;
    });
    // Preserve filtering joins (including required eager joins), but aggregate
    // the parent source rather than multiplying it by included collections.
    state.baseQuery
        .clearSelect()
        .clearOrder()
        .clear('limit')
        .clear('offset')
        .select(`${state.tableName}.*`);
    state.explicitSelects = null;
    state.projectionColumns = null;
    state.selectionMode = null;
    const source = buildQuery(copy).clearOrder().as('__cb_aggregate_source');
    const row = await state.knex
        .from(source)
        .select({ value: compiled.sql })
        .first();
    return compiled.decode(row.value);
}
