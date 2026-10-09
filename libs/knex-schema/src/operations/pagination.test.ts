import { afterEach, describe, expect, it } from 'vitest';
import { mockDriver } from '../../testing/mock-driver.js';
import {
    aggregate,
    boolean,
    date,
    number,
    object,
    query,
    string
} from '../index.js';
import { QuerySource } from '../QuerySource.js';

const Row = object({
    id: number().primaryKey(),
    name: string(),
    active: boolean(),
    created: date(),
    optional: string().optional()
}).hasTableName('items');
const drivers: ReturnType<typeof mockDriver>[] = [];
function setup() {
    const driver = mockDriver();
    drivers.push(driver);
    driver.respond = q =>
        q.sql.includes('count(')
            ? [{ count: '5' }]
            : [1, 2, 3].map(id => ({
                  id,
                  name: `n${id}`,
                  active: true,
                  created: new Date(0),
                  optional: null,
                  __cursor_value: id,
                  ...Object.fromEntries(
                      [...q.sql.matchAll(/as "(__cb_cursor_\d+)"/g)].map(
                          ([_, key], i) => [key, String(i ? id : id)]
                      )
                  )
              }));
    return {
        driver,
        read: query(Row).query(driver.knex),
        source: () => new QuerySource(driver.knex, Row)
    };
}
afterEach(async () => {
    await Promise.all(drivers.splice(0).map(d => d.knex.destroy()));
});
describe('pagination execution and cursor validation', () => {
    it('counts and pages without modifying immutable reads', async () => {
        const { read, driver } = setup();
        const sql = read.toQuery();
        const result = await read.paginate({ page: 2, pageSize: 2 });
        expect(result).toMatchObject({
            total: 5,
            totalPages: 3,
            hasNextPage: true,
            hasPreviousPage: true
        });
        expect(read.toQuery()).toEqual(sql);
        expect(driver.queries[1].bindings).toEqual([2, 2]);
        expect(await read.pluck('id')).toEqual([1, 2, 3]);
        for (const options of [
            { page: 0, pageSize: 2 },
            { page: 1, pageSize: 0 }
        ])
            await expect(read.paginate(options)).rejects.toThrow('positive');
        driver.respond = () => [{ count: '9007199254740993' }];
        await expect(read.paginate({ page: 1, pageSize: 2 })).rejects.toThrow(
            'safe integer'
        );
    });
    it('returns raw and composite cursors and rejects incompatible/tampered tokens', async () => {
        const { read, driver, source } = setup();
        const page = await read.paginateAfter({
            limit: 2,
            cursor: 4,
            direction: 'asc'
        });
        expect(page).toMatchObject({ hasMore: true, nextCursor: '2' });
        expect(driver.queries[0].bindings).toContain(4);
        const orderBy = [{ column: 'id', direction: 'asc' }] as const;
        const first = await source()
            .where('active', true)
            .paginateAfter({ limit: 2, orderBy });
        expect(first.data).toHaveLength(2);
        expect(first.data[0]).not.toHaveProperty('__cb_cursor_0');
        expect(first.nextCursor).toBeTypeOf('string');
        await source()
            .where('active', true)
            .paginateAfter({ limit: 2, orderBy, cursor: first.nextCursor });
        expect(driver.queries.at(-1)?.bindings).toContain('2');
        const payload = JSON.parse(
            Buffer.from(first.nextCursor!, 'base64url').toString()
        );
        for (const cursor of [
            'invalid!',
            Buffer.from(JSON.stringify({ ...payload, v: 2 })).toString(
                'base64url'
            ),
            Buffer.from(
                JSON.stringify({ ...payload, values: ['not a number'] })
            ).toString('base64url')
        ])
            await expect(
                source().paginateAfter({ limit: 2, orderBy, cursor })
            ).rejects.toThrow('Invalid cursor');
        await expect(
            source().paginateAfter({
                limit: 2,
                orderBy: [{ column: 'id', direction: 'desc' }],
                cursor: first.nextCursor
            })
        ).rejects.toThrow('incompatible');
        driver.respond = () => [];
        expect(await read.paginateAfter({ limit: 2 })).toEqual({
            data: [],
            hasMore: false,
            nextCursor: null
        });
    });
    it('validates cursor shapes and unsafe query combinations before executing', async () => {
        const { read, source, driver } = setup();
        for (const options of [
            { limit: 0 },
            { limit: 1, direction: 'wrong' },
            { limit: 1, column: 'missing' }
        ])
            await expect(
                (read as any).paginateAfter(options)
            ).rejects.toThrow();
        for (const options of [
            { limit: 0, orderBy: [{ column: 'id', direction: 'asc' }] },
            { limit: 1, orderBy: [] },
            { limit: 1, orderBy: [{ column: 'id', direction: 'wrong' }] },
            { limit: 1, orderBy: [{ column: 'optional', direction: 'asc' }] },
            { limit: 1, orderBy: [{ column: 'name', direction: 'asc' }] },
            {
                limit: 1,
                orderBy: [
                    { column: 'id', direction: 'asc' },
                    { column: 'id', direction: 'desc' }
                ]
            }
        ])
            await expect(
                source().paginateAfter(options as any)
            ).rejects.toThrow();
        await expect(
            source()
                .offset(1)
                .paginateAfter({
                    limit: 2,
                    orderBy: [{ column: 'id', direction: 'asc' }]
                })
        ).rejects.toThrow('offsets');
        await expect(
            read
                .select(() => ({ count: aggregate.count() }))
                .paginateAfter({ limit: 1 })
        ).rejects.toThrow('aggregate');
        expect(driver.queries).toEqual([]);
    });
    it('executes low-level offset and simple cursor pages using mapped fields', async () => {
        const { source } = setup();
        expect(await source().paginate({ page: 1, pageSize: 2 })).toMatchObject(
            { total: 5, totalPages: 3 }
        );
        expect(
            await source().paginateAfter({
                limit: 2,
                column: t => t.id,
                direction: 'asc',
                cursor: 0
            })
        ).toMatchObject({ hasMore: true, nextCursor: '2' });
        expect(await source().paginateAfter({ limit: 5 })).toMatchObject({
            hasMore: false,
            nextCursor: null
        });
    });
});
