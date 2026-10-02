import { randomUUID } from 'node:crypto';
import { mapper } from '@cleverbrush/mapper';
import {
    createDb,
    defineEntity,
    generateCreateTable,
    jsonObject,
    jsonValue,
    number,
    object,
    query,
    string
} from '@cleverbrush/orm';
import Knex from 'knex';
import { afterAll, beforeAll, expect, it } from 'vitest';

const connection = process.env.QUERY_TEST_DATABASE_URL;
if (!connection) throw new Error('QUERY_TEST_DATABASE_URL is required');
const knex = Knex({ client: 'pg', connection });
const table = `json_documents_${randomUUID().replaceAll('-', '')}`;
const open = object({
    type: string(),
    nested: object({ label: string().optional() }).acceptUnknownProps()
})
    .acceptUnknownProps()
    .jsonb();
const Document = object({
    id: number().primaryKey(),
    document: jsonObject().jsonb().hasColumnName('document_data'),
    value: jsonValue().jsonb(),
    open,
    strict: object({ name: string() }).jsonb(),
    optional: jsonObject().jsonb().optional(),
    nullable: jsonObject().jsonb().nullable()
}).hasTableName(table);
const entity = defineEntity(Document);
const data = () => ({
    document: {
        scenes: [
            {
                objects: [{ kind: 'path', points: [1, 2.5, null] }],
                extension: { a: true }
            }
        ],
        metadata: { tags: [] }
    },
    value: ['array', { x: true }, null],
    open: {
        type: 'drawing',
        nested: { extra: { enabled: true } },
        extension: [1, { a: null }]
    },
    nullable: null,
    strict: { name: 'known', ignored: true }
});

beforeAll(async () => {
    await generateCreateTable(Document)(knex);
});
afterAll(async () => {
    await knex.schema.dropTableIfExists(table);
    await knex.destroy();
});

it('preserves complete documents on insert, select, update and returning', async () => {
    const input = { id: 1, ...data() };
    const inserted = await query(knex, Document).insert(input);
    expect(inserted).toEqual({
        ...input,
        strict: { name: 'known' },
        optional: null
    });
    expect(
        await query(knex, Document)
            .where(t => t.id, 1)
            .first()
    ).toEqual(inserted);
    const next = { nodes: [{ custom: { a: [null, false, 'ok'] } }] };
    const updated = await query(knex, Document)
        .where(t => t.id, 1)
        .update({ document: next, value: 'root string' });
    expect(updated[0].document).toEqual(next);
    expect(updated[0].value).toBe('root string');
    const selected = await query(knex, Document)
        .where(t => t.id, 1)
        .select(t => ({
            payload: t.document,
            value: t.value,
            permissive: t.open
        }))
        .first();
    expect(selected).toEqual({
        payload: next,
        value: 'root string',
        permissive: input.open
    });
});

it('binds root strings, arrays, numbers, booleans and JSON null as JSON', async () => {
    const values = ['a string', [1, { x: [] }], 12.75, false, null];
    for (const [i, value] of values.entries()) {
        const row = await query(knex, Document).insert({
            id: 10 + i,
            ...data(),
            value
        });
        expect(row.value).toEqual(value);
        const stored = await knex(table)
            .where('id', 10 + i)
            .select(knex.raw('jsonb_typeof(value) as kind'))
            .first();
        expect(stored.kind).toBe(
            ['string', 'array', 'number', 'boolean', 'null'][i]
        );
    }
});

it('preserves documents on insertMany, bulk inserts, bulk updates and upserts', async () => {
    await query(knex, Document).insertMany([
        { id: 20, ...data() },
        { id: 21, ...data() }
    ]);
    await query(knex, Document).bulkInsert([{ id: 22, ...data() }]);
    const result = await query(knex, Document).upsert(
        { id: 20, ...data(), value: { extra: [true] } },
        { conflictColumns: [t => t.id] }
    );
    expect(result.value).toEqual({ extra: [true] });
    await query(knex, Document).bulkUpdate([
        { where: { id: 21 }, set: { value: ['updated'] } }
    ]);
    expect(
        (
            await query(knex, Document)
                .where(t => t.id, 21)
                .first()
        )?.value
    ).toEqual(['updated']);
});

it('keeps mapping and derived row validation lossless', async () => {
    const read = query(knex, Document)
        .where(t => t.id, 20)
        .select(t => ({ document: t.document }));
    const target = object({ document: jsonObject() });
    const convert = mapper()
        .configure(read.rowSchema, target, m => m)
        .getSyncMapper(read.rowSchema, target);
    const row = (await read.first())!;
    expect(read.rowSchema.validate(row).valid).toBe(true);
    expect(convert(row)).toEqual(row);
});

it('tracks nested changes, structural equality, reset and repeated saves independently', async () => {
    await query(knex, Document).insert({ id: 30, ...data() });
    const db = createDb(knex, { documents: entity }, { tracking: true });
    const row = await db.documents.findOrFail(30);
    const original = structuredClone(row.document);
    (row.document.metadata as any).tags.push('edited');
    expect(db.entry(row).isModified('document')).toBe(true);
    expect((await db.saveChanges()).updated).toBe(1);
    expect(
        (
            await query(knex, Document)
                .where(t => t.id, 30)
                .first()
        )?.document
    ).toEqual(row.document);
    expect((await db.saveChanges()).updated).toBe(0);
    row.document = Object.fromEntries(Object.entries(row.document).reverse());
    expect(db.entry(row).isModified()).toBe(false);
    (row.document.metadata as any).tags.push('discard');
    db.entry(row).reset();
    expect((row.document.metadata as any).tags).toEqual(['edited']);
    (row.document.metadata as any).tags.push('another');
    db.discardChanges();
    expect((row.document.metadata as any).tags).toEqual(['edited']);
    expect(original).not.toEqual(row.document);
    row.value = [null, { replaced: true }];
    await db.saveChanges();
    expect(
        (
            await query(knex, Document)
                .where(t => t.id, 30)
                .first()
        )?.value
    ).toEqual(row.value);
});

it('supports ORM save and rejects non-JSON document writes before issuing SQL', async () => {
    const db = createDb(knex, { documents: entity });
    const saved = await db.documents.save({ id: 40, ...data() });
    expect(saved.document).toEqual(data().document);
    const cycle: any = {};
    cycle.self = cycle;
    for (const value of [
        { bad: undefined },
        { bad: () => 1 },
        { bad: Infinity },
        cycle
    ]) {
        const sql: unknown[] = [];
        const listener = (statement: unknown) => sql.push(statement);
        knex.on('query', listener);
        try {
            await expect(
                query(knex, Document).insert({
                    id: 90,
                    ...data(),
                    document: value
                })
            ).rejects.toThrow();
            await expect(
                query(knex, Document)
                    .where(t => t.id, 40)
                    .update({ document: value })
            ).rejects.toThrow();
            expect(sql).toHaveLength(0);
        } finally {
            knex.off('query', listener);
        }
    }
    await expect(
        query(knex, Document)
            .where(t => t.id, 40)
            .update({
                open: { type: 'drawing', nested: {}, bad: new Date() }
            } as any)
    ).rejects.toThrow(/JSON/);
});
