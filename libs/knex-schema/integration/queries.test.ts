import { randomUUID } from 'node:crypto';
import {
    aggregate,
    alias,
    array,
    boolean,
    createDb,
    date,
    defineEntity,
    eq,
    number,
    object,
    query,
    string
} from '@cleverbrush/orm';
import Knex from 'knex';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const connection = process.env.QUERY_TEST_DATABASE_URL;
if (!connection)
    throw new Error(
        'QUERY_TEST_DATABASE_URL is required; integration tests must not silently skip'
    );
const knex = Knex({ client: 'pg', connection, pool: { min: 0, max: 4 } });
const prefix = `cb_query_${randomUUID().replaceAll('-', '')}`;
const tables = {
    users: `${prefix}_users`,
    tasks: `${prefix}_tasks`,
    notes: `${prefix}_notes`
};

const User = object({
    id: number().primaryKey(),
    name: string().hasColumnName('display_name'),
    enabled: boolean(),
    deletedAt: date().optional().hasColumnName('deleted_at')
})
    .hasTableName(tables.users)
    .softDelete()
    .defaultScope((q: any) => q.where('enabled', true));
const Note = object({
    id: number().primaryKey(),
    taskId: number().hasColumnName('task_id'),
    body: string()
}).hasTableName(tables.notes);
const Task = object({
    id: number().primaryKey(),
    ownerId: number().hasColumnName('owner_id'),
    projectId: number().hasColumnName('project_id'),
    title: string(),
    amount: number().decimal(24, 6).optional(),
    createdAt: date().hasColumnName('created_at'),
    deletedAt: date().optional().hasColumnName('deleted_at'),
    owner: User.optional(),
    notes: array(Note).optional()
})
    .hasTableName(tables.tasks)
    .softDelete();
const taskEntity = defineEntity(Task)
    .belongsTo(
        t => t.owner,
        t => t.ownerId,
        t => t.id
    )
    .hasMany(
        t => t.notes,
        t => t.id,
        t => t.taskId
    );
const db = createDb(knex, { tasks: taskEntity });
const orderBy = [
    { column: (t: any) => t.createdAt, direction: 'desc' as const },
    { column: (t: any) => t.id, direction: 'desc' as const }
];

beforeAll(async () => {
    await knex.schema.createTable(tables.users, t => {
        t.integer('id').primary();
        t.text('display_name').notNullable();
        t.boolean('enabled').notNullable();
        t.timestamp('deleted_at').nullable();
    });
    await knex.schema.createTable(tables.tasks, t => {
        t.integer('id').primary();
        t.integer('owner_id').notNullable();
        t.integer('project_id').notNullable();
        t.text('title').notNullable();
        t.decimal('amount', 24, 6).nullable();
        t.specificType('created_at', 'timestamp(6)').notNullable();
        t.timestamp('deleted_at').nullable();
    });
    await knex.schema.createTable(tables.notes, t => {
        t.integer('id').primary();
        t.integer('task_id').notNullable();
        t.text('body').notNullable();
    });
    await knex(tables.users).insert([
        { id: 1, display_name: 'Alice', enabled: true },
        { id: 2, display_name: 'Bob', enabled: false },
        {
            id: 3,
            display_name: 'Deleted',
            enabled: true,
            deleted_at: '2026-01-01'
        }
    ]);
    await knex(tables.tasks).insert([
        {
            id: 105,
            owner_id: 1,
            project_id: 1,
            title: 'B',
            amount: '0.100000',
            created_at: '2026-01-01 10:00:00.000002'
        },
        {
            id: 104,
            owner_id: 2,
            project_id: 1,
            title: 'A',
            amount: '0.200000',
            created_at: '2026-01-01 10:00:00.000002'
        },
        {
            id: 103,
            owner_id: 3,
            project_id: 1,
            title: 'A',
            amount: null,
            created_at: '2026-01-01 10:00:00.000002'
        },
        {
            id: 102,
            owner_id: 1,
            project_id: 1,
            title: 'C',
            amount: '9007199254740993.000001',
            created_at: '2026-01-01 10:00:00.000001'
        },
        {
            id: 101,
            owner_id: 1,
            project_id: 2,
            title: 'Other project',
            amount: '99',
            created_at: '2026-01-01 09:59:00'
        },
        {
            id: 100,
            owner_id: 1,
            project_id: 1,
            title: 'Deleted task',
            amount: '1000',
            created_at: '2026-01-01 09:58:00',
            deleted_at: '2026-01-01'
        }
    ]);
    await knex(tables.notes).insert([
        { id: 1, task_id: 104, body: 'one' },
        { id: 2, task_id: 104, body: 'two' },
        { id: 3, task_id: 103, body: 'three' }
    ]);
});

