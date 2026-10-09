import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockDriver } from '../../testing/mock-driver.js';
import { number, object, query, string } from '../index.js';

const Item = object({
    id: number().primaryKey(),
    name: string().hasColumnName('display_name'),
    version: number()
}).hasTableName('items');
const connections: ReturnType<typeof mockDriver>[] = [];
function setup(schema = Item) {
    const driver = mockDriver();
    connections.push(driver);
    driver.respond = q =>
        q.sql.startsWith('insert')
            ? [{ id: 1, display_name: 'saved', version: 2 }]
            : [];
    return { driver, writer: query(schema).query(driver.knex) };
}
afterEach(async () => {
    await Promise.all(connections.splice(0).map(d => d.knex.destroy()));
});

describe('insert execution', () => {
    it('maps columns, executes ordered hooks and does not mutate inputs', async () => {
        const before = vi.fn(data => ({ ...data, name: data.name.trim() }));
        const after = vi.fn();
        const schema = Item.hasTimestamps()
            .beforeInsert(before)
            .beforeInsert(() => undefined)
            .afterInsert(after);
        const { driver, writer } = setup(schema);
        const input = { id: 1, name: ' submitted ', version: 2 };
        const row = await writer.insert(input);
        expect(row).toEqual({ id: 1, name: 'saved', version: 2 });
        expect(input.name).toBe(' submitted ');
        expect(driver.queries[0].sql).toContain('CURRENT_TIMESTAMP');
        expect(driver.queries[0].bindings).toContain('submitted');
        expect(after).toHaveBeenCalledWith(row);
        expect(after.mock.invocationCallOrder[0]).toBeGreaterThan(
            before.mock.invocationCallOrder[0]
        );
        await writer.insertMany([input, { ...input, id: 2 }]);
        expect(before).toHaveBeenCalledTimes(3);
    });

    it('supports ignored conflicts, implicit merges, and conditional expression updates', async () => {
        const { driver, writer } = setup(Item.hasTimestamps());
        await writer.onConflict('id').merge({ id: 1, name: 'a', version: 1 });
        const merge = driver.queries[0].sql.split('do update set')[1];
        expect(merge).toContain('updated_at');
        expect(merge).not.toContain('created_at');
        await writer.onConflict('id').merge(
            { id: 1, name: 'a', version: 1 },
            {
                version: h => h.raw('?? + ?', [h.column('version'), 1]),
                name: h => h.excluded('name')
            },
            {
                where: (qb, h) =>
                    qb.where(h.column('version'), '<', h.excluded('version'))
            }
        );
        expect(driver.queries[1].sql).toContain('excluded."display_name"');
        expect(driver.queries[1].bindings).toContain(1);
        expect(driver.queries[1].sql).toContain(
            'where "version" < excluded."version"'
        );
        await writer
            .onConflict('id')
            .merge(
                { id: 1, name: 'a', version: 1 },
                { where: qb => qb.where('version', 1) }
            );
        expect(driver.queries[2].sql).toContain('where "version" =');
        driver.respond = () => [];
        expect(
            await writer
                .onConflict('id')
                .ignore({ id: 1, name: 'a', version: 1 })
        ).toBeUndefined();
        expect(driver.queries[3].sql).toContain('do nothing');
    });

    it('upserts either all columns or only the selected update columns', async () => {
        const { driver, writer } = setup();
        await writer.upsert(
            { id: 1, name: 'a', version: 1 },
            { conflictColumns: ['id'], updateColumns: ['name'] }
        );
        expect(
            driver.queries[0].sql
                .split('do update set')[1]
                .split(' returning')[0]
        ).toBe(' "display_name" = excluded."display_name"');
        await writer.upsert(
            { id: 1, name: 'b', version: 2 },
            { conflictColumns: ['id'] }
        );
        expect(driver.queries[1].sql.split('do update set')[1]).toContain(
            '"version" = excluded."version"'
        );
    });

    it('chunks bulk writes, runs hooks, and never updates conflict or creation columns', async () => {
        const before = vi.fn(data => data);
        const after = vi.fn();
        const { driver, writer } = setup(
            Item.hasTimestamps().beforeInsert(before).afterInsert(after)
        );
        const rows = [1, 2, 3].map(id => ({ id, name: 'n', version: 1 }));
        const result = await writer.bulkInsert(rows, {
            chunkSize: 2,
            onConflict: 'merge',
            conflictColumns: ['id']
        });
        expect(driver.queries).toHaveLength(2);
        expect(before).toHaveBeenCalledTimes(3);
        expect(after).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(2);
        const merge = driver.queries[0].sql.split('do update set')[1];
        expect(merge).not.toContain('"id" =');
        expect(merge).not.toContain('"created_at" =');
        expect(merge).toContain('"updated_at" =');
        await writer.bulkInsert(rows, {
            chunkSize: 0,
            onConflict: 'ignore',
            conflictColumns: ['id']
        });
        expect(driver.queries.slice(2)).toHaveLength(3);
        expect(driver.queries[2].sql).toContain('do nothing');
        await writer.bulkUpsert(rows, { conflictColumns: ['id'] });
        expect(driver.queries.at(-1)?.sql).toContain('do update set');
        expect(await writer.bulkInsert([])).toEqual([]);
        await expect(
            writer.bulkInsert(rows, { onConflict: 'merge' })
        ).rejects.toThrow('conflictColumns');
    });
});
