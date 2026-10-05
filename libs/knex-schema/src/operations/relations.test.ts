import { afterEach, describe, expect, it } from 'vitest';
import { mockDriver } from '../../testing/mock-driver.js';
import { array, defineEntity, number, object, string } from '../index.js';
import { QuerySource } from '../QuerySource.js';

const Owner = object({
    id: number().primaryKey(),
    name: string().hasColumnName('display_name'),
    rootId: number().optional()
}).hasTableName('owners');
const Child = object({
    id: number().primaryKey(),
    rootId: number(),
    title: string()
}).hasTableName('children');
const Base = object({
    id: number().primaryKey(),
    kind: string(),
    ownerId: number(),
    owner: Owner.optional(),
    single: Child.optional(),
    children: array(Child).optional(),
    tags: array(Owner).optional()
}).hasTableName('roots');
const Root = defineEntity(Base)
    .belongsTo(
        t => t.owner,
        t => t.ownerId,
        t => t.id
    )
    .hasOne(
        t => t.single,
        t => t.id,
        t => t.rootId
    )
    .hasMany(
        t => t.children,
        t => t.id,
        t => t.rootId
    )
    .belongsToMany(t => t.tags, {
        table: 'root_tags',
        localKey: 'root_id',
        foreignKey: 'owner_id'
    });
const Body = defineEntity(
    object({
        rootId: number().primaryKey(),
        caption: string().hasColumnName('caption_text'),
        ownerId: number(),
        owner: Owner.optional(),
        single: Child.optional()
    }).hasTableName('details')
)
    .belongsTo(
        t => t.owner,
        t => t.ownerId,
        t => t.id
    )
    .hasOne(
        t => t.single,
        t => t.rootId,
        t => t.rootId
    );
const Poly = defineEntity(
    object({ id: number().primaryKey(), kind: string() }).hasTableName('roots')
)
    .discriminator('kind')
    .ctiVariant('photo', Body, t => t.rootId)
    .stiVariant('note', object({ text: string() }));
const drivers: ReturnType<typeof mockDriver>[] = [];
function setup(schema: any) {
    const driver = mockDriver();
    drivers.push(driver);
    return { driver, source: () => new QuerySource(driver.knex, schema) };
}
afterEach(async () => {
    await Promise.all(drivers.splice(0).map(d => d.knex.destroy()));
});

describe('relation SQL planner', () => {
    it.each(['owner', 'single', 'children', 'tags'])(
        'plans %s relations with and without customization',
        async name => {
            const { driver, source } = setup(Root.schema);
            for (const customize of [
                undefined,
                (q: any) => q.select('id').orderBy('id').limit(2).offset(1)
            ]) {
                const plan = source().include(name, customize);
                const sql = plan.toQuery();
                expect(sql).toContain('join');
                expect(sql).toContain(name);
                if (name === 'tags') expect(sql).toContain('root_tags');
                if (name === 'children') expect(sql).toContain('jsonb_agg');
                driver.respond = () => [
                    {
                        id: 1,
                        kind: 'plain',
                        ownerId: 2,
                        [name]:
                            name === 'children' || name === 'tags' ? [] : null
                    }
                ];
                expect((await plan.execute())[0][name]).toEqual(
                    name === 'children' || name === 'tags' ? [] : null
                );
            }
            expect(() => source().include('missing')).toThrow(
                'Unknown relation'
            );
        }
    );
    it('maps CTI bodies and relations, including absent optional rows', async () => {
        const { driver, source } = setup(Poly.schema);
        const plan = source()
            .includeVariant('photo', 'owner', q => {
                q.select('name');
            })
            .includeVariant('photo', 'single');
        const sql = plan.toQuery();
        expect(sql).toContain('__v_photo');
        expect(sql).toContain('caption_text');
        driver.respond = () => [
            {
                id: 1,
                kind: 'photo',
                __v_photo__rootId: 1,
                __v_photo__caption_text: 'caption',
                __v_photo__ownerId: 2,
                __v_photo__rel_owner__display_name: 'Ada',
                __v_photo__rel_single__id: null
            }
        ];
        expect(await plan.execute()).toMatchObject([
            {
                id: 1,
                kind: 'photo',
                caption: 'caption',
                ownerId: 2,
                owner: { name: 'Ada' },
                single: null
            }
        ]);
        driver.respond = () => [
            { id: 1, kind: 'photo', __v_photo__rootId: null }
        ];
        await expect(source().execute()).rejects.toThrow('Polymorphic orphan');
        driver.respond = () => [
            { id: 2, kind: 'note', text: 'hello' },
            { id: 3, kind: 'unknown' }
        ];
        expect(await source().execute()).toEqual([
            { id: 2, kind: 'note', text: 'hello' },
            { id: 3, kind: 'unknown' }
        ]);
    });
    it('resolves unique variant relation names and validates variant filters', () => {
        const { source } = setup(Poly.schema);
        expect(source().include('owner').toQuery()).toContain(
            '__v_photo__rel_owner'
        );
        expect(
            source()
                .whereVariant('photo', 'caption', 'LIKE', '%safe%')
                .selectVariants(['photo'])
                .toQuery()
        ).toContain('%safe%');
        expect(
            source().whereVariant('note', 'text', '=', 'hello').toQuery()
        ).toContain('hello');
        expect(() => source().whereVariant('missing', 'text', '=', 1)).toThrow(
            'unknown variant'
        );
        expect(() =>
            source().whereVariant('note', 'text', 'invalid', 1)
        ).toThrow('not allowed');
        expect(() => source().includeVariant('missing', 'owner')).toThrow(
            'unknown variant'
        );
        expect(() => source().includeVariant('note', 'missing')).toThrow(
            'unknown relation'
        );
        const normal = setup(Base).source;
        expect(() => normal().includeVariant('photo', 'owner')).toThrow(
            'not polymorphic'
        );
        expect(() => normal().whereVariant('photo', 'caption', '=', 1)).toThrow(
            'polymorphic schema'
        );
        expect(() => normal().selectVariants(['photo'])).toThrow(
            'polymorphic schema'
        );
    });
});
