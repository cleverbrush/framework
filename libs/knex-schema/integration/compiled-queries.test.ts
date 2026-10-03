import { randomUUID } from 'node:crypto';
import {
    alias,
    array,
    createDb,
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

const connection = process.env.QUERY_TEST_DATABASE_URL;
if (!connection) throw new Error('QUERY_TEST_DATABASE_URL is required');
const knex = Knex({ client: 'pg', connection });
const prefix = `cb_compiled_${randomUUID().replaceAll('-', '')}`;
const users = `${prefix}_users`;
const tasks = `${prefix}_tasks`;
const assets = `${prefix}_assets`;
const photos = `${prefix}_photos`;
const User = object({
    id: number().primaryKey(),
    name: string().hasColumnName('first_name'),
    lastName: string().hasColumnName('last_name'),
    age: number().optional(),
    birthday: date().optional(),
    balance: number().decimal(24, 6),
    tags: array(string()).optional(),
    profile: object({ when: date() }).optional()
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
    object({
        id: number().primaryKey(),
        kind: string(),
        title: string()
    }).hasTableName(assets)
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

beforeAll(async () => {
    await knex.schema.createTable(users, t => {
        t.integer('id').primary();
        t.text('first_name');
        t.text('last_name');
        t.integer('age');
        t.timestamp('birthday', { useTz: true });
        t.decimal('balance', 24, 6);
        t.jsonb('tags');
        t.jsonb('profile');
    });
    await knex.schema.createTable(tasks, t => {
        t.integer('id').primary();
        t.integer('owner_id');
    });
    await knex.schema.createTable(assets, t => {
        t.integer('id').primary();
        t.text('kind');
        t.text('title');
        t.text('text');
    });
    await knex.schema.createTable(photos, t => {
        t.integer('asset_id').primary();
        t.integer('width');
    });
    await knex(users).insert([
        {
            id: 1,
            first_name: 'John',
            tags: JSON.stringify(['reader', 'writer']),
            profile: { when: '2026-01-01T00:00:00.000Z' },
            last_name: 'Doe',
            age: 30,
            birthday: '2000-01-01T00:00:00Z',
            balance: '9007199254740993.000001'
        },
        {
            id: 2,
            first_name: 'Jane',
            last_name: 'Doe',
            age: 18,
            birthday: null,
            balance: '1.000000'
        },
        {
            id: 3,
            first_name: 'John',
            last_name: 'Smith',
            age: null,
            birthday: null,
            balance: '2.000000'
        }
    ]);
    await knex(tasks).insert([
        { id: 10, owner_id: 1 },
        { id: 20, owner_id: 2 }
    ]);
    await knex(assets).insert([
        { id: 1, kind: 'note', title: 'One', text: 'hello' },
        { id: 2, kind: 'photo', title: 'Two', text: null },
        { id: 3, kind: 'note', title: 'Three', text: 'bye' }
    ]);
    await knex(photos).insert({ asset_id: 2, width: 100 });
});
afterAll(async () => {
    for (const table of [photos, assets, tasks, users])
        await knex.schema.dropTableIfExists(table);
    await knex.destroy();
});

describe('compiled queries against PostgreSQL', () => {
    it('binds typed JSON arrays and objects with nested dates as JSON values', async () => {
        const read = query(knex, User)
            .where(t => t.tags, parameter('tags'))
            .where(t => t.profile, parameter('profile'));
        const tags = ['reader', 'writer'];
        const profile = { when: new Date('2026-01-01T00:00:00Z') };
        const bound = read.query(tags, profile);
        const sql = read.toSQL(tags, profile);
        expect((await read(tags, profile)).map(x => x.id)).toEqual([1]);
        profile.when.setFullYear(2030);
        tags.push('changed');
        expect((await bound).map(x => x.id)).toEqual([1]);
        expect(sql.bindings).toContain(JSON.stringify(['reader', 'writer']));
        expect(await read(tags, profile)).toEqual([]);
    });
    it('matches ordinary reads across values, projections and concurrent invocations', async () => {
        const read = query(knex, User)
            .where(t => t.name, parameter('name'))
            .where(t => t.id, '>=', parameter('minimum'))
            .orderBy(t => t.id);
        const [john, jane] = await Promise.all([
            read('John', 1),
            read('Jane', 2)
        ]);
        expect(john).toEqual(await read.query('John', 1));
        expect(jane).toEqual(
            await query(knex, User)
                .where(t => t.name, 'Jane')
                .where(t => t.id, '>=', 2)
                .orderBy(t => t.id)
        );
        expect(john[0].birthday).toBeInstanceOf(Date);
        expect(john[0].balance).toBe('9007199254740993.000001');
        expect(await read.select(t => ({ name: t.name }))('John', 2)).toEqual([
            { name: 'John' }
        ]);
        expect(await read("' OR 1=1 --", 1)).toEqual([]);
    });

    it('retains Knex null equality, inequality and negation semantics', async () => {
        for (const operator of ['=', '!=', '<>']) {
            const compiled = query(knex, User)
                .where(t => t.age, operator, parameter('age'))
                .orderBy(t => t.id);
            for (const value of [null, 18, 30]) {
                expect(await compiled(value)).toEqual(
                    await query(knex, User)
                        .where(t => t.age, operator, value)
                        .orderBy(t => t.id)
                );
            }
        }
        const not = query(knex, User)
            .whereNot(t => t.age, parameter('age'))
            .orderBy(t => t.id);
        for (const value of [null, 18])
            expect(await not(value)).toEqual(
                await query(knex, User)
                    .whereNot(t => t.age, value)
                    .orderBy(t => t.id)
            );
    });

    it('supports groups, repeated names, LIKE, ranges, and fixed membership tuples', async () => {
        const read = query(knex, User)
            .where(p =>
                p
                    .where(t => t.name, parameter('name'))
                    .orWhere(t => t.lastName, parameter('name'))
            )
            .whereBetween(t => t.id, [parameter('low'), parameter('high')])
            .whereIn(t => t.id, [parameter('low'), 2, 3])
            .orderBy(t => t.id);
        expect((await read('John', 1, 3)).map(x => x.id)).toEqual([1, 3]);
        expect((await read('Doe', 2, 3)).map(x => x.id)).toEqual([2]);
        expect(
            (
                await query(knex, User).whereILike(
                    t => t.name,
                    parameter('pattern')
                )('jo%')
            )
                .map(x => x.id)
                .sort()
        ).toEqual([1, 3]);
    });

    it('handles included child parameters and flat nullable joins', async () => {
        const customize = vi.fn((q: any) => q.where('name', parameter('name')));
        const read = query(knex, Task.schema)
            .include(t => t.owner, customize)
            .where(t => t.id, '>=', parameter('minimum'))
            .orderBy(t => t.id);
        const rows = await (read as any)('John', 10);
        expect(rows).toEqual(await (read as any).query('John', 10));
        expect(rows[0].owner.name).toBe('John');
        expect(customize).toHaveBeenCalledTimes(1);
        const flat = query(knex, alias(Task.schema, 't'))
            .leftJoin(alias(User, 'u'), t => eq(t.t.ownerId, t.u.id))
            .where(t => t.u.age, parameter('age'))
            .select(t => ({ id: t.t.id, name: t.u.name }));
        expect(await flat(18)).toEqual([{ id: 20, name: 'Jane' }]);
        expect(await flat(null)).toEqual([]);
    });

    it('supports STI and CTI customizers, preserves callback capture and prunes arguments', async () => {
        const read = query(knex, Asset.schema)
            .forVariant('note', q => q.where(t => t.text, parameter('text')))
            .forVariant('photo', q =>
                q.where(t => t.width, '>=', parameter('width'))
            )
            .where(t => t.id, '>=', parameter('id'))
            .orderBy(t => t.id);
        expect(await read('hello', 50, 1)).toEqual(
            await read.query('hello', 50, 1)
        );
        expect((await read('hello', 50, 1)).map(x => x.id)).toEqual([1, 2]);
        expect((await read('bye', 200, 1)).map(x => x.id)).toEqual([3]);
        const photo = read.selectVariants(['photo']);
        expect((await photo(50, 1)).map(x => x.id)).toEqual([2]);
        expect(await photo(200, 1)).toEqual([]);
    });

    it('reuses the statement in caller-owned transactions without recompiling', async () => {
        const read = query(knex, User).where(t => t.id, parameter('id'));
        const before = read.toSQL(1);
        await knex.transaction(async trx => {
            await trx(users)
                .where('id', 1)
                .update({ first_name: 'Transaction' });
            const txRead = read.transacting(trx);
            const compiler = vi.spyOn(trx.client, 'queryCompiler');
            try {
                expect(txRead.toSQL(1).sql).toBe(before.sql);
                expect((await txRead(1))[0].name).toBe('Transaction');
                expect(compiler).not.toHaveBeenCalled();
            } finally {
                compiler.mockRestore();
            }
            await trx.rollback();
        });
        expect((await read(1))[0].name).toBe('John');
    });

    it('preserves ORM identity tracking, bound lookups, and detached projections', async () => {
        const db = createDb(
            knex,
            { users: defineEntity(User), assets: Asset },
            { tracking: true }
        );
        const find = db.users.where(t => t.id, parameter('id'));
        const first = (await find(1))[0];
        expect((await find(1))[0]).toBe(first);
        expect(await find.query(1).find(1)).toBe(first);
        expect(db.entry(first).state).toBe('Unchanged');
        const projected = (
            await find.select(t => ({ id: t.id, name: t.name }))(1)
        )[0];
        expect(projected).not.toBe(first);
        expect(() => db.entry(projected)).toThrow(/not tracked/i);
        const photo = db.assets
            .ofVariant('photo')
            .where(t => t.id, parameter('id'));
        const image = (await photo(2))[0];
        expect(await photo.query(2).find(2)).toBe(image);
        expect(() => (photo as any).update({ title: 'unsafe' })).toThrow(
            /unbound/
        );
    });

    it('reports execution errors through Knex and leaves the cached plan reusable', async () => {
        const read = query(knex, User).where(t => t.id, parameter('id'));
        const error = vi.fn();
        knex.on('query-error', error);
        try {
            await expect(read(1.5)).rejects.toThrow();
            expect(error).toHaveBeenCalledTimes(1);
            expect((await read(1))[0].id).toBe(1);
        } finally {
            knex.removeListener('query-error', error);
        }
    });
});
