// @cleverbrush/knex-schema — DELETE / soft-delete / restore operations

import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import { getSoftDelete, invalidateCache, mapRow } from './helpers.js';
import { getState } from './state.js';

export async function deleteImpl(
    builder: SchemaQueryBuilder<any, any>
): Promise<number> {
    const state = getState(builder);

    const hooks =
        ((state.localSchema as any).getExtension?.('beforeDelete') as
            | Function[]
            | undefined) ?? [];
    for (const hook of hooks) {
        await hook(builder);
    }

    const softDelete = getSoftDelete(builder);
    if (softDelete) {
        return state.baseQuery.update({
            [softDelete.column]: state.knex.fn.now()
        });
    }
    return state.baseQuery.delete();
}

export function withDeletedImpl(builder: SchemaQueryBuilder<any, any>): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.includeDeleted = true;
    return builder;
}

export function onlyDeletedImpl(builder: SchemaQueryBuilder<any, any>): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.onlyDeleted = true;
    state.includeDeleted = true;
    return builder;
}

export async function hardDeleteImpl(
    builder: SchemaQueryBuilder<any, any>
): Promise<number> {
    const state = getState(builder);
    const hooks =
        ((state.localSchema as any).getExtension?.('beforeDelete') as
            | Function[]
            | undefined) ?? [];
    for (const hook of hooks) {
        await hook(builder);
    }
    return state.baseQuery.delete();
}

export async function restoreImpl(
    builder: SchemaQueryBuilder<any, any>
): Promise<any[]> {
    const state = getState(builder);
    const softDelete = getSoftDelete(builder);
    if (!softDelete) {
        throw new Error(
            'Schema does not have soft delete enabled. Use .softDelete() on the schema.'
        );
    }
    const rows = await state.baseQuery
        .update({ [softDelete.column]: null })
        .returning('*');
    return rows.map((row: any) => mapRow(builder, row));
}
