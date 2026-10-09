import Knex from 'knex';
import { describe, expect, it } from 'vitest';
import { alias, eq } from './aliased-query.js';
import { aggregate } from './expressions.js';
import { date, number, object, string } from './extension.js';
import { compileReadSchema } from './read-schema.js';
import { query } from './SchemaQueryBuilder.js';

const Task = object({
    id: number().primaryKey(),
    title: string(),
    amount: number().decimal(24, 6).optional(),
    completedAt: date().optional().hasColumnName('completed_at')
}).hasTableName('tasks');
const knex = Knex({ client: 'pg' });

describe('schema-aware read metadata', () => {
    it('describes only projected fields, SQL nulls and exact storage', () => {
        const read = query(knex, Task).select(t => ({
            title: t.title,
            amount: t.amount,
            done: t.completedAt
        }));
        const properties = read.rowSchema.introspect().properties;
        expect(Object.keys(properties)).toEqual(['title', 'amount', 'done']);
        expect(
            read.rowSchema.validate({
                title: 'task',
                amount: '9007199254740993.000001',
                done: null
            }).valid
        ).toBe(true);
        expect(
            // @ts-expect-error Intentionally validate an invalid wire value.
            read.rowSchema.validate({ title: 'task', amount: 1, done: null })
                .valid
        ).toBe(false);
        expect(read.toQuery()).toContain('cast(');
        expect(read.toQuery()).not.toContain('"id" as');
    });
    it('preserves schema identity across immutable filters and transactions', () => {
        const read = query(knex, Task);
        const one = read.where(t => t.id, 1).limit(1);
        const two = read.where(t => t.id, 2).offset(1);
        expect(one.rowSchema).toBe(read.rowSchema);
        expect(two.rowSchema).toBe(read.rowSchema);
        expect(one.toQuery()).toContain('= 1');
        expect(two.toQuery()).toContain('= 2');
        expect(read.toQuery()).not.toContain('where');
    });
    it('does not apply entity input defaults or preprocessing during reads', () => {
        const schema = string().default('input default');
        const node = compileReadSchema(schema);
        expect(() => node.decode(undefined, 'value')).toThrow();
        expect(node.decode('stored', 'value')).toBe('stored');
        expect(() =>
            compileReadSchema(string().optional().default('input'))
        ).toThrow(/ambiguous read nullability/);
        expect(() =>
            compileReadSchema(
                object({ value: string().optional().default('input') })
            )
        ).toThrow(/ambiguous read nullability/);
    });
    it('decodes dates in nested JSON and rejects invalid values', () => {
        const node = compileReadSchema(
            object({ seen: date(), optional: date().optional() })
        );
        expect(node.decode({ seen: '2026-01-01T00:00:00Z' }, 'row')).toEqual({
            seen: new Date('2026-01-01T00:00:00Z')
        });
        expect(() => node.decode({ seen: 'not a date' }, 'row')).toThrow(
            /row.seen/
        );
    });
    it('interprets timezone-less dates consistently as UTC', () => {
        const node = compileReadSchema(date());
        expect(node.decode('2026-01-02', 'date').toISOString()).toBe(
            '2026-01-02T00:00:00.000Z'
        );
        expect(
            node.decode('2026-01-02 03:04:05.123456', 'date').toISOString()
        ).toBe('2026-01-02T03:04:05.123Z');
        expect(
            node.decode('2026-01-02T03:04:05+02:00', 'date').toISOString()
        ).toBe('2026-01-02T01:04:05.000Z');
    });
    it('retains aggregate output schemas and rejects opaque parsers', () => {
        const read = query(knex, Task).select(t => ({
            count: aggregate.count(),
            total: aggregate.sum(t.amount)
        }));
        expect(read.rowSchema.validate({ count: 3, total: null }).valid).toBe(
            true
        );
        expect(() =>
            query(knex, Task).select(() => ({
                count: aggregate.count(undefined, {
                    output: { parse: () => 1 }
                })
            }))
        ).toThrow(/introspectable/);
    });
    it('exposes metadata automatically and requires schemas for opaque SQL', () => {
        expect(
            query(knex, Task)
                .orderBy(t => t.id)
                .limit(1).rowSchema
        ).toBeDefined();
        expect(
            Object.keys(
                query(knex, Task)
                    .select(t => ({ id: t.id }))
                    .rowSchema.introspect().properties
            )
        ).toEqual(['id']);
        expect(() =>
            (query(knex, Task) as any).selectRaw('1 as other', [])
        ).toThrow(/output/);
        expect(() =>
            (query(knex, Task) as any).apply((q: any) => q.whereRaw('true'))
        ).toThrow(/output/);
        expect(() =>
            (query(knex, alias(Task, 'task')) as any).apply((q: any) =>
                q.select('id')
            )
        ).toThrow(/output/);
    });
    it('describes immutable flat left joins with SQL nulls', () => {
        const base = query(knex, alias(Task, 'task'));
        expect(() => base.rowSchema).toThrow(/explicit select/);
        const joined = base
            .leftJoin(alias(Task, 'other'), t => eq(t.task.id, t.other.id))
            .select(t => ({
                id: t.task.id,
                amount: t.other.amount,
                otherId: t.other.id
            }));
        expect(
            joined.rowSchema.validate({ id: 1, amount: null, otherId: null })
                .valid
        ).toBe(true);
        expect(joined.where(t => t.task.id, 1).rowSchema).toBe(
            joined.rowSchema
        );
        expect(joined.toQuery()).toContain('left join');
        expect(base.select(t => ({ id: t.task.id })).toQuery()).not.toContain(
            'join'
        );
    });
});