afterAll(async () => {
    // Only this suite's randomly named fixtures in its explicitly supplied test DB.
    for (const table of [tables.notes, tables.tasks, tables.users])
        await knex.schema.dropTableIfExists(table);
    await knex.destroy();
});

describe('flat joins', () => {
    it('preserves left joins when the right-hand schema has scopes and soft deletion', async () => {
        const rows = await query(knex, alias(Task, 'task'))
            .leftJoin(alias(User, 'owner'), t => eq(t.task.ownerId, t.owner.id))
            .where(t => t.task.projectId, 1)
            .orderBy(t => t.task.id, 'desc')
            .select(t => ({ id: t.task.id, owner: t.owner.name }));
        expect(rows).toEqual([
            { id: 105, owner: 'Alice' },
            { id: 104, owner: null },
            { id: 103, owner: null },
            { id: 102, owner: 'Alice' }
        ]);
    });

    it('groups joined rows with exact aggregates and numeric HAVING', async () => {
        const rows = await query(knex, alias(Task, 'task'))
            .join(alias(User, 'owner'), t => eq(t.task.ownerId, t.owner.id))
            .where(t => t.task.projectId, 1)
            .groupBy(t => t.owner.name)
            .having(() => aggregate.count(), '>', 1)
            .select(t => ({
                owner: t.owner.name,
                count: aggregate.count(),
                total: aggregate.sum(t.task.amount)
            }));
        expect(rows).toEqual([
            { owner: 'Alice', count: 2, total: '9007199254740993.100001' }
        ]);
    });
});

describe('eager ordering', () => {
    it('keeps tied parent order and page size with one-to-many and one-to-one includes', async () => {
        const rows = await db.tasks
            .where(t => t.projectId, 1)
            .orderBy(t => t.title)
            .orderBy(t => t.id, 'desc')
            .include(t => t.notes)
            .include(t => t.owner)
            .limit(2);
        expect(rows.map(row => row.id)).toEqual([104, 103]);
        expect(rows[0].notes).toHaveLength(2);
        expect(rows[1].notes).toHaveLength(1);
        expect(Object.keys(rows[0]).some(key => key.startsWith('__cb_'))).toBe(
            false
        );
    });

    it('handles projected-away sort/FK fields, mapped aliases, raw bindings, offset and transactions', async () => {
        await knex.transaction(async trx => {
            const rows = await query(knex, Task)
                .where(t => t.projectId, 1)
                .orderByRaw('case when ?? = ? then 0 else 1 end, ?? desc', [
                    'id',
                    102,
                    'id'
                ])
                .select(t => ({ taskId: t.id }))
                .joinOne({
                    foreignSchema: User,
                    localColumn: t => t.ownerId,
                    foreignColumn: t => t.id,
                    as: 'user',
                    required: false
                })
                .offset(1)
                .limit(2)
                .transacting(trx);
            expect(rows.map(row => row.taskId)).toEqual([105, 104]);
            expect(Object.keys(rows[0]).sort()).toEqual(['taskId', 'user']);
        });
    });

    it('retains distinct/grouped parent cardinality', async () => {
        for (const distinct of [true, false]) {
            let q = query(knex, Task)
                .where(t => t.projectId, 1)
                .select(t => ({ owner_id: t.ownerId }))
                .orderBy(t => t.ownerId);
            q = distinct ? q.distinct() : q.groupBy(t => t.ownerId);
            const rows = await q.joinOne({
                foreignSchema: User,
                localColumn: t => t.ownerId,
                foreignColumn: t => t.id,
                as: 'user',
                required: false
            });
            expect(rows.map(row => row.owner_id)).toEqual([1, 2, 3]);
        }
    });

    it.each([
        '"taskId" desc',
        '1 desc'
    ])('retains ordering by a projected alias or position: %s', async order => {
        const rows = await query(knex, Task)
            .where(t => t.projectId, 1)
            .select(t => ({ taskId: t.id }))
            .orderByRaw(order)
            .joinMany({
                foreignSchema: Note,
                localColumn: t => t.id,
                foreignColumn: t => t.taskId,
                as: 'notes'
            })
            .limit(2);
        expect(rows.map(row => row.taskId)).toEqual([105, 104]);
    });
});

