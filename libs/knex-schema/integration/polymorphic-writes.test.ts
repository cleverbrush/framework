import { randomUUID } from 'node:crypto';
import {
    ConcurrencyError,
    createDb,
    date,
    defineEntity,
    generateCreateTable,
    number,
    object,
    string
} from '@cleverbrush/orm';
import Knex from 'knex';
import { types as pgTypes } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

const connection = process.env.QUERY_TEST_DATABASE_URL;
if (!connection) throw new Error('QUERY_TEST_DATABASE_URL is required');
const knex = Knex({ client: 'pg', connection, pool: { min: 0, max: 8 } });
const tables: string[] = [];
afterAll(async () => {
    for (const table of tables.reverse())
        await knex.schema.dropTableIfExists(table);
    await knex.destroy();
});

type Controls = {
    events: string[];
    scopeCalls: number;
    beforeInsert?: (data: any) => any;
    beforeUpdate?: (data: any) => any;
    beforeDelete?: (query: any) => Promise<void>;
    afterInsert?: (row: any) => void;
};

async function fixture(
    storage: 'sti' | 'cti',
    soft = true,
    scopedBody = false
) {
    const name = `f07_${randomUUID().replaceAll('-', '')}`;
    const childName = `${name}_child`;
    const controls: Controls = { events: [], scopeCalls: 0 };
    let base = object({
        id: number()
            .hasColumnName('asset_id')
            .primaryKey({ autoIncrement: true }),
        kind: string().hasColumnName('asset_kind'),
        title: string().hasColumnName('title_text'),
        tenant: number().defaultTo(1),
        version: number().defaultTo(1).rowVersion(),
        createdAt: date().hasColumnName('created_on'),
        updatedAt: date().hasColumnName('changed_on')
    })
        .hasTableName(name)
        .hasTimestamps({ createdAt: 'created_on', updatedAt: 'changed_on' })
        .defaultScope(q => {
            controls.scopeCalls++;
            return q.where(t => t.tenant, 1);
        })
        .beforeInsert((data: any) => {
            controls.events.push('base:insert');
            return controls.beforeInsert?.(data) ?? data;
        })
        .afterInsert((row: any) => {
            controls.events.push('base:inserted');
            controls.afterInsert?.(row);
        })
        .beforeUpdate((data: any) => {
            controls.events.push('base:update');
            return controls.beforeUpdate?.(data) ?? data;
        })
        .beforeDelete(async (query: any) => {
            controls.events.push('base:delete');
            await controls.beforeDelete?.(query);
        });
    if (soft) base = base.softDelete({ column: 'removed_on' });
    let body = object({
        ...(storage === 'cti'
            ? { assetId: number().hasColumnName('owner_id').primaryKey() }
            : {}),
        caption: string().hasColumnName('caption_text'),
        document: object({ label: string() })
            .acceptUnknownProps()
            .jsonb()
            .hasColumnName('document_data'),
        bodyCreatedAt: date().hasColumnName('body_created'),
        bodyUpdatedAt: date().hasColumnName('body_changed')
    })
        .hasTableName(storage === 'cti' ? childName : name)
        .hasTimestamps({ createdAt: 'body_created', updatedAt: 'body_changed' })
        .beforeInsert((data: any) => {
            controls.events.push('body:insert');
            return data;
        })
        .afterInsert(() => {
            controls.events.push('body:inserted');
        })
        .beforeUpdate((data: any) => {
            controls.events.push('body:update');
            return data;
        })
        .beforeDelete(() => {
            controls.events.push('body:delete');
        });
    if (scopedBody)
        body = body.defaultScope(q => {
            controls.scopeCalls++;
            return q.where(t => t.caption, 'initial');
        });
    await generateCreateTable(base)(knex);
    tables.push(name);
    if (storage === 'cti') {
        await generateCreateTable(body)(knex);
        tables.push(childName);
        await knex.schema.alterTable(childName, table =>
            table.foreign('owner_id').references('asset_id').inTable(name)
        );
    } else {
        await knex.schema.alterTable(name, table => {
            table.text('caption_text').notNullable();
            table.jsonb('document_data').notNullable();
            table.timestamp('body_created').notNullable();
            table.timestamp('body_changed').notNullable();
        });
    }
    await knex.schema.alterTable(
        storage === 'cti' ? childName : name,
        table => {
            table.check("caption_text <> 'reject'", [], 'valid_caption');
        }
    );
    const entity =
        storage === 'cti'
            ? defineEntity(base)
                  .discriminator('kind')
                  .ctiVariant('photo', defineEntity(body), t => t.assetId!)
            : defineEntity(base)
                  .discriminator('kind')
                  .stiVariant('photo', body);
    const db = createDb(knex, { assets: entity });
    const view = db.assets.ofVariant('photo');
    const insert = (extra: Record<string, unknown> = {}) =>
        view.insert({
            title: 'initial',
            caption: 'initial',
            document: { label: 'original', extra: [true] },
            ...extra
        });
    return { name, childName, entity, view, db, insert, controls };
}

