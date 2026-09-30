// @cleverbrush/knex-schema — DELETE / soft-delete / restore operations

import type { QuerySource } from '../QuerySource.js';
import { returningReadColumns } from '../read-schema.js';
import { getSoftDelete, invalidateCache, mapRow } from './helpers.js';
import { getState } from './state.js';

export async function deleteImpl(
    builder: QuerySource<any, any>
): Promise<number> {
    const state = getState(builder);

    const hooks =
        ((state.localSchema as any).getExtension?.('beforeDelete') as
            | Function[]
            | undefined) ?? [];
    for (const hook of hooks) {
        await hook(state.hookQuery ?? builder);
    }

    const softDelete = getSoftDelete(builder);
    if (softDelete) {
        return state.baseQuery.update({
            [softDelete.column]: state.knex.fn.now()
        });
    }
    return state.baseQuery.delete();
}

export function withDeletedImpl(builder: QuerySource<any, any>): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.includeDeleted = true;
    return builder;
}

export function onlyDeletedImpl(builder: QuerySource<any, any>): any {
    const state = getState(builder);
    invalidateCache(builder);
    state.onlyDeleted = true;
    state.includeDeleted = true;
    return builder;
}

export async function hardDeleteImpl(
    builder: QuerySource<any, any>
): Promise<number> {
    const state = getState(builder);
    const hooks =
        ((state.localSchema as any).getExtension?.('beforeDelete') as
            | Function[]
            | undefined) ?? [];
    for (const hook of hooks) {
        await hook(state.hookQuery ?? builder);
    }
    return state.baseQuery.delete();
}

export async function restoreImpl(
    builder: QuerySource<any, any>
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
        .returning(returningReadColumns(state.knex, state.localSchema));
    return rows.map((row: any) => mapRow(builder, row));
}
