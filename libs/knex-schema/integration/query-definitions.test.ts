import { randomUUID } from 'node:crypto';
import {
    aggregate,
    alias,
    date,
    defineEntity,
    eq,
    number,
    object,
    parameter,
    query,
    string
} from '@cleverbrush/orm';
import Knex from 'knex';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const prefix = `cb_definition_${randomUUID().replaceAll('-', '')}`;
const users = `${prefix}_users`;
const tasks = `${prefix}_tasks`;
const assets = `${prefix}_assets`;
const photos = `${prefix}_photos`;
const User = object({
    id: number().primaryKey(),
    name: string().hasColumnName('display_name'),
    birthday: date().optional(),
    balance: number().decimal(24, 6),
    profile: object({ score: number() }).optional()
}).hasTableName(users);
const Task = defineEntity(
    object({
        id: number().primaryKey(),
        ownerId: number().hasColumnName('owner_id'),
        owner: User.optional()
    }).hasTableName(tasks)
).belongsTo(
    t => t.owner,
    t => t.ownerId,
    t => t.id
);
const Asset = defineEntity(
    object({ id: number().primaryKey(), kind: string() }).hasTableName(assets)
)
    .discriminator('kind')
    .stiVariant('note', object({ text: string() }))
    .ctiVariant(
        'photo',
        defineEntity(
            object({
                assetId: number().hasColumnName('asset_id'),
                width: number()
            }).hasTableName(photos)
        ),
        t => t.assetId
    );

// Definitions genuinely precede connection construction, as in separate modules.
const findUser = query(User).where(t => t.id, parameter('id'));
const listUsers = query(User).orderBy('id');
const connection = process.env.QUERY_TEST_DATABASE_URL;
if (!connection) throw new Error('QUERY_TEST_DATABASE_URL is required');
const knex = Knex({ client: 'pg', connection });
const second = Knex({ client: 'pg', connection });

beforeAll(async () => {
    await knex.schema.createTable(users, t => {
        t.integer('id').primary();
        t.text('display_name');
        t.timestamp('birthday', { useTz: true });
        t.decimal('balance', 24, 6);
        t.jsonb('profile');
    });
    await knex.schema.createTable(tasks, t => {
        t.integer('id').primary();
        t.integer('owner_id');
    });
    await knex.schema.createTable(assets, t => {
        t.integer('id').primary();
        t.text('kind');
        t.text('text');
    });
    await knex.schema.createTable(photos, t => {
        t.integer('asset_id').primary();
        t.integer('width');
    });
    await knex(users).insert([
        {
            id: 1,
            display_name: 'Jane',
            birthday: '2000-01-01T00:00:00Z',
            balance: '9007199254740993.000001',
            profile: { score: 3 }
        },
        {
            id: 2,
            display_name: 'John',
            birthday: null,
            balance: '2.500000',
            profile: null
        }
    ]);
    await knex(tasks).insert([
        { id: 10, owner_id: 1 },
        { id: 20, owner_id: 2 }
    ]);
    await knex(assets).insert([
        { id: 1, kind: 'note', text: 'hello' },
        { id: 2, kind: 'photo', text: null }
    ]);
    await knex(photos).insert({ asset_id: 2, width: 100 });
});
afterAll(async () => {
    for (const table of [photos, assets, tasks, users])
        await knex.schema.dropTableIfExists(table);
    await Promise.all([knex.destroy(), second.destroy()]);
});

