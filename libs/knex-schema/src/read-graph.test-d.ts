import type { InferType } from '@cleverbrush/schema';
import Knex from 'knex';
import { expectTypeOf, test } from 'vitest';
import { defineEntity } from './entity.js';
import { array, date, number, object, string } from './extension.js';
import { query } from './SchemaQueryBuilder.js';

const Label = object({
    id: number().primaryKey(),
    assetId: number(),
    label: string()
}).hasTableName('labels');
const Photo = defineEntity(
    object({
        assetId: number().primaryKey(),
        size: number().bigint(),
        takenAt: date(),
        labels: array(Label).optional()
    }).hasTableName('photos')
).hasMany(
    p => p.labels,
    p => p.assetId,
    l => l.assetId
);
const Asset = defineEntity(
    object({
        id: number().primaryKey(),
        kind: string(),
        albumId: number(),
        createdAt: date()
    }).hasTableName('assets')
)
    .discriminator(a => a.kind)
    .ctiVariant('photo', Photo, p => p.assetId)
    .stiVariant('text', object({ body: string() }));
const Album = defineEntity(
    object({
        id: number().primaryKey(),
        assets: array(Asset.schema).optional()
    }).hasTableName('albums')
).hasMany(
    a => a.assets,
    a => a.id,
    a => a.albumId
);
const knex = Knex({ client: 'pg' });

test('polymorphic read branches retain discriminators and nested relation types', async () => {
    const read = query(knex, Asset.schema)
        .withRowSchema()
        .forVariant('photo', q =>
            q.include(
                r => r.labels,
                labels => labels.select(l => ({ text: l.label }))
            )
        );
    type PhotoRow = InferType<typeof read.variantRowSchemas.photo>;
    type Expected = {
        id: number;
        kind: 'photo';
        albumId: number;
        createdAt: Date;
        size: string;
        takenAt: Date;
        labels: { text: string }[];
    };
    expectTypeOf<PhotoRow>().toExtend<Expected>();
    expectTypeOf<Expected>().toExtend<PhotoRow>();
    const rows = await read;
    if (rows[0].kind === 'photo') {
        expectTypeOf(rows[0].size).toEqualTypeOf<string>();
        expectTypeOf(rows[0].labels[0].text).toEqualTypeOf<string>();
        const labels = rows[0].labels;
        expectTypeOf<keyof (typeof labels)[number]>().toEqualTypeOf<'text'>();
        // @ts-expect-error the other branch's fields are unavailable after narrowing
        rows[0].body;
    }
    // @ts-expect-error undeclared variants are not accepted
    read.forVariant('unknown', q => q);
});

test('polymorphic reads compose inside an ordinary relation', async () => {
    const read = query(knex, Album.schema)
        .withRowSchema()
        .include(
            r => r.assets,
            assets => assets.forVariant('photo', q => q.include(r => r.labels))
        );
    const rows = await read;
    const asset = rows[0].assets[0];
    if (asset.kind === 'photo')
        expectTypeOf(asset.labels[0].label).toEqualTypeOf<string>();
    else expectTypeOf(asset.body).toEqualTypeOf<string>();
});
