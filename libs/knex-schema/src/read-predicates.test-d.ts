import type { InferType } from '@cleverbrush/schema';
import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import { alias, eq } from './aliased-query.js';
import { number, object, string } from './extension.js';
import type { ReadPredicateBuilder } from './read-predicates.js';
import { query } from './SchemaQueryBuilder.js';

const knex = Knex({ client: 'pg' });
const Item = object({
    id: number().primaryKey(),
    name: string(),
    amount: number().decimal(18, 2).optional()
}).hasTableName('items');

test('ordinary reader predicates retain projection types and contextual groups', async () => {
    const read = query(knex, Item).select(t => ({
        name: t.name,
        amount: t.amount
    }));
    const filtered = read
        .where(p => p.where(t => t.id, 1).orWhere(t => t.name, 'two'))
        .whereIn(t => t.id, knex('links').select('item_id'))
        .whereExists(
            knex('links')
                .select('item_id')
                .where(
                    'item_id',
                    read.ref(t => t.id)
                )
        )
        .whereRaw('?? = ?', [read.ref(t => t.name), 'name'])
        .orderByRaw('?? asc', [read.ref(t => t.name)]);
    expectTypeOf(filtered.rowSchema).toEqualTypeOf(read.rowSchema);
    expectTypeOf(await filtered).toEqualTypeOf<
        { name: string; amount: string | null }[]
    >();
    // @ts-expect-error only projected fields are available on rows
    const _id: number = (await filtered)[0].id;
    // @ts-expect-error unknown selector properties are rejected
    read.where(p => p.where(t => t.missing, 1));
    // @ts-expect-error refs use the same typed column context
    read.ref(t => t.missing);
    // @ts-expect-error grouped callbacks cannot be async
    read.where(async p => {
        p.where(t => t.id, 1);
    });
    read.where(p => {
        expectTypeOf(p).toExtend<ReadPredicateBuilder<any>>();
        // @ts-expect-error groups cannot shape rows
        p.select(t => t.id);
        // @ts-expect-error groups cannot order rows
        p.orderByRaw('id');
        // @ts-expect-error groups cannot execute SQL
        p.execute();
        // @ts-expect-error group lifecycle is owned by the reader
        p.finish();
        return p;
    });
    // @ts-expect-error unrestricted mutation is still unavailable
    read.apply(q => q.select('*'));
});

test('aliased selectors preserve joined nullability and exact storage types', async () => {
    const read = query(knex, alias(Item, 'item'))

        .leftJoin(alias(Item, 'parent'), t => eq(t.item.id, t.parent.id))
        .select(t => ({
            id: t.item.id,
            parentName: t.parent.name,
            amount: t.parent.amount
        }));
    const filtered = read
        .where(t => t.item.id, 1)
        .andWhere(p =>
            p
                .whereNull(t => t.parent.name)
                .orWhere(n => n.where(t => t.parent.id, 2))
        )
        .orWhereNotExists(knex('links').select('item_id'))
        .orderByRaw('?? asc', [read.ref(t => t.item.id)]);
    expectTypeOf<InferType<typeof filtered.rowSchema>>().toEqualTypeOf<{
        id: number;
        parentName: string | null;
        amount: string | null;
    }>();
    expectTypeOf(await filtered).toEqualTypeOf<
        InferType<typeof read.rowSchema>[]
    >();
    // @ts-expect-error unknown aliases are rejected inside groups
    filtered.where(p => p.where(t => t.unknown.id, 1));
    // @ts-expect-error async group callbacks are rejected on aliased readers too
    filtered.orWhere(async p => p.where(t => t.item.id, 1));
});