describe('query definitions against PostgreSQL', () => {
    it('executes parameterless and concurrent parameterized reads with lossless decoding', async () => {
        const [one, two, anotherClient] = await Promise.all([
            findUser(knex, 1),
            findUser(knex, 2),
            findUser(second, 1)
        ]);
        expect(one).toEqual(anotherClient);
        expect(one[0]).toMatchObject({
            name: 'Jane',
            balance: '9007199254740993.000001',
            birthday: new Date('2000-01-01'),
            profile: { score: 3 }
        });
        expect(two[0]).toMatchObject({
            name: 'John',
            birthday: null,
            profile: null
        });
        expect(await listUsers(knex)).toEqual(await listUsers.query(knex));
        expect(await findUser.query(knex, 1).first()).toEqual(one[0]);
        expect(await findUser.select('name')(knex, 2)).toEqual([
            { name: 'John' }
        ]);
        expect(
            await query(User).where(t => t.profile.score, parameter('score'))(
                knex,
                3
            )
        ).toEqual(one);
    });

    it('uses the supplied transaction for reads and bound writes, without taking ownership', async () => {
        const trx = await knex.transaction();
        try {
            const updated = await findUser
                .query(trx, 1)
                .update({ name: 'Pending' });
            expect(updated[0].name).toBe('Pending');
            expect((await findUser(trx, 1))[0].name).toBe('Pending');
            expect((await findUser(second, 1))[0].name).toBe('Jane');
            expect(
                await findUser.query(knex, 1).transacting(trx).first()
            ).toMatchObject({ name: 'Pending' });
            const nested = query(User)
                .where(t => t.profile.score, parameter('score'))
                .query(knex, 3)
                .transacting(trx);
            expect((await nested.first())?.name).toBe('Pending');
            expect(trx.isCompleted()).toBe(false);
        } finally {
            await trx.rollback();
        }
        expect((await findUser(knex, 1))[0].name).toBe('Jane');
    });

    it('keeps transaction-only compiled derivatives safe and cached', async () => {
        const boundTemplate = query(User)
            .query(knex)
            .where(t => t.id, parameter('id'));
        const sql = boundTemplate.toSQL(1);
        const trx = await knex.transaction();
        try {
            const derivative = boundTemplate.transacting(trx);
            const compiler = vi.spyOn(trx.client, 'queryCompiler');
            try {
                expect(derivative.toSQL(1).sql).toBe(sql.sql);
                expect((await derivative(1))[0].id).toBe(1);
                expect(compiler).not.toHaveBeenCalled();
            } finally {
                compiler.mockRestore();
            }
        } finally {
            await trx.rollback();
        }
    });

    it('supports bound pagination, native composition and independent immutable branches', async () => {
        const bound = listUsers.query(knex);
        expect(
            (await bound.paginate({ page: 1, pageSize: 1 })).data
        ).toHaveLength(1);
        expect(await bound.countValue()).toBe(2);
        const firstPage = await bound.paginateAfter({
            limit: 1,
            orderBy: [{ column: 'id', direction: 'asc' }]
        });
        expect(firstPage.data.map(row => row.id)).toEqual([1]);
        expect(
            (
                await bound.paginateAfter({
                    limit: 1,
                    cursor: firstPage.nextCursor,
                    orderBy: [{ column: 'id', direction: 'asc' }]
                })
            ).data.map(row => row.id)
        ).toEqual([2]);
        expect(
            await bound.whereExists(
                knex(tasks).select('id').where('owner_id', bound.ref('id'))
            )
        ).toHaveLength(2);
        expect(
            await bound.apply(
                q => q.clearSelect().select({ label: 'display_name' }),
                { output: object({ label: string() }) }
            )
        ).toEqual([{ label: 'Jane' }, { label: 'John' }]);
        const first = listUsers.limit(1);
        expect(await first(knex)).toHaveLength(1);
        expect(await listUsers(knex)).toHaveLength(2);
    });

    it('executes captured scopes, relation parameters, joins and aggregates on each client', async () => {
        const defaultScope = vi.fn((q: any) =>
            q.where('id', '>', 0).orderBy('id')
        );
        const customizer = vi.fn((q: any) =>
            q.where('name', parameter('name')).select('name')
        );
        const definition = query(
            Task.schema.defaultScope(defaultScope)
        ).include('owner', customizer);
        for (const client of [knex, second]) {
            expect(await (definition as any)(client, 'Jane')).toEqual([
                { id: 10, ownerId: 1, owner: { name: 'Jane' } }
            ]);
            expect(await (definition as any).query(client, 'John')).toEqual([
                { id: 20, ownerId: 2, owner: { name: 'John' } }
            ]);
        }
        expect(defaultScope).toHaveBeenCalledTimes(1);
        expect(customizer).toHaveBeenCalledTimes(1);
        const joined = query(alias(User, 'u'))
            .leftJoin(alias(Task.schema, 't'), t => eq(t.u.id, t.t.ownerId))
            .groupBy(t => t.u.name)
            .select(t => ({ name: t.u.name, count: aggregate.count(t.t.id) }))
            .orderByRaw('?? asc', ['u.display_name']);
        expect(await joined(knex)).toEqual([
            { name: 'Jane', count: 1 },
            { name: 'John', count: 1 }
        ]);
    });

    it('executes STI/CTI definitions and removes parameters of discarded variants', async () => {
        const definition = query(Asset.schema)
            .forVariant('note', q => q.where(t => t.text, parameter('text')))
            .forVariant('photo', q =>
                q.where(t => t.width, '>=', parameter('width'))
            )
            .orderBy('id');
        const first = await definition(knex, 'hello', 50);
        expect(first.map(row => row.id)).toEqual([1, 2]);
        expect(await definition.query(second, 'hello', 50)).toEqual(first);
        expect(await definition.selectVariants(['photo'])(knex, 200)).toEqual(
            []
        );
        expect(
            await definition.selectVariants(['note'])(knex, 'hello')
        ).toEqual([{ id: 1, kind: 'note', text: 'hello' }]);
    });
});
