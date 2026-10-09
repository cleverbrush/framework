import { afterEach, describe, expect, it } from 'vitest';
import { mockDriver } from '../testing/mock-driver.js';
import {
    boolean,
    date,
    defineEntity,
    number,
    object,
    query,
    string
} from './index.js';

const Base = object({
    id: number().primaryKey(),
    kind: string(),
    enabled: boolean(),
    created: date(),
    deletedAt: date().optional().hasColumnName('deleted_at')
})
    .hasTableName('assets')
    .softDelete();
const Entity = defineEntity(Base)
    .discriminator('kind')
    .stiVariant('note', object({ text: string() }))
    .stiVariant('image', object({ url: string() }));
const drivers: ReturnType<typeof mockDriver>[] = [];
function setup(schema: any = Entity.schema) {
    const driver = mockDriver();
    drivers.push(driver);
    const row = {
        id: 1,
        kind: 'note',
        enabled: true,
        created: new Date(0).toISOString(),
        deletedAt: null,
        text: 'hello'
    };
    driver.respond = q =>
        q.sql.includes('count(') ? [{ count: '3' }] : [{ __read_poly: row }];
    return { driver, read: query(schema).query(driver.knex), row };
}
afterEach(async () => {
    await Promise.all(drivers.splice(0).map(d => d.knex.destroy()));
});
describe('polymorphic read execution', () => {
    it('globally orders, pages, plucks and decodes branch rows without mutating the definition', async () => {
        const { read } = setup();
        const original = read.toQuery();
        const page = read
            .selectVariants(['note'])
            .orderBy('id', 'desc')
            .orderBy('enabled')
            .orderBy('created')
            .orderBy('kind')
            .orderByRaw('1 desc')
            .limit(2)
            .offset(1);
        expect(await page.first()).toMatchObject({
            kind: 'note',
            text: 'hello',
            created: new Date(0)
        });
        expect(await page.pluck('id')).toEqual([1]);
        expect(await page.countValue()).toBe(3);
        expect(await page.paginate({ page: 2, pageSize: 2 })).toMatchObject({
            total: 3,
            totalPages: 2,
            hasNextPage: false,
            hasPreviousPage: true
        });
        expect(read.toQuery()).toBe(original);
        expect(read.onlyDeleted().toQuery()).toContain('is not null');
        expect(read.withDeleted().toQuery()).not.toMatch(
            /"__cb_read_deleted_\d+" is null/
        );
    });
    it('validates bounds, projections, selected branches and decoded discriminators', async () => {
        const { read, driver, row } = setup();
        for (const method of ['limit', 'offset'])
            expect(() => read[method](-1)).toThrow('non-negative');
        for (const keys of [[], ['missing'], ['note', 'note']])
            expect(() => read.selectVariants(keys)).toThrow(
                'declared variants'
            );
        expect(() => read.orderBy('id', 'wrong')).toThrow('direction');
        expect(() => read.orderBy('missing')).toThrow('Column');
        expect(() => read.forVariant('missing', (q: any) => q)).toThrow();
        expect(() =>
            read.forVariant('note', (q: any) => q.select('text'))
        ).toThrow('discriminator');
        expect(() => read.include('missing')).toThrow('Unknown relation');
        expect(() => read.scoped('missing')).toThrow('Unknown scope');
        for (const opts of [
            { page: 0, pageSize: 1 },
            { page: 1, pageSize: 0 }
        ])
            await expect(read.paginate(opts)).rejects.toThrow('positive');
        driver.respond = () => [{ count: '9007199254740993' }];
        await expect(read.countValue()).rejects.toThrow('safe integer');
        driver.respond = () => [{ __read_poly: { ...row, kind: 'missing' } }];
        await expect(read.execute()).rejects.toThrow('unknown polymorphic');
    });
    it('applies stable named/default scopes and rejects shape-changing scopes', () => {
        const schema = Entity.schema
            .defaultScope(q =>
                q.where('enabled', true).orderBy('id').limit(10).offset(1)
            )
            .scope('notes', q => q.where('kind', 'note'));
        const { read } = setup(schema);
        expect(read.scoped('notes').toQuery()).toContain("'note'");
        expect(read.unscoped().toQuery()).not.toContain('limit 10');
        const invalid = Entity.schema.scope('invalid', (q: any) =>
            q.selectVariants(['note'])
        );
        expect(() => setup(invalid).read.scoped('invalid')).toThrow(
            'shape-preserving'
        );
    });
    it('requires explicit output contracts for raw query escapes', async () => {
        const { read, driver } = setup();
        const output = object({ id: number() });
        driver.respond = () => [{ id: 1 }];
        expect(
            await read.selectRaw('? as id', [1], { output }).execute()
        ).toEqual([{ id: 1 }]);
        expect(
            await read
                .apply(
                    (q: any) => {
                        q.clearSelect().select('id');
                    },
                    { output }
                )
                .first()
        ).toEqual({ id: 1 });
        expect(() => read.apply(() => Promise.resolve(), { output })).toThrow(
            'synchronously'
        );
    });
});
