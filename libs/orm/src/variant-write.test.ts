import Knex from 'knex';
import { afterAll, expect, it } from 'vitest';
import { createDb, defineEntity, number, object, string } from './index.js';

const knex = Knex({ client: 'pg' });
afterAll(() => knex.destroy());
const owner = object({
    id: number().primaryKey(),
    name: string()
}).hasTableName('owners');
const base = object({
    id: number().primaryKey(),
    kind: string(),
    ownerId: number(),
    owner: owner.optional()
}).hasTableName('assets');
const entity = defineEntity(base)
    .belongsTo(
        t => t.owner,
        t => t.ownerId,
        t => t.id
    )
    .discriminator('kind')
    .stiVariant('photo', object({ caption: string() }))
    .stiVariant('document', object({ text: string() }));
const view = createDb(knex, { assets: entity }).assets.ofVariant('photo');

it('rejects identity changes and unknown fields before opening a connection', async () => {
    for (const patch of [
        { id: 2 },
        { kind: 'document' },
        { missing: true },
        { owner: { id: 1 } }
    ]) {
        await expect(view.update(patch as any)).rejects.toThrow(
            /identity|Unknown/
        );
    }
});

it('rejects writes through a projected, included or expanded variant view', async () => {
    const projected = view.forVariant('photo', q =>
        q.select(t => ({ id: t.id, kind: t.kind }))
    );
    const included = view.include(t => t.owner);
    expect(() => (view as any).selectVariants(['photo', 'document'])).toThrow(
        /declared variants/
    );
    for (const query of [projected, included] as any[]) {
        for (const method of [
            'insert',
            'update',
            'delete',
            'restore',
            'hardDelete'
        ]) {
            await expect(query[method]({})).rejects.toThrow(
                /unprojected|original variant/
            );
        }
    }
});

it('rejects composite primary keys before executing writes', async () => {
    const composite = defineEntity(
        object({ a: number(), b: number(), kind: string() })
            .hasTableName('composite')
            .hasPrimaryKey(['a', 'b'])
    )
        .discriminator('kind')
        .stiVariant('photo', object({ caption: string() }));
    const query = createDb(knex, { assets: composite }).assets.ofVariant(
        'photo'
    );
    for (const method of [
        'insert',
        'update',
        'delete',
        'restore',
        'hardDelete'
    ] as const) {
        await expect((query[method] as any)({})).rejects.toThrow(
            /single-column/
        );
    }
});
