import Knex from 'knex';
import { afterAll, describe, expect, it } from 'vitest';
import { compileAggregate } from './expressions.js';
import {
    aggregate,
    alias,
    and,
    date,
    eq,
    number,
    object,
    or,
    query,
    string
} from './index.js';

const db = Knex({ client: 'pg' });
afterAll(() => db.destroy());
const User = object({
    id: number().primaryKey(),
    name: string().hasColumnName('display_name')
}).hasTableName('users');
const Task = object({
    id: number().primaryKey(),
    ownerId: number().hasColumnName('owner_id'),
    amount: number().decimal(20, 4),
    createdAt: date().hasColumnName('created_at')
}).hasTableName('tasks');

describe('typed aliases and aggregate SQL', () => {
    it('quotes columns and binds values without modifying schema metadata', () => {
        const before = Task.introspect();
        const compiled = query(db, alias(Task, 'task'))
            .join(alias(User, 'owner'), t =>
                and(
                    eq(t.task.ownerId, t.owner.id),
                    or(eq(t.task.ownerId, t.owner.id))
                )
            )
            .where(t => t.owner.name, "O'Reilly")
            .orderBy(t => t.task.id, 'desc')
            .select(t => ({ id: t.task.id, name: t.owner.name }))
            .toKnexQuery()
            .toSQL();
        expect(compiled.sql).toContain('"owner"."display_name" as "name"');
        expect(compiled.sql).toContain('"task"."owner_id" = "owner"."id"');
        expect(compiled.bindings).toEqual(["O'Reilly"]);
        expect(Task.introspect()).toEqual(before);
    });

    it('supports two aliases of one schema and rejects duplicate aliases', () => {
        const users = query(db, alias(User, 'first'));
        const result = users.leftJoin(alias(User, 'second'), t =>
            eq(t.first.id, t.second.id)
        );
        expect(
            result
                .select(t => ({ a: t.first.name, b: t.second.name }))
                .toQuery()
        ).toContain('left join');
        expect(() =>
            (users as any).join(alias(User, 'first'), () => null)
        ).toThrow('Duplicate');
        expect(() => query(db, alias(User, 'u')).toKnexQuery()).toThrow(
            'explicit select'
        );
    });

    it('supports grouped aggregate aliases and SQL-native HAVING comparisons', () => {
        const compiled = query(db, alias(Task, 'task'))
            .groupBy(t => t.task.ownerId)
            .having(t => aggregate.sum(t.task.amount), '>', 10)
            .select(t => ({
                owner: t.task.ownerId,
                total: aggregate.sum(t.task.amount),
                count: aggregate.count()
            }))
            .toKnexQuery()
            .toSQL();
        expect(compiled.sql).toContain(
            'cast(sum("task"."amount") as text) as "total"'
        );
        expect(compiled.sql).toContain('having sum("task"."amount") > ?');
        expect(compiled.bindings).toEqual([10]);
    });

    it('adds aggregate expressions to existing object selectors', () => {
        const sql = query(db, Task)
            .groupBy(t => t.ownerId)
            .select(t => ({
                owner: t.ownerId,
                total: aggregate.sum(t.amount),
                count: aggregate.countDistinct(t.id)
            }))
            .toQuery();
        expect(sql).toContain('count(distinct "id")');
        expect(sql).toContain('group by "owner_id"');
    });
});

describe('aggregate decoders', () => {
    const count = compileAggregate(db, aggregate.count(), () => '').decode;
    it.each([
        '0',
        '3',
        5,
        12n,
        String(Number.MAX_SAFE_INTEGER)
    ])('decodes safe count %s', value => {
        expect(count(value)).toBe(Number(value));
    });
    it.each([
        '9007199254740993',
        -1,
        '1.5',
        '',
        null,
        NaN,
        {},
        Infinity
    ])('rejects unsafe/malformed count %s', value => {
        expect(() => count(value)).toThrow();
    });
    it('lets output schemas replace default decoding, including overflow policy', () => {
        const compiled = compileAggregate(
            db,
            aggregate.count(undefined, { output: string() }),
            () => ''
        );
        expect(compiled.decode('9007199254740993')).toBe('9007199254740993');
        expect(() => compiled.decode(null)).toThrow();
    });
});

describe('composite cursor guards', () => {
    it('rejects non-unique, nullable, grouped and malformed requests before querying', async () => {
        const Nullable = object({
            id: number().primaryKey().nullable()
        }).hasTableName('nullable_keys');
        await expect(
            query(db, Nullable).paginateAfter({
                limit: 2,
                orderBy: [{ column: t => t.id, direction: 'asc' }]
            })
        ).rejects.toThrow('non-null');
        await expect(
            query(db, Task).paginateAfter({
                limit: 2,
                orderBy: [{ column: t => t.createdAt, direction: 'asc' }]
            })
        ).rejects.toThrow('unique key');
        await expect(
            query(db, Task).paginateAfter({
                limit: 0,
                orderBy: [{ column: t => t.id, direction: 'asc' }]
            })
        ).rejects.toThrow('limit');
        await expect(
            query(db, Task)
                .offset(2)
                .paginateAfter({
                    limit: 2,
                    orderBy: [{ column: t => t.id, direction: 'asc' }]
                })
        ).rejects.toThrow('offsets');
        await expect(
            query(db, Task)
                .groupBy(t => t.id)
                .paginateAfter({
                    limit: 2,
                    orderBy: [{ column: t => t.id, direction: 'asc' }]
                })
        ).rejects.toThrow('grouped');
        await expect(
            query(db, Task).paginateAfter({
                cursor: 'not-a-cursor',
                limit: 2,
                orderBy: [{ column: t => t.id, direction: 'asc' }]
            })
        ).rejects.toThrow('Invalid cursor');
    });
});
