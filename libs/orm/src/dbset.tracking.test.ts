import {
    date,
    defineEntity,
    number,
    object,
    parameter,
    string
} from '@cleverbrush/knex-schema';
import { afterEach, describe, expect, it } from 'vitest';
import { mockDriver } from '../../knex-schema/testing/mock-driver.js';
import { ChangeTracker } from './change-tracker.js';
import { createDb } from './dbcontext.js';

const Plain = defineEntity(
    object({ id: number().primaryKey(), name: string() }).hasTableName('items')
);
const Poly = defineEntity(
    object({
        id: number().primaryKey(),
        kind: string(),
        version: number().rowVersion()
    }).hasTableName('assets')
)
    .discriminator('kind')
    .stiVariant('note', object({ text: string() }));
const drivers: ReturnType<typeof mockDriver>[] = [];
function setup() {
    const driver = mockDriver();
    drivers.push(driver);
    driver.respond = q =>
        q.sql.includes('count(')
            ? [{ count: '1' }]
            : q.sql.includes('cast("id" as text)')
              ? [{ id: '1' }]
              : q.sql.includes('__read_poly')
                ? [
                      {
                          __read_poly: {
                              id: 1,
                              kind: 'note',
                              text: 'stored',
                              version: 1
                          }
                      }
                  ]
                : /^(select|with)/.test(q.sql)
                  ? [{ id: 1, name: 'stored', __cursor_value: 1 }]
                  : /^(insert|update)/.test(q.sql)
                    ? [{ id: 1, kind: 'note', text: 'stored', version: 1 }]
                    : q.sql.startsWith('delete')
                      ? [{}]
                      : [];
    return {
        driver,
        db: createDb(
            driver.knex,
            { items: Plain, assets: Poly },
            { tracking: true }
        )
    };
}
afterEach(async () => {
    await Promise.all(drivers.splice(0).map(d => d.knex.destroy()));
});
describe('tracked query result boundaries', () => {
    it('preserves identities across awaited, callable, first and paginated reads', async () => {
        const { db } = setup();
        const [row] = await db.items;
        const read = db.items.where('id', parameter('id'));
        expect((await read(1))[0]).toBe(row);
        expect(await db.items.first()).toBe(row);
        expect((await db.items.execute())[0]).toBe(row);
        expect(
            (await db.items.paginate({ page: 1, pageSize: 1 })).data[0]
        ).toBe(row);
        expect((await db.items.paginateAfter({ limit: 1 })).data[0]).toBe(row);
        expect(await db.items.pluck('id')).toEqual([1]);
        for (const operation of [
            'find',
            'findMany',
            'insert',
            'update',
            'delete',
            'restore',
            'hardDelete'
        ])
            expect(() => (read as any)[operation]({})).toThrow(
                /parameter|bind|argument/i
            );
    });
    it('preserves variant identities across callable, scalar and paginated queries', async () => {
        const { db } = setup();
        const view = db.assets.ofVariant('note');
        const [row] = await view;
        expect((await view.execute())[0]).toBe(row);
        expect(await view.first()).toBe(row);
        expect((await view.where('id', parameter('id'))(1))[0]).toBe(row);
        expect((await view.paginate({ page: 1, pageSize: 1 })).data[0]).toBe(
            row
        );
        expect(await view.pluck('id')).toEqual([1]);
        expect(view.rowSchema).toBeDefined();
        const projected = view.forVariant('note', q =>
            q.select(t => ({ id: t.id, kind: t.kind }))
        );
        expect((await projected.execute())[0]).not.toBe(row);
        expect(() => db.entry({})).toThrow('not tracked');
        const unbound = view.where('id', parameter('id'));
        expect(() => (unbound as any).find(1)).toThrow(
            /parameter|bind|argument/i
        );
    });
    it('keeps transaction-bound variant views and their tracking wrappers', async () => {
        const { db } = setup();
        await db.transaction(async transactional => {
            const view = transactional.assets.ofVariant('note');
            expect(await view.find(1)).toMatchObject({ kind: 'note' });
            expect(await view.findMany([1])).toHaveLength(1);
        });
        const { driver } = setup();
        await driver.knex.transaction(async trx => {
            const view = db.assets.ofVariant('note').withTransaction(trx);
            expect((await view.execute())[0].kind).toBe('note');
        });
    });
    it('persists polymorphic tracked updates/deletes and guards optimistic versions', async () => {
        const { driver } = setup();
        const tracker = new ChangeTracker();
        tracker.registerEntitySet({
            entitySetKey: 'assets',
            schema: Poly.schema
        });
        const row = tracker.attach('assets', {
            id: 1,
            kind: 'note',
            text: 'old',
            version: 1
        });
        row.text = 'new';
        expect(await tracker.saveChanges(driver.knex)).toMatchObject({
            updated: 1
        });
        expect(driver.queries.some(q => q.sql.startsWith('update'))).toBe(true);
        tracker.remove(row);
        expect(await tracker.saveChanges(driver.knex)).toMatchObject({
            deleted: 1
        });
        const other = tracker.attach('assets', {
            id: 2,
            kind: 'note',
            text: 'other',
            version: 1
        });
        other.text = 'changed';
        driver.respond = () => [];
        await expect(tracker.saveChanges(driver.knex)).rejects.toThrow(
            /concurr|version/i
        );
        tracker.discardChanges();
        tracker.remove(other);
        await expect(tracker.saveChanges(driver.knex)).rejects.toThrow(
            /concurr|version/i
        );
    });
    it('tracks deep document mutations, resets independent copies and validates snapshots', async () => {
        const { driver } = setup();
        const document = object({
            tags: object({ name: string() }),
            created: date().optional()
        })
            .acceptUnknownProps()
            .jsonb();
        const schema = object({
            id: number().primaryKey(),
            data: document
        }).hasTableName('documents');
        const tracker = new ChangeTracker();
        tracker.registerEntitySet({ entitySetKey: 'documents', schema });
        const row = tracker.attach('documents', {
            id: 1,
            data: {
                tags: { name: 'a' },
                created: new Date(0),
                extra: [1, null]
            }
        });
        row.data.tags.name = 'b';
        expect(tracker.entry(row).isModified('data')).toBe(true);
        tracker.entry(row).reset();
        expect(row.data.tags.name).toBe('a');
        row.data.extra.push(2);
        expect(tracker.hasPendingChanges()).toBe(true);
        await tracker.saveChanges(driver.knex);
        expect(tracker.entry(row).isModified()).toBe(false);
        row.data.extra = [1, null];
        tracker.discardChanges();
        expect(row.data.extra).toEqual([1, null, 2]);
        expect(() =>
            tracker.attach('documents', {
                id: 3,
                data: { tags: { name: 'a' }, extra: NaN }
            })
        ).toThrow();
    });
});
