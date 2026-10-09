import Knex from 'knex';
import { afterAll, describe, expect, it } from 'vitest';
import { AliasedQuerySource, alias, and, eq, or } from './aliased-query.js';
import { aggregate } from './expressions.js';
import { number, object, string } from './extension.js';

const Schema = object({
    id: number().primaryKey(),
    name: string().hasColumnName('display_name')
}).hasTableName('items');
const knex = Knex({ client: 'pg' });
afterAll(() => knex.destroy());
const source = () => new AliasedQuerySource<any>(knex, alias(Schema, 'a'));
describe('flat join SQL planner', () => {
    it('compiles nested join predicates, mapped filtering, grouping, ordering and aggregate selection', () => {
        const q = source()
            .join(alias(Schema, 'b'), t =>
                and(
                    eq(t.a.id, t.b.id),
                    or(eq(t.a.name, t.b.name), eq(t.a.id, t.b.id))
                )
            )
            .leftJoin(alias(Schema, 'c'), t => eq(t.a.id, t.c.id))
            .where(t => t.a.name, 'like', '%a%')
            .whereIn(t => t.a.id, [1, 2])
            .whereNull(t => t.c.name)
            .whereNotNull(t => t.a.name)
            .groupBy(t => t.a.name)
            .having(t => t.a.id, '>', 0)
            .select(t => ({ name: t.a.name, count: aggregate.count(t.a.id) }))
            .orderBy(t => t.a.name, 'desc')
            .orderByRaw('?? asc', ['a.id'])
            .limit(2)
            .offset(1);
        expect(q.toQuery()).toContain('left join');
        expect(q.toQuery()).toContain('having');
        expect(q.toQuery()).toContain('count(');
        expect(q.toQuery()).toContain('"a"."display_name"');
        expect(q.cloneReadSource().toQuery()).toBe(q.toQuery());
    });
    it('rejects empty/foreign predicates, duplicate aliases and unsupported operators', () => {
        expect(() => and()).toThrow('at least one');
        expect(() => or()).toThrow('at least one');
        expect(() =>
            source().join(alias(Schema, 'a'), t => eq(t.a.id, t.a.id))
        ).toThrow();
        expect(() =>
            source().join(alias(Schema, 'b'), () => ({}) as any)
        ).toThrow();
        expect(() => source().where(() => ({}) as any, 1)).toThrow('column');
        expect(() => source().where(t => t.a.id, 'unsafe', 1)).toThrow();
        expect(() => source().having(t => t.a.id, 'unsafe', 1)).toThrow();
        expect(
            source()
                .orderBy(t => t.a.id, 'unsafe' as any)
                .select(t => ({ id: t.a.id }))
                .toQuery()
        ).toContain('asc');
        expect(() => source().select(() => ({ nope: 1 }) as any)).toThrow();
        const plain = source()
            .where(t => t.a.id, 1)
            .select(t => ({ id: t.a.id }));
        expect(plain.toQuery()).toContain('= 1');
        expect(
            plain
                .apply(q => {
                    q.whereRaw('true');
                })
                .toQuery()
        ).toContain('true');
    });
});