describe('aggregate results', () => {
    const tasks = () => db.tasks.where(t => t.projectId, 1);
    it('counts rows, non-null values and distinct values without retaining page limits', async () => {
        expect(await tasks().limit(1).offset(10).countValue()).toBe(4);
        expect(await tasks().countValue(t => t.amount)).toBe(3);
        expect(await tasks().countDistinctValue(t => t.ownerId)).toBe(3);
        expect(await tasks().countValue({ output: string() })).toBe('4');
    });

    it('counts parent rows through required relations and collection includes', async () => {
        expect(
            await tasks()
                .include(t => t.notes)
                .countValue()
        ).toBe(4);
        const visibleOwner = query(knex, Task)
            .where(t => t.projectId, 1)
            .joinOne({
                foreignSchema: User,
                foreignQuery: query(knex, User),
                localColumn: t => t.ownerId,
                foreignColumn: t => t.id,
                as: 'owner',
                required: true
            });
        expect(await visibleOwner.countValue()).toBe(2);
        expect(await visibleOwner.sumValue(t => t.amount)).toBe(
            '9007199254740993.100001'
        );
    });

    it('retains default-scope filters while ignoring default-scope pagination', async () => {
        const Scoped = object({ id: number().primaryKey() })
            .hasTableName(tables.tasks)
            .defaultScope((q: any) =>
                q
                    .where('project_id', 1)
                    .whereNull('deleted_at')
                    .limit(1)
                    .offset(1)
            );
        expect(await query(knex, Scoped).countValue()).toBe(4);
        const Grouped = Scoped.defaultScope((q: any) => q.groupBy('id'));
        await expect(query(knex, Grouped).countValue()).rejects.toThrow(
            'ungrouped'
        );
    });

    it('preserves sum/average/decimal extrema and returns date/string extrema', async () => {
        expect(await tasks().sumValue(t => t.amount)).toBe(
            '9007199254740993.300001'
        );
        const native = await knex(tables.tasks)
            .where({ project_id: 1 })
            .whereNull('deleted_at')
            .avg({ value: 'amount' })
            .first();
        expect(await tasks().avgValue(t => t.amount)).toBe(native!.value);
        expect(await tasks().minValue(t => t.amount)).toBe('0.100000');
        expect(await tasks().maxValue(t => t.amount)).toBe(
            '9007199254740993.000001'
        );
        expect(await tasks().minValue(t => t.title)).toBe('A');
        expect(await tasks().maxValue(t => t.createdAt)).toBeInstanceOf(Date);
    });

    it('handles empty/all-null inputs and caller-supplied parsers', async () => {
        const empty = () => query(knex, Task).where(t => t.id, -1);
        expect(await empty().countValue()).toBe(0);
        for (const method of [
            'sumValue',
            'avgValue',
            'minValue',
            'maxValue'
        ] as const) {
            expect(await empty()[method]('amount')).toBe(null);
        }
        expect(
            await query(knex, Task)
                .where(t => t.id, 103)
                .sumValue(t => t.amount)
        ).toBe(null);
        expect(
            await query(knex, Task)
                .where(t => t.id, 105)
                .sumValue(t => t.amount, {
                    output: number().isFloat().coerce()
                })
        ).toBe(0.1);
        await expect(
            empty().sumValue(t => t.amount, { output: string() })
        ).rejects.toThrow();
    });

    it('decodes every grouped aggregate without treating rows as entities', async () => {
        const rows = await query(knex, Task)
            .where(t => t.projectId, 1)
            .groupBy(t => t.ownerId)
            .orderBy(t => t.ownerId)
            .select(t => ({
                owner: t.ownerId,
                count: aggregate.count(),
                distinct: aggregate.countDistinct(t.id),
                sum: aggregate.sum(t.amount),
                avg: aggregate.avg(t.amount),
                min: aggregate.min(t.title),
                max: aggregate.max(t.title)
            }));
        expect(rows.map(row => [row.owner, row.count, row.distinct])).toEqual([
            [1, 2, 2],
            [2, 1, 1],
            [3, 1, 1]
        ]);
        expect(rows[2]).toEqual({
            owner: 3,
            count: 1,
            distinct: 1,
            sum: null,
            avg: null,
            min: 'A',
            max: 'A'
        });
        await expect(
            query(knex, Task)
                .groupBy(t => t.ownerId)
                .countValue()
        ).rejects.toThrow('ungrouped');
    });

    it('retains source state and transaction visibility', async () => {
        const base = query(knex, Task)
            .where(t => t.projectId, 1)
            .select(t => ({ id: t.id }))
            .limit(1);
        const before = base.toQuery();
        expect(await base.countValue()).toBe(4);
        expect(base.toQuery()).toBe(before);
        await expect(
            knex.transaction(async trx => {
                await trx(tables.tasks).insert({
                    id: 999,
                    owner_id: 1,
                    project_id: 1,
                    title: 'temporary',
                    amount: 1,
                    created_at: '2026-01-01'
                });
                expect(
                    await db
                        .withTransaction(trx)
                        .tasks.where(t => t.projectId, 1)
                        .countValue()
                ).toBe(5);
                const rows = await query(knex, alias(Task, 'task'))
                    .where(t => t.task.id, 999)
                    .select(t => ({ id: t.task.id }))
                    .transacting(trx);
                expect(rows).toEqual([{ id: 999 }]);
                throw new Error('test rollback');
            })
        ).rejects.toThrow('test rollback');
        expect(await tasks().countValue()).toBe(4);
    });

    it('does not attach aggregate DTOs to the tracked entity identity map', async () => {
        const tracked = createDb(
            knex,
            { tasks: taskEntity },
            { tracking: true }
        );
        const original = await tracked.tasks.find(105);
        const rows = await tracked.tasks
            .where(t => t.id, 105)
            .groupBy(t => t.id)
            .select(t => ({ id: t.id, title: aggregate.count() }))
            .execute();
        expect(rows).toEqual([{ id: 105, title: 1 }]);
        const scalarObject = await tracked.tasks
            .where(t => t.id, 105)
            .countValue({
                output: { parse: value => ({ id: 105, title: value }) }
            });
        expect(scalarObject).toEqual({ id: 105, title: '1' });
        expect(original!.title).toBe('B');
        expect(await tracked.tasks.find(105)).toBe(original);
    });
});

