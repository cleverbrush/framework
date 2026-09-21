import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import {
    aggregate,
    alias,
    createQuery,
    date,
    eq,
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
