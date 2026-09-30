import { randomUUID } from 'node:crypto';
import {
    array,
    createDb,
    date,
    defineEntity,
    number,
    object,
    string
} from '@cleverbrush/orm';
import Knex from 'knex';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const connection = process.env.QUERY_TEST_DATABASE_URL;
if (!connection) throw new Error('QUERY_TEST_DATABASE_URL is required');
const knex = Knex({ client: 'pg', connection });
const prefix = `cb_read_${randomUUID().replaceAll('-', '')}`;
const names = {
    albums: `${prefix}_albums`,
    assets: `${prefix}_assets`,
    photos: `${prefix}_photos`,
    labels: `${prefix}_labels`
};
const Label = object({
    id: number().primaryKey(),
    assetId: number().hasColumnName('asset_id'),
    label: string(),
    addedAt: date().hasColumnName('added_at')
}).hasTableName(names.labels);
const Photo = defineEntity(
    object({
        assetId: number().primaryKey().hasColumnName('asset_id'),
        size: number().bigint(),
        takenAt: date().hasColumnName('taken_at'),
        labels: array(Label).optional()
    }).hasTableName(names.photos)
).hasMany(
    p => p.labels,
    p => p.assetId,
    l => l.assetId
);
const Asset = defineEntity(
    object({
        id: number().primaryKey(),
        kind: string().hasColumnName('asset_kind'),
        albumId: number().hasColumnName('album_id'),
        rank: number().decimal(24, 6),
        createdAt: date().hasColumnName('created_at')
    }).hasTableName(names.assets)
)
    .discriminator(a => a.kind)
    .ctiVariant('photo', Photo, p => p.assetId)
    .stiVariant('text', object({ body: string() }));
const Album = defineEntity(
    object({
        id: number().primaryKey(),
        assets: array(Asset.schema).optional()
    }).hasTableName(names.albums)
).hasMany(
    a => a.assets,
    a => a.id,
    a => a.albumId
);
const db = createDb(knex, { assets: Asset, albums: Album });

beforeAll(async () => {
    await knex.schema.createTable(names.albums, t => {
        t.integer('id').primary();
    });
    await knex.schema.createTable(names.assets, t => {
        t.integer('id').primary();
        t.text('asset_kind');
        t.integer('album_id');
        t.decimal('rank', 24, 6);
        t.timestamp('created_at', { useTz: true });
        t.text('body');
    });
    await knex.schema.createTable(names.photos, t => {
        t.integer('asset_id').primary();
        t.bigInteger('size');
        t.timestamp('taken_at', { useTz: true });
    });
    await knex.schema.createTable(names.labels, t => {
        t.integer('id').primary();
        t.integer('asset_id');
        t.text('label');
        t.timestamp('added_at', { useTz: true });
    });
    await knex(names.albums).insert([{ id: 1 }, { id: 2 }]);
    await knex(names.assets).insert([
        {
            id: 1,
            asset_kind: 'photo',
            album_id: 1,
            rank: '10.000001',
            created_at: '2026-01-01T00:00:00Z'
        },
        {
            id: 2,
            asset_kind: 'text',
            album_id: 1,
            rank: '2.000001',
            created_at: '2026-01-01T00:00:00Z',
            body: 'hello'
        }
    ]);
    await knex(names.photos).insert({
        asset_id: 1,
        size: '9007199254740993',
        taken_at: '2026-01-02T00:00:00Z'
    });
    await knex(names.labels).insert([
        {
            id: 1,
            asset_id: 1,
            label: 'first',
            added_at: '2026-01-03T00:00:00Z'
        },
        {
            id: 2,
            asset_id: 1,
            label: 'second',
            added_at: '2026-01-04T00:00:00Z'
        }
    ]);
});
afterAll(async () => {
    for (const table of [
        names.labels,
        names.photos,
        names.assets,
        names.albums
    ])
        await knex.schema.dropTableIfExists(table);
    await knex.destroy();
});