describe('composite cursor pages', () => {
    it('applies required relation filters before testing whether another page exists', async () => {
        const base = () =>
            query(knex, Task)
                .where(t => t.projectId, 1)
                .joinOne({
                    foreignSchema: User,
                    foreignQuery: query(knex, User),
                    localColumn: t => t.ownerId,
                    foreignColumn: t => t.id,
                    as: 'owner',
                    required: true
                });
        const first = await base().paginateAfter({ limit: 1, orderBy });
        expect(first.data.map(t => t.id)).toEqual([105]);
        expect(first.hasMore).toBe(true);
        const last = await base().paginateAfter({
            limit: 1,
            orderBy,
            cursor: first.nextCursor
        });
        expect(last.data.map(t => t.id)).toEqual([102]);
        expect(last.hasMore).toBe(false);
    });

    it('does not skip tied timestamps and retains microsecond precision with projections and includes', async () => {
        const base = () =>
            query(knex, Task)
                .where(t => t.projectId, 1)
                .select(t => ({ taskId: t.id }))
                .joinMany({
                    foreignSchema: Note,
                    localColumn: t => t.id,
                    foreignColumn: t => t.taskId,
                    as: 'notes'
                });
        const first = await base().paginateAfter({ limit: 2, orderBy });
        expect(first.data.map(t => t.taskId)).toEqual([105, 104]);
        const second = await base().paginateAfter({
            limit: 2,
            orderBy,
            cursor: first.nextCursor
        });
        expect(second.data.map(t => t.taskId)).toEqual([103, 102]);
        expect(second.hasMore).toBe(false);
        expect(second.nextCursor).toBe(null);
        expect(Object.keys(first.data[0]).sort()).toEqual(['notes', 'taskId']);
        expect(
            Buffer.from(first.nextCursor!, 'base64url').toString()
        ).toContain('000002');
    });

    it('supports mixed directions, empty pages and ordinary projections', async () => {
        const mixed = [
            { column: (t: any) => t.createdAt, direction: 'desc' as const },
            { column: (t: any) => t.id, direction: 'asc' as const }
        ];
        const base = () => db.tasks.where(t => t.projectId, 1);
        const first = await base().paginateAfter({ limit: 2, orderBy: mixed });
        const second = await base().paginateAfter({
            limit: 2,
            orderBy: mixed,
            cursor: first.nextCursor
        });
        expect([...first.data, ...second.data].map(t => t.id)).toEqual([
            103, 104, 105, 102
        ]);
        const empty = await db.tasks
            .where(t => t.projectId, -1)
            .paginateAfter({ limit: 1, orderBy });
        expect(empty).toEqual({ data: [], hasMore: false, nextCursor: null });
        const projected = await query(knex, Task)
            .where(t => t.projectId, 1)
            .select(t => t.id)
            .paginateAfter({ limit: 2, orderBy });
        expect(Object.keys(projected.data[0])).toEqual(['id']);
    });

    it('rejects a cursor from a different sort and preserves authorization scope', async () => {
        const first = await db.tasks
            .where(t => t.projectId, 1)
            .paginateAfter({ limit: 2, orderBy });
        await expect(
            db.tasks.paginateAfter({
                limit: 2,
                cursor: first.nextCursor,
                orderBy: [{ column: t => t.id, direction: 'asc' }]
            })
        ).rejects.toThrow('incompatible');
        const anotherProject = await db.tasks
            .where(t => t.projectId, 2)
            .paginateAfter({ limit: 2, cursor: first.nextCursor, orderBy });
        expect(anotherProject.data.map(t => t.id)).toEqual([101]);
    });

    it('keeps the existing single-column cursor API operational', async () => {
        const page = await db.tasks
            .where(t => t.projectId, 1)
            .paginateAfter({ limit: 2, column: t => t.id, direction: 'desc' });
        expect(page.data.map(t => t.id)).toEqual([105, 104]);
        expect(page.nextCursor).toBe('104');
    });

    it('groups an existing OR filter before applying continuation predicates', async () => {
        const base = () =>
            query(knex, Task)
                .where(t => t.id, 105)
                .orWhere(t => t.id, 104);
        const first = await base().paginateAfter({ limit: 1, orderBy });
        const second = await base().paginateAfter({
            limit: 1,
            orderBy,
            cursor: first.nextCursor
        });
        expect(first.data.map(t => t.id)).toEqual([105]);
        expect(second.data.map(t => t.id)).toEqual([104]);
    });

    it('supports composite primary and unique keys without assuming an id field', async () => {
        const Keyed = object({
            ownerId: number().hasColumnName('owner_id'),
            id: number()
        })
            .hasTableName(tables.tasks)
            .hasPrimaryKey(['ownerId', 'id']);
        const page = await query(knex, Keyed)
            .where(t => t.ownerId, 1)
            .paginateAfter({
                limit: 1,
                orderBy: [
                    { column: t => t.ownerId, direction: 'asc' },
                    { column: t => t.id, direction: 'desc' }
                ]
            });
        expect(page.data[0].id).toBe(105);
        const Unique = object({ id: number().unique() }).hasTableName(
            tables.tasks
        );
        expect(
            (
                await query(knex, Unique).paginateAfter({
                    limit: 1,
                    orderBy: [{ column: t => t.id, direction: 'desc' }]
                })
            ).data[0].id
        ).toBe(105);
    });

    it('retains numeric cursor precision beyond the safe integer range', async () => {
        // Cursor metadata retains the exact numeric independently of the
        // public projection, which does not even include the sort column.
        const Exact = object({
            id: number().primaryKey(),
            amount: number().decimal(24, 6)
        }).hasTableName(tables.tasks);
        const orderBy = [
            { column: 'amount' as const, direction: 'desc' as const },
            { column: 'id' as const, direction: 'desc' as const }
        ];
        const base = () =>
            query(knex, Exact)
                .whereIn(t => t.id, [102, 104, 105])
                .select(t => ({ id: t.id }));
        const first = await base().paginateAfter({ limit: 1, orderBy });
        const second = await base().paginateAfter({
            limit: 2,
            orderBy,
            cursor: first.nextCursor
        });
        expect(first.data).toEqual([{ id: 102 }]);
        expect(second.data).toEqual([{ id: 104 }, { id: 105 }]);
        expect(
            Buffer.from(first.nextCursor!, 'base64url').toString()
        ).toContain('9007199254740993.000001');
    });
});