for (const storage of ['sti', 'cti'] as const) {
    describe(storage, () => {
        it('runs logical hooks once and maps base/body updates, JSON and timestamps', async () => {
            const f = await fixture(storage);
            f.controls.beforeInsert = data => {
                expect(data.kind).toBe('photo');
                return {
                    ...data,
                    title: 'insert hook',
                    caption: 'body insert hook'
                };
            };
            f.controls.afterInsert = row =>
                expect(row.caption).toBe('body insert hook');
            const row = await f.insert();
            expect(f.controls.events).toEqual([
                'base:insert',
                'body:insert',
                'base:inserted',
                'body:inserted'
            ]);
            expect(row).toMatchObject({
                kind: 'photo',
                title: 'insert hook',
                caption: 'body insert hook',
                document: { extra: [true] }
            });
            expect(row.createdAt).toBeInstanceOf(Date);
            expect(row.bodyCreatedAt).toBeInstanceOf(Date);
            await knex(f.name)
                .where('asset_id', row.id)
                .update({ changed_on: '2000-01-01' });
            await knex(storage === 'cti' ? f.childName : f.name).update({
                body_changed: '2000-01-01'
            });
            f.controls.events.length = 0;
            f.controls.beforeUpdate = data => ({
                ...data,
                title: 'updated by hook'
            });
            await f.view
                .where(t => t.id, row.id)
                .update({
                    caption: 'updated',
                    document: { label: 'next', custom: { a: 1 } }
                });
            expect(f.controls.events).toEqual(['base:update', 'body:update']);
            const updated = await f.view.findOrFail(row.id);
            expect(updated).toMatchObject({
                title: 'updated by hook',
                caption: 'updated',
                document: { custom: { a: 1 } }
            });
            expect(updated.updatedAt.getTime()).toBeGreaterThan(
                new Date('2000-01-01').getTime()
            );
            expect(updated.bodyUpdatedAt.getTime()).toBeGreaterThan(
                new Date('2000-01-01').getTime()
            );
            expect(updated.createdAt).toEqual(row.createdAt);
            f.controls.beforeUpdate = undefined;
            await f.view
                .where(t => t.id, row.id)
                .update({ title: 'base only' });
            expect((await f.view.findOrFail(row.id)).title).toBe('base only');
        });

        it('soft-deletes and restores the base marker without losing body rows', async () => {
            const f = await fixture(storage);
            const row = await f.insert();
            const before = await f.view.findOrFail(row.id);
            f.controls.events.length = 0;
            f.controls.beforeDelete = async query => {
                expect((await query).map((r: any) => r.id)).toEqual([row.id]);
            };
            await f.view.where(t => t.id, row.id).delete();
            expect(f.controls.events).toEqual(['base:delete', 'body:delete']);
            expect(await f.view.find(row.id)).toBeUndefined();
            expect(
                (await f.view.onlyDeleted().execute()).map(r => r.id)
            ).toEqual([row.id]);
            expect(
                await knex(f.name).where('asset_id', row.id).first()
            ).toMatchObject({ removed_on: expect.any(Date) });
            if (storage === 'cti')
                expect(
                    await knex(f.childName).where('owner_id', row.id).first()
                ).toBeDefined();
            f.controls.events.length = 0;
            expect(await f.view.where(t => t.id, row.id).restore()).toEqual([]);
            const restored = await f.view
                .onlyDeleted()
                .where(t => t.id, row.id)
                .restore();
            expect(restored).toEqual([before]);
            expect(f.controls.events).toEqual([]);
            expect(await f.view.where(t => t.id, row.id).hardDelete()).toBe(1);
            expect(f.controls.events).toEqual(['base:delete', 'body:delete']);
            expect(await f.view.withDeleted().find(row.id)).toBeUndefined();
            if (storage === 'cti')
                expect(
                    await knex(f.childName).where('owner_id', row.id).first()
                ).toBeUndefined();
        });

        it('honors scopes, explicit predicates, variant filters and pagination', async () => {
            const f = await fixture(storage);
            const a = await f.insert({ title: 'a' });
            const b = await f.insert({ title: 'b' });
            const c = await f.insert({ title: 'c', tenant: 2 });
            await f.view
                .orderBy(t => t.id)
                .offset(1)
                .limit(1)
                .update({ caption: 'page' });
            expect((await f.view.findOrFail(a.id)).caption).toBe('initial');
            expect((await f.view.findOrFail(b.id)).caption).toBe('page');
            expect((await f.view.unscoped().findOrFail(c.id)).caption).toBe(
                'initial'
            );
            await knex(f.name)
                .where('asset_id', a.id)
                .update({ asset_kind: 'another' });
            await f.view.where(t => t.id, a.id).delete();
            expect(
                (await knex(f.name).where('asset_id', a.id).first()).removed_on
            ).toBeNull();
            await f.view
                .unscoped()
                .where(t => t.id, c.id)
                .delete();
            expect(await f.view.unscoped().find(c.id)).toBeUndefined();
        });

        it('rolls back insert/update failures and leaves a caller transaction usable', async () => {
            const f = await fixture(storage);
            const row = await f.insert();
            await expect(f.insert({ caption: 'reject' })).rejects.toThrow();
            expect(await f.view.countValue()).toBe(1);
            await knex.transaction(async trx => {
                let previousTitle = 'initial';
                for (const bind of [
                    'withTransaction',
                    'transacting'
                ] as const) {
                    const scoped = f.view.where(t => t.id, row.id)[bind](trx);
                    await expect(
                        scoped.update({
                            title: 'must rollback',
                            caption: 'reject'
                        })
                    ).rejects.toThrow();
                    expect((await scoped.findOrFail(row.id)).title).toBe(
                        previousTitle
                    );
                    await scoped.update({ title: bind });
                    previousTitle = bind;
                }
            });
            expect((await f.view.findOrFail(row.id)).title).toBe('transacting');
            f.controls.beforeDelete = async () => {
                throw new Error('hook rejected');
            };
            await expect(
                f.view.where(t => t.id, row.id).delete()
            ).rejects.toThrow('hook rejected');
            expect(await f.view.find(row.id)).toBeDefined();
            f.controls.afterInsert = () => {
                throw new Error('after rejected');
            };
            await expect(f.insert()).rejects.toThrow('after rejected');
            expect(await f.view.countValue()).toBe(1);
        });

        it('physically deletes without soft-delete metadata and rejects restore', async () => {
            const f = await fixture(storage, false);
            const row = await f.insert();
            await expect(f.view.restore()).rejects.toThrow(/soft delete/);
            await f.view.where(t => t.id, row.id).delete();
            expect(
                await knex(f.name).where('asset_id', row.id).first()
            ).toBeUndefined();
            if (storage === 'cti')
                expect(
                    await knex(f.childName).where('owner_id', row.id).first()
                ).toBeUndefined();
        });

        it('tracks hook results, versions, soft deletion and rollback without advancing snapshots', async () => {
            const f = await fixture(storage);
            const row = await f.insert();
            const db = createDb(knex, { assets: f.entity }, { tracking: true });
            const current = await db.assets
                .ofVariant('photo')
                .findOrFail(row.id);
            current.caption = 'tracked';
            f.controls.beforeUpdate = data => ({
                ...data,
                title: 'tracked hook'
            });
            await db.saveChanges();
            expect(current).toMatchObject({
                title: 'tracked hook',
                caption: 'tracked',
                version: 2
            });
            expect(db.entry(current).state).toBe('Unchanged');
            current.caption = 'reject';
            await expect(db.saveChanges()).rejects.toThrow();
            expect(current.version).toBe(2);
            expect(db.entry(current).state).toBe('Modified');
            expect(db.entry(current).originalValues.caption).toBe('tracked');
            current.caption = 'next';
            await knex(f.name)
                .where('asset_id', row.id)
                .update({ version: 10 });
            await expect(db.saveChanges()).rejects.toBeInstanceOf(
                ConcurrencyError
            );
            expect(current.version).toBe(2);
            await knex(f.name).where('asset_id', row.id).update({ version: 2 });
            db.remove(current);
            await db.saveChanges();
            expect(await f.view.find(row.id)).toBeUndefined();
            if (storage === 'cti')
                expect(
                    await knex(f.childName).where('owner_id', row.id).first()
                ).toBeDefined();
            expect(
                await f.view
                    .onlyDeleted()
                    .where(t => t.id, row.id)
                    .hardDelete()
            ).toBe(1);
        });

        it('does not run hooks on empty targets and rejects hook-produced identity changes', async () => {
            const f = await fixture(storage);
            const row = await f.insert();
            f.controls.events.length = 0;
            await f.view.where(t => t.id, -1).update({ caption: 'absent' });
            await f.view.where(t => t.id, -1).delete();
            expect(await f.view.where(t => t.id, -1).hardDelete()).toBe(0);
            expect(f.controls.events).toEqual([]);
            f.controls.beforeUpdate = data => ({ ...data, id: row.id + 1 });
            await expect(
                f.view.where(t => t.id, row.id).update({ title: 'invalid' })
            ).rejects.toThrow(/identity/);
            expect((await f.view.findOrFail(row.id)).title).toBe('initial');
        });

        it('passes exactly the paginated targets to delete hooks', async () => {
            const f = await fixture(storage);
            const first = await f.insert();
            const second = await f.insert();
            f.controls.beforeDelete = async query => {
                expect((await query).map((r: any) => r.id)).toEqual([
                    second.id
                ]);
            };
            await f.view
                .orderBy(t => t.id)
                .offset(1)
                .limit(1)
                .delete();
            expect(await f.view.find(first.id)).toBeDefined();
            expect(await f.view.find(second.id)).toBeUndefined();
        });

        it('does not commit a caller transaction and preserves rows after permanent-delete failure', async () => {
            const f = await fixture(storage);
            const row = await f.insert();
            const reference = `${f.name}_ref`;
            await knex.schema.createTable(reference, table => {
                table
                    .integer('asset_id')
                    .references('asset_id')
                    .inTable(f.name);
            });
            tables.push(reference);
            await knex(reference).insert({ asset_id: row.id });
            await knex.transaction(async trx => {
                await expect(
                    f.view
                        .withTransaction(trx)
                        .where(t => t.id, row.id)
                        .hardDelete()
                ).rejects.toThrow();
                expect(
                    await f.view.withTransaction(trx).find(row.id)
                ).toBeDefined();
                if (storage === 'cti')
                    expect(
                        await trx(f.childName).where('owner_id', row.id).first()
                    ).toBeDefined();
            });
            await expect(
                knex.transaction(async trx => {
                    await f.view
                        .where(t => t.id, row.id)
                        .transacting(trx)
                        .delete();
                    throw new Error('outer rollback');
                })
            ).rejects.toThrow('outer rollback');
            expect(await f.view.find(row.id)).toBeDefined();
        });

        it('inserts tracked variants through the same hooks and atomic pipeline', async () => {
            const f = await fixture(storage);
            const db = createDb(knex, { assets: f.entity }, { tracking: true });
            const row = {
                kind: 'photo',
                title: 'tracked new',
                caption: 'reject',
                document: { label: 'new' }
            };
            db.attach('assets', row);
            await expect(db.saveChanges()).rejects.toThrow();
            expect((row as any).id).toBeUndefined();
            expect(db.entry(row).state).toBe('Added');
            row.caption = 'accepted';
            f.controls.events.length = 0;
            await db.saveChanges();
            expect((row as any).id).toEqual(expect.any(Number));
            expect(db.entry(row).state).toBe('Unchanged');
            expect(f.controls.events).toEqual([
                'base:insert',
                'body:insert',
                'base:inserted',
                'body:inserted'
            ]);
            expect(await f.view.find((row as any).id)).toMatchObject({
                caption: 'accepted'
            });
        });

        it('rechecks predicates after waiting for a concurrent writer', async () => {
            const f = await fixture(storage);
            const row = await f.insert();
            f.controls.events.length = 0;
            const blocker = await knex.transaction();
            await blocker(f.name)
                .where('asset_id', row.id)
                .forUpdate()
                .select('asset_id');
            const pending = f.view
                .where(t => t.id, row.id)
                .where(t => t.title, 'initial')
                .update({ caption: 'must not write' })
                .then(
                    () => undefined,
                    error => error
                );
            try {
                await expect
                    .poll(
                        async () => {
                            const waiting = await knex('pg_stat_activity')
                                .where('wait_event_type', 'Lock')
                                .where('query', 'like', `%${f.name}%`);
                            return waiting.length;
                        },
                        { timeout: 5000, interval: 20 }
                    )
                    .toBeGreaterThan(0);
                await blocker(f.name)
                    .where('asset_id', row.id)
                    .update({ title_text: 'concurrent' });
                await blocker.commit();
                expect(await pending).toBeUndefined();
                expect((await f.view.findOrFail(row.id)).caption).toBe(
                    'initial'
                );
                expect(f.controls.events).toEqual([]);
            } finally {
                if (!blocker.isCompleted()) await blocker.rollback();
                await pending;
            }
        });

        it('keeps native bigint mutation keys exact even with a lossy driver parser', async () => {
            const name = `f07_${randomUUID().replaceAll('-', '')}`;
            const childName = `${name}_child`;
            const base = object({
                id: number().bigint().primaryKey({ autoIncrement: false }),
                kind: string()
            })
                .hasTableName(name)
                .softDelete();
            const body = object({
                ...(storage === 'cti'
                    ? {
                          assetId: number()
                              .bigint()
                              .hasColumnName('asset_id')
                              .primaryKey({ autoIncrement: false })
                      }
                    : {}),
                caption: string()
            }).hasTableName(storage === 'cti' ? childName : name);
            await generateCreateTable(base)(knex);
            tables.push(name);
            if (storage === 'cti') {
                await generateCreateTable(body)(knex);
                tables.push(childName);
            } else await knex.schema.alterTable(name, t => t.text('caption'));
            const entity =
                storage === 'cti'
                    ? defineEntity(base)
                          .discriminator('kind')
                          .ctiVariant(
                              'photo',
                              defineEntity(body),
                              t => t.assetId!
                          )
                    : defineEntity(base)
                          .discriminator('kind')
                          .stiVariant('photo', body);
            const view = createDb(knex, { assets: entity }).assets.ofVariant(
                'photo'
            );
            const original = pgTypes.getTypeParser(20, 'text');
            pgTypes.setTypeParser(20, Number);
            try {
                const id = '9007199254740993';
                await view.insert({ id, caption: 'initial' });
                await view.insert({
                    id: '9007199254740992',
                    caption: 'neighbor'
                });
                await view.where(t => t.id, id).update({ caption: 'exact' });
                expect((await view.findOrFail(id)).caption).toBe('exact');
                expect(
                    (await view.findOrFail('9007199254740992')).caption
                ).toBe('neighbor');
                await view.where(t => t.id, id).delete();
                expect(await view.find(id)).toBeUndefined();
                expect(
                    (
                        await view
                            .onlyDeleted()
                            .where(t => t.id, id)
                            .restore()
                    )[0].id
                ).toBe(id);
                expect(await view.where(t => t.id, id).hardDelete()).toBe(1);
                expect(await view.countValue()).toBe(1);
            } finally {
                pgTypes.setTypeParser(20, original);
            }
        });

        it('captures scopes once and returns writes even after moving out of a child scope', async () => {
            const f = await fixture(storage, true, true);
            const row = await f.insert();
            const selected = f.view.where(t => t.id, row.id);
            const calls = f.controls.scopeCalls;
            await selected.update({ caption: 'outside scope' });
            expect(f.controls.scopeCalls).toBe(calls);
            const stored = await knex(
                storage === 'cti' ? f.childName : f.name
            ).first('caption_text');
            expect(stored.caption_text).toBe('outside scope');
        });
    });
}