describe('schema-aware polymorphic graphs', () => {
    it('orders using native values even when branch projections omit sort fields', async () => {
        const read = db.assets
            .withRowSchema()
            .forVariant('photo', q =>
                q.select(a => ({ id: a.id, kind: a.kind }))
            )
            .forVariant('text', q =>
                q.select(a => ({ id: a.id, kind: a.kind }))
            )
            .orderBy(a => a.rank);
        expect(await read).toEqual([
            { id: 2, kind: 'text' },
            { id: 1, kind: 'photo' }
        ]);
        expect(await read.selectVariants(['photo'])).toEqual([
            { id: 1, kind: 'photo' }
        ]);
        expect(() =>
            db.assets
                .withRowSchema()
                .forVariant('text', q => q.select(a => ({ id: a.id })))
        ).toThrow(/retain.*discriminator/);
    });
    it('exposes exact branch schemas, dates and numeric ordering in one statement', async () => {
        const read = db.assets
            .withRowSchema()
            .forVariant('photo', q =>
                q.include(
                    r => r.labels,
                    labels => labels.orderBy(l => l.id, 'desc').limit(1)
                )
            )
            .orderBy(a => a.rank);
        const calls: unknown[] = [];
        const listener = (sql: unknown) => calls.push(sql);
        knex.on('query', listener);
        try {
            expect(read.rowSchema.introspect().type).toBe('union');
            expect(read.limit(1).rowSchema).toBe(read.rowSchema);
            expect(calls).toHaveLength(0);
            const rows = await read;
            expect(calls).toHaveLength(1);
            expect(rows.map(r => r.id)).toEqual([2, 1]);
            const photo = rows[1];
            expect(photo).toMatchObject({
                kind: 'photo',
                size: '9007199254740993',
                rank: '10.000001',
                labels: [{ label: 'second' }]
            });
            expect(photo.createdAt).toBeInstanceOf(Date);
            if (photo.kind === 'photo') {
                expect(photo.takenAt).toBeInstanceOf(Date);
                expect(photo.labels[0].addedAt).toBeInstanceOf(Date);
                expect(read.variantRowSchemas.photo.validate(photo).valid).toBe(
                    true
                );
            }
            expect(rows.every(row => read.rowSchema.validate(row).valid)).toBe(
                true
            );
        } finally {
            knex.off('query', listener);
        }
    });

    it('decodes nested polymorphic relations and empty arrays without hidden fetches', async () => {
        const read = db.albums
            .withRowSchema()
            .include(
                r => r.assets,
                assets =>
                    assets
                        .forVariant('photo', q => q.include(r => r.labels))
                        .orderBy(a => a.id)
            )
            .orderBy(a => a.id);
        const rows = await read;
        expect(rows[0].assets).toHaveLength(2);
        expect(rows[1].assets).toEqual([]);
        const photo = rows[0].assets[0];
        if (photo.kind !== 'photo') throw new Error('expected photo');
        expect(photo.size).toBe('9007199254740993');
        expect(photo.labels[0].addedAt).toBeInstanceOf(Date);
        expect(read.rowSchema.validate(rows[0]).valid).toBe(true);
    });

    it('rejects unknown discriminators and missing required CTI bodies', async () => {
        await knex(names.assets).insert([
            {
                id: 3,
                asset_kind: 'unknown',
                album_id: 2,
                rank: '1',
                created_at: new Date()
            },
            {
                id: 4,
                asset_kind: 'photo',
                album_id: 2,
                rank: '1',
                created_at: new Date()
            }
        ]);
        try {
            await expect(
                db.assets
                    .withRowSchema()
                    .where(a => a.id, 3)
                    .execute()
            ).rejects.toThrow('unknown polymorphic discriminator');
            await expect(
                db.assets
                    .withRowSchema()
                    .where(a => a.id, 4)
                    .execute()
            ).rejects.toThrow('missing CTI variant body');
            const tolerant = defineEntity(Asset.schema)
                .discriminator(a => a.kind)
                .ctiVariant('photo', Photo, p => p.assetId, {
                    allowOrphan: true
                });
            const reader = createDb(knex, { assets: tolerant })
                .assets.withRowSchema()
                .where(a => a.id, 4);
            const orphan = await reader.first();
            expect(orphan).toMatchObject({
                id: 4,
                kind: 'photo',
                size: null,
                takenAt: null
            });
            expect(reader.variantRowSchemas.photo.validate(orphan!).valid).toBe(
                true
            );
        } finally {
            await knex(names.assets).whereIn('id', [3, 4]).delete();
        }
    });
});
