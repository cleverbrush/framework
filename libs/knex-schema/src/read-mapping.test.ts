import { mapper } from '@cleverbrush/mapper';
import Knex from 'knex';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineEntity } from './entity.js';
import { array, date, number, object, string } from './extension.js';
import { query } from './SchemaQueryBuilder.js';

describe('query schemas as reusable mapping sources', () => {
    it('maps projected nested rows without duplicate schemas or promises', async () => {
        const Note = object({
            id: number(),
            taskId: number(),
            body: string()
        }).hasTableName('notes');
        const Task = defineEntity(
            object({
                id: number().primaryKey(),
                amount: number().decimal(24, 6).optional(),
                done: date().optional(),
                notes: array(Note).optional()
            }).hasTableName('tasks')
        ).hasMany(
            t => t.notes,
            t => t.id,
            n => n.taskId
        );
        const read = query(Knex({ client: 'pg' }), Task.schema)

            .select(t => ({ id: t.id, amount: t.amount, done: t.done }))
            .include(
                r => r.notes,
                q => q.select(n => ({ body: n.body }))
            );
        const Source = read.rowSchema;
        const NoteSource =
            Source.introspect().properties.notes.introspect().elementSchema!;
        const PublicNote = object({ text: string() });
        const Target = object({
            id: number(),
            amount: string().optional(),
            done: date().optional(),
            notes: array(PublicNote)
        });
        const registry = mapper()
            .configure(NoteSource, PublicNote, m =>
                m.for(t => t.text).from(s => s.body)
            )
            .configure(Source, Target, m =>
                m
                    .for(t => t.amount)
                    .compute(s => s.amount ?? undefined)
                    .for(t => t.done)
                    .compute(s => s.done ?? undefined)
            );
        const toPublic = registry.getSyncMapper(Source, Target);
        const row = Source.parse({
            id: 1,
            amount: '9007199254740993.000001',
            done: null,
            notes: [{ body: 'hello' }]
        });
        const result = toPublic(row);
        expectTypeOf(result.notes[0].text).toEqualTypeOf<string>();
        expectTypeOf(result.done).toEqualTypeOf<Date | undefined>();
        // @ts-expect-error the selected projection has no unselected entity field
        row.secret;
        expect(result).toEqual({
            id: 1,
            amount: '9007199254740993.000001',
            done: undefined,
            notes: [{ text: 'hello' }]
        });
        expect(result).toEqual(await registry.getMapper(Source, Target)(row));
        expect(read.where(t => t.id, 1).rowSchema).toBe(Source);
    });
});
