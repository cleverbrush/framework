// @cleverbrush/knex-schema — UPDATE / bulk-update operations

import type { InferType } from '@cleverbrush/schema';
import type { Knex } from 'knex';
import { buildColumnMap } from '../columns.js';
import type { SchemaQueryBuilder } from '../SchemaQueryBuilder.js';
import {
    getTimestamps,
    mapObjectToColumns,
    mapRow,
    resolvePkColumns
} from './helpers.js';
import { getState } from './state.js';

export async function updateImpl(
    builder: SchemaQueryBuilder<any, any>,
    data: Partial<InferType<any>>
): Promise<any[]> {
    const state = getState(builder);

    let processedData = { ...(data as Record<string, any>) };

    const beforeHooks =
        ((state.localSchema as any).getExtension?.('beforeUpdate') as
            | Function[]
            | undefined) ?? [];
    for (const hook of beforeHooks) {
        processedData = (await hook(processedData)) ?? processedData;
    }

    const mapped = mapObjectToColumns(builder, processedData);

    const timestamps = getTimestamps(builder);
    if (timestamps) {
        mapped[timestamps.updatedAt] = state.knex.fn.now();
    }

    const rows = await state.baseQuery.update(mapped).returning('*');
    return rows.map((row: any) => mapRow(builder, row));
}

export async function bulkUpdateImpl(
    builder: SchemaQueryBuilder<any, any>,
    updates: ReadonlyArray<{
        where: Partial<InferType<any>>;
        set: Partial<InferType<any>>;
    }>
): Promise<number> {
    if (updates.length === 0) return 0;

    const state = getState(builder);
    const pk = resolvePkColumns(builder);
    const { propToCol } = buildColumnMap(state.localSchema as any);
    const beforeHooks =
        ((state.localSchema as any).getExtension?.('beforeUpdate') as
            | Function[]
            | undefined) ?? [];
    const timestamps = getTimestamps(builder);

    const processed: Array<{
        pkValues: unknown[];
        set: Record<string, any>;
    }> = [];
    for (const entry of updates) {
        let setData = { ...(entry.set as Record<string, any>) };
        for (const hook of beforeHooks) {
            setData = (await hook(setData)) ?? setData;
        }
        const setMapped = mapObjectToColumns(builder, setData);
        if (timestamps) {
            setMapped[timestamps.updatedAt] = state.knex.fn.now();
        }

        const whereRec = entry.where as Record<string, unknown>;
        const pkValues: unknown[] = [];
        for (const propKey of pk.propertyKeys) {
            const value =
                propKey in whereRec
                    ? whereRec[propKey]
                    : (whereRec[propToCol.get(propKey) ?? propKey] as
                          | unknown
                          | undefined);
            if (value === undefined) {
                throw new Error(
                    `bulkUpdate: each \`where\` clause must include the entity's primary key (missing "${propKey}").`
                );
            }
            pkValues.push(value);
        }
        processed.push({ pkValues, set: setMapped });
    }

    const allSetCols = new Set<string>();
    for (const p of processed) {
        for (const k of Object.keys(p.set)) allSetCols.add(k);
    }
    if (allSetCols.size === 0) return 0;

    const knex = state.knex;
    const updateExpr: Record<string, any> = {};
    for (const col of allSetCols) {
        const fragments: string[] = [];
        const bindings: unknown[] = [];
        for (const p of processed) {
            if (!(col in p.set)) continue;
            if (pk.columnNames.length === 1) {
                fragments.push('WHEN ?? = ? THEN ?');
                bindings.push(pk.columnNames[0], p.pkValues[0], p.set[col]);
            } else {
                const conditions = pk.columnNames
                    .map(() => '?? = ?')
                    .join(' AND ');
                fragments.push(`WHEN ${conditions} THEN ?`);
                for (let i = 0; i < pk.columnNames.length; i++) {
                    bindings.push(pk.columnNames[i], p.pkValues[i]);
                }
                bindings.push(p.set[col]);
            }
        }
        if (fragments.length === 0) continue;
        updateExpr[col] = knex.raw(`CASE ${fragments.join(' ')} ELSE ?? END`, [
            ...bindings,
            col
        ] as any);
    }

    let qb: any = knex(state.tableName).update(updateExpr);
    if (pk.columnNames.length === 1) {
        qb = qb.whereIn(
            pk.columnNames[0],
            processed.map(p => p.pkValues[0])
        );
    } else {
        qb = qb.where(function (this: Knex.QueryBuilder) {
            for (const p of processed) {
                this.orWhere(function (this: Knex.QueryBuilder) {
                    for (let i = 0; i < pk.columnNames.length; i++) {
                        this.andWhere(pk.columnNames[i], p.pkValues[i] as any);
                    }
                });
            }
        });
    }

    return await qb;
}
