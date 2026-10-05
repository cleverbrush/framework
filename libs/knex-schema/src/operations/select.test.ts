import { afterEach, describe, expect, it } from 'vitest';
import { mockDriver } from '../../testing/mock-driver.js';
import { aggregate, number, object, string } from '../index.js';
import { QuerySource } from '../QuerySource.js';

const Schema = object({
    id: number().primaryKey(),
    name: string().hasColumnName('display_name')
}).hasTableName('items');
const drivers: ReturnType<typeof mockDriver>[] = [];
function setup(schema: any = Schema) {
    const driver = mockDriver();
    drivers.push(driver);
    return { driver, read: () => new QuerySource(driver.knex, schema) };
}
afterEach(async () => {
    await Promise.all(drivers.splice(0).map(d => d.knex.destroy()));
});
describe('native selection planning', () => {
    it.each(['count', 'countDistinct', 'min', 'max', 'sum', 'avg'])(
        'maps %s columns and compiles aggregate SQL',
        async method => {
            const { read } = setup();
            expect((read() as any)[method]('id').toQuery()).toContain(
                method === 'countDistinct' ? 'count(distinct' : `${method}(`
            );
            if (method.startsWith('count'))
                expect((read() as any)[method]().toQuery()).toContain('count(');
        }
    );
    it('compiles grouped/having projections and rejects invalid projection values', async () => {
        const { read, driver } = setup();
        const q = read()
            .select(t => ({ label: t.name, count: aggregate.count() }))
            .groupBy('name')
            .having('id', '>', 0);
        expect(q.toQuery()).toContain('group by "display_name"');
        driver.respond = () => [{ label: 'group', count: '2' }];
        expect(await q.execute()).toEqual([{ label: 'group', count: 2 }]);
        expect(() =>
            read().select(() => ({ invalid: 'not a descriptor' }) as any)
        ).toThrow('property descriptor');
        expect(() =>
            read()
                .select(t => ({ label: t.name }))
                .select('id')
        ).toThrow();
        expect(read().distinct('name').toQuery()).toContain(
            'distinct "display_name"'
        );
        expect(read().selectRaw('? as literal', [1]).toQuery()).toContain(
            '1 as literal'
        );
        expect(read().selectRaw('1 as literal').toQuery()).toContain(
            '1 as literal'
        );
    });
    it('applies explicit scopes and isolates default visibility', () => {
        const schema = Schema.defaultScope(q => q.where('id', '>', 0))
            .scope('named', q => q.where('name', 'visible'))
            .softDelete();
        const { read } = setup(schema);
        expect(read().scoped('named').toQuery()).toContain("'visible'");
        expect(read().toQuery()).toContain('"deleted_at" is null');
        expect(read().onlyDeleted().toQuery()).toContain(
            '"deleted_at" is not null'
        );
        expect(read().unscoped().toQuery()).not.toContain('deleted_at');
        expect(() => read().scoped('missing' as any)).toThrow('Unknown scope');
    });
});
