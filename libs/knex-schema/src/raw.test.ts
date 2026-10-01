import Knex, { type Knex as Connection } from 'knex';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { number, object, string } from './index.js';
import { rawQuery } from './raw.js';

// Stub only the driver boundary: raw() must still build real captured SQL.
describe('rawQuery explicit output contract', () => {
    let knex: Connection;
    let response: unknown[];
    let statements: Array<{ sql: string; bindings: unknown[] }>;
    beforeEach(() => {
        knex = Knex({ client: 'pg' });
        response = [];
        statements = [];
        const client = knex.client as any;
        client.acquireConnection = async () => ({});
        client.releaseConnection = async () => {};
        client._query = async (_connection: unknown, statement: any) => {
            statements.push(statement);
            return { rows: response };
        };
        client.processResponse = (result: any) => result.rows;
    });
    afterEach(async () => {
        await knex.destroy();
    });

    it('parses SQL-aliased properties once, preserving the caller output contract', async () => {
        const output = object({
            id: number(),
            authorId: number(),
            total: number().coerce()
        });
        const parse = vi.spyOn(output, 'parse');
        response = [{ id: 1, authorId: 7, total: '12' }];
        const rows = await rawQuery(
            knex,
            output,
            'select id, author_id as "authorId", total from posts where id = ?',
            [1]
        );
        expect(rows).toEqual([{ id: 1, authorId: 7, total: 12 }]);
        expect(parse).toHaveBeenCalledExactlyOnceWith(response[0]);
        expect(statements[0].bindings).toEqual([1]);
    });

    it('does not silently remap raw output or accept a missing selected column', async () => {
        response = [{ author_id: 7 }];
        await expect(
            rawQuery(
                knex,
                object({ authorId: number() }),
                'select author_id from posts'
            )
        ).rejects.toThrow();
    });

    it('returns an empty result without invoking the row parser', async () => {
        const output = object({ id: number() });
        const parse = vi.spyOn(output, 'parse');
        expect(await rawQuery(knex, output, 'select id from posts')).toEqual(
            []
        );
        expect(parse).not.toHaveBeenCalled();
        expect(statements[0].bindings).toEqual([]);
    });

    it('snapshots a caller-owned Knex SELECT without mutating or retaining it', async () => {
        response = [{ id: 9 }];
        const source = knex('posts').select('id').where('id', 9);
        const pending = rawQuery(knex, object({ id: number() }), source);
        source.where('id', 100);
        expect(await pending).toEqual([{ id: 9 }]);
        expect(statements[0].bindings).toEqual([9]);
    });

    it('keeps exact numeric text exact with an explicit text output', async () => {
        response = [{ amount: '12345678901234567890.012345' }];
        expect(
            await rawQuery(
                knex,
                object({ amount: string() }),
                'select amount::text as amount from invoices'
            )
        ).toEqual(response);
    });

    it('rejects invalid raw rows', async () => {
        response = [{ id: 'not a number' }];
        await expect(
            rawQuery(knex, object({ id: number() }), 'select id from posts')
        ).rejects.toThrow();
    });

    it('rejects non-object output and non-SELECT builders before execution', () => {
        expect(() =>
            rawQuery(knex, string() as any, 'select id from posts')
        ).toThrow(/object schema/);
        expect(() =>
            rawQuery(knex, object({ id: number() }), knex('posts').delete())
        ).toThrow(/SELECT/);
        expect(statements).toEqual([]);
    });

    it('rejects asynchronous output parsers instead of returning promises as rows', async () => {
        response = [{ id: 1 }];
        const output = object({ id: number() });
        vi.spyOn(output, 'parse').mockImplementation((async () => ({
            id: 1
        })) as any);
        await expect(
            rawQuery(knex, output, 'select id from posts')
        ).rejects.toThrow(/synchronously/);
    });
});
