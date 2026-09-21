import type { Knex as KnexTypes } from 'knex';
import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import {
    aggregate,
    alias,
    createQuery,
    date,
    eq,
    isSqlIdentifier,
    number,
    object,
    query,
    string
} from './index.js';

const db = Knex({ client: 'pg' });
const User = object({ id: number().primaryKey(), name: string() }).hasTableName(
    'users'
);
const Task = object({
    id: number().primaryKey(),
    ownerId: number(),
    amount: number(),
    createdAt: date()
}).hasTableName('tasks');

declare const trx: KnexTypes.Transaction;

test('factories retain schema, alias and result inference through every call shape', async () => {
    const bound = createQuery(db);
    const transactional = bound.withTransaction(trx);
    const plain = query(db, Task);
    expectTypeOf(plain).not.toBeAny();
    expectTypeOf(await plain.select(t => ({ id: t.id }))).toEqualTypeOf<
        { id: number }[]
    >();
    expectTypeOf(
        await query(db, Task, db('tasks')).select(t => ({ amount: t.amount }))
    ).toEqualTypeOf<{ amount: number }[]>();
    for (const factory of [bound, transactional]) {
        const ordinary = factory(Task);
        expectTypeOf(ordinary).not.toBeAny();
        expectTypeOf(
            await ordinary.select(t => ({ createdAt: t.createdAt }))
        ).toEqualTypeOf<{ createdAt: Date }[]>();
        expectTypeOf(
            await factory(Task, db('tasks')).select(t => ({ id: t.id }))
        ).toEqualTypeOf<{ id: number }[]>();
        const aliased = factory(alias(Task, 'task'));
        expectTypeOf(aliased).not.toBeAny();
        const rows = await aliased
            .leftJoin(alias(User, 'owner'), t => eq(t.task.ownerId, t.owner.id))
            .select(t => ({ id: t.task.id, ownerName: t.owner.name }));
        expectTypeOf(rows).toEqualTypeOf<
            { id: number; ownerName: string | null }[]
        >();
        expectTypeOf(rows[0].id).not.toBeAny();
        // @ts-expect-error Unselected fields are unavailable.
        rows[0].amount;
        // @ts-expect-error Invalid schema fields must not become any.
        factory(Task).select(t => ({ missing: t.missing }));
        // @ts-expect-error Aliased tables retain their own fields.
        factory(alias(Task, 'task')).select(t => ({ missing: t.task.name }));
        // @ts-expect-error An aliased query does not accept a custom base query.
        factory(alias(Task, 'task'), db('tasks'));
    }
    expectTypeOf(
        await bound.transaction(async tx =>
            tx(Task).select(t => ({ id: t.id }))
        )
    ).toEqualTypeOf<{ id: number }[]>();
    expectTypeOf(
        await bound.transaction(async tx =>
            tx(alias(Task, 'task')).select(t => ({ id: t.task.id }))
        )
    ).toEqualTypeOf<{ id: number }[]>();
    const unknownName: unknown = 'task';
    if (isSqlIdentifier(unknownName))
        expectTypeOf(unknownName).toEqualTypeOf<string>();
});

test('flat join projection inference and nullable right-hand fields', async () => {
    const task = alias(Task, 'task');
    const owner = alias(User, 'owner');
    const result = await query(db, task)
        .leftJoin(owner, t => eq(t.task.ownerId, t.owner.id))
        .select(t => ({ id: t.task.id, owner: t.owner.name }));
    expectTypeOf(result).toEqualTypeOf<
        { id: number; owner: string | null }[]
    >();
    // @ts-expect-error unselected property
    result[0].amount;
    // @ts-expect-error wrong table property
    query(db, task).select(t => ({ name: t.task.name }));
    // @ts-expect-error duplicate alias
    query(db, task).join(task, t => eq(t.task.id, t.task.id));
    const bound = createQuery(db);
    expectTypeOf(
        await bound(owner).select(t => ({ name: t.owner.name }))
    ).toEqualTypeOf<{ name: string }[]>();
});

test('aggregate defaults and supplied output schemas infer accurately', async () => {
    expectTypeOf(await query(db, Task).countValue()).toEqualTypeOf<number>();
    expectTypeOf(await query(db, Task).sumValue(t => t.amount)).toEqualTypeOf<
        string | null
    >();
    expectTypeOf(
        await query(db, Task).maxValue(t => t.createdAt)
    ).toEqualTypeOf<Date | null>();
    expectTypeOf(
        await query(db, Task).maxValue('createdAt')
    ).toEqualTypeOf<Date | null>();
    expectTypeOf(await query(db, Task).minValue('amount')).toEqualTypeOf<
        number | string | null
    >();
    expectTypeOf(await query(db, Task).minValue(t => t.amount)).toEqualTypeOf<
        number | string | null
    >();
    expectTypeOf(
        await query(db, Task).countValue({ output: string() })
    ).toEqualTypeOf<string>();
    const results = await query(db, Task)
        .groupBy(t => t.ownerId)
        .select(t => ({
            ownerId: t.ownerId,
            count: aggregate.count(),
            sum: aggregate.sum(t.amount),
            avg: aggregate.avg(t.amount, {
                output: number().coerce().nullable()
            }),
            min: aggregate.min(t.createdAt)
        }));
    expectTypeOf(results).toEqualTypeOf<
        {
            ownerId: number;
            count: number;
            sum: string | null;
            avg: number | null;
            min: Date | null;
        }[]
    >();
});

test('both cursor call shapes remain typed', async () => {
    const queryBuilder = query(db, Task).select(t => ({ id: t.id }));
    const page = await queryBuilder.paginateAfter({
        limit: 5,
        orderBy: [
            { column: t => t.createdAt, direction: 'desc' },
            { column: t => t.id, direction: 'asc' }
        ]
    });
    expectTypeOf(page.data).toEqualTypeOf<{ id: number }[]>();
    await queryBuilder.paginateAfter({
        limit: 5,
        column: t => t.id,
        cursor: '5'
    });
    await queryBuilder.paginateAfter({
        limit: 5,
        // @ts-expect-error invalid cursor column
        orderBy: [{ column: t => t.missing, direction: 'asc' }]
    });
});
