import { randomUUID } from 'node:crypto';
import {
    alias,
    boolean,
    ConcurrencyError,
    createDb,
    date,
    defineEntity,
    number,
    object,
    query,
    rawQuery,
    string
} from '@cleverbrush/orm';
import Knex from 'knex';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

const connection = process.env.QUERY_TEST_DATABASE_URL;
if (!connection) throw new Error('QUERY_TEST_DATABASE_URL is required');
const knex = Knex({ client: 'pg', connection, pool: { min: 0, max: 4 } });
const table = `cb_immutable_${randomUUID().replaceAll('-', '')}`;
const firstId = '9007199254740993';
const secondId = '9007199254740994';
const otherId = '9007199254740995';
const scope = vi.fn(q => q.where('tenantId', 1).where('enabled', true));
const Account = object({
    id: number().bigint().primaryKey(),
    tenantId: number().hasColumnName('tenant_id'),
    enabled: boolean(),
    name: string(),
    balance: number().decimal(30, 6),
    version: number().bigint().rowVersion(),
    createdAt: date().hasColumnName('created_at'),
    deletedAt: date().optional().hasColumnName('deleted_at')
})
    .hasTableName(table)
    .softDelete()
    .defaultScope(scope);
const Entity = defineEntity(Account);

beforeAll(async () => {
    await knex.schema.createTable(table, t => {
        t.bigInteger('id').primary();
        t.integer('tenant_id').notNullable();
        t.boolean('enabled').notNullable();
        t.text('name').notNullable();
        t.decimal('balance', 30, 6).notNullable();
        t.bigInteger('version').notNullable().defaultTo('9007199254740993');
        t.timestamp('created_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        t.timestamp('deleted_at', { useTz: true });
    });
});
beforeEach(async () => {
    await knex(table).delete();
    await knex(table).insert([
        {
            id: firstId,
            tenant_id: 1,
            enabled: true,
            name: 'first',
            balance: '12345678901234567890.012345'
        },
        {
            id: secondId,
            tenant_id: 1,
            enabled: true,
            name: 'second',
            balance: '0.000001'
        },
        {
            id: otherId,
            tenant_id: 2,
            enabled: false,
            name: 'other',
            balance: '9.000001'
        }
    ]);
    scope.mockClear();
});
afterAll(async () => {
    await knex.schema.dropTableIfExists(table);
    await knex.destroy();
});

describe('immutable public query semantics against PostgreSQL', () => {
    it('inserts exact CTI keys and filters mapped polymorphic columns without losing the discriminator', async () => {
        const baseName = `${table}_poly`;
        const detailsName = `${table}_details`;
        await knex.transaction(async trx => {
            await trx.schema.createTable(baseName, t => {
                t.bigInteger('asset_id').primary();
                t.text('asset_kind').notNullable();
                t.text('display_name').notNullable();
            });
            await trx.schema.createTable(detailsName, t => {
                t.bigInteger('asset_id').primary();
                t.bigInteger('size').notNullable();
            });
            const Asset = defineEntity(
                object({
                    id: number()
                        .bigint()
                        .primaryKey()
                        .hasColumnName('asset_id'),
                    kind: string().hasColumnName('asset_kind'),
                    name: string().hasColumnName('display_name')
                }).hasTableName(baseName)
            )
                .discriminator('kind')
                .ctiVariant(
                    'photo',
                    defineEntity(
                        object({
                            assetId: number()
                                .bigint()
                                .hasColumnName('asset_id'),
                            size: number().bigint()
                        }).hasTableName(detailsName)
                    ),
                    p => p.assetId
                );
            const db = createDb(trx, { assets: Asset }, { tracking: true });
            const inserted = await db.assets
                .ofVariant('photo')
                .insert({ id: firstId, name: 'photo', size: secondId });
            expect(inserted).toMatchObject({
                id: firstId,
                kind: 'photo',
                name: 'photo',
                size: secondId
            });
            expect(
                await db.assets
                    .where('name', 'photo')
                    .where('kind', 'photo')
                    .first()
            ).toBe(inserted);
            const page = await db.assets
                .orderBy('id')
                .paginate({ page: 1, pageSize: 1 });
            expect(page.total).toBe(1);
            expect(page.data[0]).toBe(inserted);
            expect(() => db.entry(page as any)).toThrow(/not tracked/i);
            const variantPage = await db.assets
                .ofVariant('photo')
                .paginate({ page: 1, pageSize: 1 });
            expect(variantPage.data[0]).toBe(inserted);
            expect(() => db.entry(variantPage as any)).toThrow(/not tracked/i);
            const bindings = ['id'];
            const rawOrdered = db.assets.orderByRaw(
                '(__read_poly ->> ?)::numeric desc',
                bindings
            );
            bindings[0] = 'missing';
            expect((await rawOrdered)[0]).toBe(inserted);
            expect(db.entry(inserted).isModified()).toBe(false);
            inserted.size = otherId;
            expect(db.entry(inserted).isModified()).toBe(true);
            expect((await db.saveChanges()).updated).toBe(1);
            expect((await trx(detailsName).first()).size).toBe(otherId);
            expect(db.entry(inserted).isModified()).toBe(false);
            await trx.schema.dropTable(detailsName);
            await trx.schema.dropTable(baseName);
        });
    });

    it('captures scopes once, isolates branches and does not let OR bypass visibility', async () => {
        const root = query(knex, Account);
        const first = root.where('id', firstId);
        const withAlternative = first.orWhere('id', otherId);
        expect((await withAlternative).map(row => row.id)).toEqual([firstId]);
        expect((await root).map(row => row.id)).toEqual([firstId, secondId]);
        expect((await withAlternative.unscoped()).map(row => row.id)).toEqual([
            firstId,
            otherId
        ]);
        expect(scope).toHaveBeenCalledTimes(1);
        expect(first.rowSchema).toBe(root.rowSchema);
    });

    it('keeps scoped writes independent and applies scope/predicates to bulk updates', async () => {
        const root = query(knex, Account);
        const first = root.where('id', firstId);
        expect(
            await first.bulkUpdate([
                { where: { id: firstId }, set: { name: 'changed' } },
                { where: { id: secondId }, set: { name: 'wrong sibling' } },
                { where: { id: otherId }, set: { name: 'wrong tenant' } }
            ])
        ).toBe(1);
        expect((await root.orderBy('id')).map(row => row.name)).toEqual([
            'changed',
            'second'
        ]);
        expect((await root.unscoped().where('id', otherId).first())?.name).toBe(
            'other'
        );
        expect(
            (await first.update({ balance: '12345678901234567890.999999' }))[0]
                .balance
        ).toBe('12345678901234567890.999999');
        expect(await root.where('id', secondId).delete()).toBe(1);
        expect((await root).map(row => row.id)).toEqual([firstId]);
        const restored = await root.onlyDeleted().restore();
        expect(restored[0].id).toBe(secondId);
        expect(restored[0].deletedAt).toBeNull();
    });

    it('decodes insert, conflict and bulk returning rows identically to SELECT', async () => {
        const root = query(knex, Account);
        const inserted = await root.insert({
            id: '9007199254740996',
            tenantId: 1,
            enabled: true,
            name: 'inserted',
            balance: '4.123456'
        });
        expect(inserted).toMatchObject({
            id: '9007199254740996',
            balance: '4.123456',
            version: firstId,
            deletedAt: null
        });
        expect(inserted.createdAt).toBeInstanceOf(Date);
        expect(await root.where('id', inserted.id).first()).toEqual(inserted);
        const merged = await root.onConflict('id').merge({
            id: inserted.id,
            tenantId: 1,
            enabled: true,
            name: 'merged',
            balance: '5.123456'
        });
        expect(merged).toMatchObject({
            id: inserted.id,
            balance: '5.123456',
            deletedAt: null
        });
        const rows = await root.bulkInsert([
            {
                id: '9007199254740997',
                tenantId: 1,
                enabled: true,
                name: 'bulk',
                balance: '6.123456'
            }
        ]);
        expect(rows[0].createdAt).toBeInstanceOf(Date);
        expect(rows[0].version).toBe(firstId);
        expect(await root.insertMany([])).toEqual([]);
    });

    it('maintains tracked identity through immutable branches and page data only', async () => {
        const tracked = createDb(
            knex,
            { accounts: Entity },
            { tracking: true }
        );
        const root = tracked.accounts.query();
        const one = root.where('id', firstId);
        const a = (await one)[0];
        expect((await one)[0]).toBe(a);
        expect(await root.find(firstId)).toBe(a);
        const page = await root
            .orderBy('id')
            .paginate({ page: 1, pageSize: 1 });
        expect(page.data[0]).toBe(a);
        expect(() => tracked.entry(page as any)).toThrow(/not tracked/i);
        const projected = await one
            .select(t => ({ id: t.id, name: t.name }))
            .first();
        expect(projected).not.toBe(a);
        expect(() => tracked.entry(projected!)).toThrow(/not tracked/i);
        const raw = await one
            .selectRaw('id::text as id', [], {
                output: object({ id: string() })
            })
            .first();
        expect(() => tracked.entry(raw!)).toThrow(/not tracked/i);
        expect(tracked.entry(a).state).toBe('Unchanged');
    });

    it('increments exact bigint versions and reloads using the same decoded shape', async () => {
        const tracked = createDb(
            knex,
            { accounts: Entity },
            { tracking: true }
        );
        const a = await tracked.accounts.findOrFail(firstId);
        a.name = 'saved';
        await tracked.saveChanges();
        expect(a.version).toBe(secondId);
        expect(tracked.entry(a).state).toBe('Unchanged');
        await knex(table).where('id', firstId).update({
            balance: '12345678901234567890.999998',
            deleted_at: knex.fn.now()
        });
        await tracked.reload(a);
        expect(a.balance).toBe('12345678901234567890.999998');
        expect(a.createdAt).toBeInstanceOf(Date);
        expect(a.deletedAt).toBeInstanceOf(Date);
    });

    it('rolls back writes and generated in-memory versions on a later concurrency failure', async () => {
        const tracked = createDb(
            knex,
            { accounts: Entity },
            { tracking: true }
        );
        const a = await tracked.accounts.findOrFail(firstId);
        const b = await tracked.accounts.findOrFail(secondId);
        a.name = 'pending first';
        b.name = 'pending second';
        await knex(table).where('id', secondId).update({ version: secondId });
        await expect(tracked.saveChanges()).rejects.toBeInstanceOf(
            ConcurrencyError
        );
        expect(a.version).toBe(firstId);
        expect(b.version).toBe(firstId);
        expect(
            (await query(knex, Account).where('id', firstId).first())?.name
        ).toBe('first');
        expect(tracked.entry(a).isModified()).toBe(true);
        await tracked.reload(b);
        await tracked.saveChanges();
        expect(a.version).toBe(secondId);
    });

    it('captures raw aliases and bindings while applying a parser exactly once', async () => {
        const output = object({ count: number().coerce() });
        const parse = vi.spyOn(output, 'parse');
        const root = query(knex, alias(Account, 'account')).where(
            t => t.account.id,
            firstId
        );
        const raw = root.selectRaw('count(*)::text as count', [], { output });
        expect(await raw).toEqual([{ count: 1 }]);
        expect(parse).toHaveBeenCalledTimes(1);
        expect(
            await rawQuery(
                knex,
                object({ id: string() }),
                knex(table)
                    .select(knex.raw('id::text as id'))
                    .where('id', firstId)
            )
        ).toEqual([{ id: firstId }]);
    });

    it('allows filtered writes without a declared primary key when not paginated', async () => {
        const NoKey = object({ name: string() }).hasTableName(table);
        expect(
            await query(knex, NoKey)
                .where('name', 'other')
                .update({ name: 'updated without key' })
        ).toEqual([{ name: 'updated without key' }]);
        expect(
            await query(knex, NoKey)
                .where('name', 'updated without key')
                .delete()
        ).toBe(1);
        await expect(
            query(knex, NoKey).limit(1).update({ name: 'unsafe' })
        ).rejects.toThrow(/primary key/);
    });
});
