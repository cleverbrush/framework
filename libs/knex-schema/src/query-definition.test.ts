import Knex from 'knex';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    aggregate,
    alias,
    date,
    defineEntity,
    eq,
    number,
    object,
    parameter,
    query,
    string
} from './index.js';

const User = object({
    id: number().primaryKey(),
    name: string().hasColumnName('display_name'),
    age: number(),
    birthday: date().optional(),
    profile: object({ score: number(), label: string() }).optional()
}).hasTableName('users');
const Task = defineEntity(
    object({
        id: number().primaryKey(),
        ownerId: number(),
        owner: User.optional()
    }).hasTableName('tasks')
).belongsTo(
    t => t.owner,
    t => t.ownerId,
    t => t.id
);
const knex = Knex({ client: 'pg' });
afterEach(() => vi.restoreAllMocks());

describe('connection-independent query definitions', () => {
    it('exposes stable schemas and is non-thenable without creating a native builder', async () => {
        const builder = vi.spyOn(knex.client, 'queryBuilder');
        const compiler = vi.spyOn(knex.client, 'queryCompiler');
        const root = query(User);
        expect(typeof root).toBe('function');
        expect((root as any).then).toBeUndefined();
        const definition = query(User)
            .select(t => ({ name: t.name }))
            .limit(2);
        expect(typeof definition).toBe('function');
        expect((definition as any).then).toBeUndefined();
        expect(await definition).toBe(definition);
        expect(definition.rowSchema.parse({ name: 'Jane' })).toEqual({
            name: 'Jane'
        });
        expect(builder).not.toHaveBeenCalled();
        expect(compiler).not.toHaveBeenCalled();
        expect(definition.toSQL(knex).sql).toContain('"display_name"');
        expect(definition.query(knex).rowSchema).toBe(definition.rowSchema);
    });

    it('binds independent readers and compiles once per definition and client', () => {
        const selector = vi.fn((t: any) => t.id);
        const group = vi.fn((p: any) => p.where(selector, parameter('id')));
        const definition = query(User).where(group).select('id');
        const compiler = vi.spyOn(knex.client, 'queryCompiler');
        expect((definition as any).toSQL(knex, 10).bindings).toEqual([10]);
        const count = compiler.mock.calls.length;
        expect(count).toBeGreaterThan(0);
        expect((definition as any).toSQL(knex, 20).bindings).toEqual([20]);
        expect(compiler).toHaveBeenCalledTimes(count);
        const bound = (definition as any).query(knex, 30);
        expect(bound.toQuery()).toContain('30');
        expect(bound.where('age', 21).toQuery()).toContain('21');
        expect(bound.toQuery()).not.toContain('21');
        expect(group).toHaveBeenCalledTimes(1);
        expect(selector).toHaveBeenCalledTimes(1);
        const other = Knex({
            client: 'pg',
            wrapIdentifier: (value, original) => original(`different_${value}`)
        });
        expect((definition as any).toSQL(other, 40).sql).toContain(
            'different_users'
        );
        expect((definition as any).toSQL(knex, 50).sql).not.toContain(
            'different_'
        );
        expect(group).toHaveBeenCalledTimes(1);
    });

    it('captures scopes and raw values once, including default ordering and pagination', () => {
        const bindings = ['Jane'];
        const defaults = vi.fn((q: any) =>
            q.where('age', '>=', 18).orderBy('name').limit(9)
        );
        const named = vi.fn((q: any) =>
            q.whereRaw('display_name = ?', bindings)
        );
        const definition = query(
            User.defaultScope(defaults).scope('named', named)
        )
            .scoped('named')
            .limit(2);
        bindings[0] = 'changed';
        const sql = definition.toSQL(knex);
        expect(sql.bindings).toEqual([18, 'Jane', 2]);
        expect(sql.sql).toContain('order by');
        expect(definition.unscoped().toSQL(knex).bindings).toEqual(['Jane', 2]);
        expect(definition.query(knex).toQuery()).toContain('Jane');
        expect(defaults).toHaveBeenCalledTimes(1);
        expect(named).toHaveBeenCalledTimes(1);
    });

    it('captures JSON paths, aggregates, aliases and joins with connection-specific identifiers', () => {
        const nested = query(User)
            .where(t => t.profile.score, '>', parameter('score'))
            .select(t => ({ label: t.profile.label }));
        expect(nested.toSQL(knex, 2).sql).toContain('#>>');
        expect(nested.toSQL(knex, 2).bindings).toContain(2);
        const join = vi.fn((t: any) => eq(t.u.id, t.task.ownerId));
        const projection = vi.fn((t: any) => ({
            name: t.u.name,
            count: aggregate.count(t.task.id)
        }));
        const joined = query(alias(User, 'u'))
            .leftJoin(alias(Task.schema, 'task'), join)
            .groupBy(t => t.u.name)
            .select(projection)
            .orderByRaw('?? desc', ['u.display_name']);
        expect(joined.toSQL(knex).sql).toContain('left join');
        expect(joined.query(knex).toQuery()).toContain('count(');
        expect(join).toHaveBeenCalledTimes(1);
        expect(projection).toHaveBeenCalledTimes(1);
    });

    it('retains relation and polymorphic metadata without replaying customizers', () => {
        const customize = vi.fn((q: any) =>
            q.where('name', parameter('name')).select('name')
        );
        const definition = query(Task.schema)
            .include('owner', customize)
            .where(t => t.id, parameter('id'));
        expect((definition as any).toSQL(knex, 'Jane', 1).bindings).toEqual(
            query(knex, Task.schema)
                .include('owner', q =>
                    q.where('name', parameter('name')).select('name')
                )
                .where(t => t.id, parameter('id'))
                .toSQL('Jane', 1).bindings
        );
        expect((definition as any).query(knex, 'John', 2).toQuery()).toContain(
            'John'
        );
        expect(customize).toHaveBeenCalledTimes(1);
        const Asset = defineEntity(
            object({ id: number().primaryKey(), kind: string() }).hasTableName(
                'assets'
            )
        )
            .discriminator('kind')
            .stiVariant('note', object({ text: string() }))
            .stiVariant('task', Task);
        const variant = vi.fn((q: any) => q.where('text', parameter('text')));
        const polymorphic = query(Asset.schema)
            .forVariant('note', variant)
            .where(t => t.id, parameter('id'));
        const rowSchema = polymorphic.rowSchema;
        expect((polymorphic as any).toSQL(knex, 'hello', 1).bindings).toContain(
            'hello'
        );
        expect((polymorphic as any).query(knex, 'world', 2).rowSchema).toBe(
            rowSchema
        );
        expect(
            (polymorphic.selectVariants(['task']) as any).toSQL(knex, 3)
                .bindings
        ).toContain(3);
        expect(variant).toHaveBeenCalledTimes(1);
    });

    it('rejects missing connections, bad arguments and connection-dependent escapes', () => {
        const definition = query(User).where(t => t.id, parameter('id'));
        expect(() => (definition as any).toSQL(1)).toThrow(/Knex connection/);
        expect(() => (definition as any).toSQL(knex, 'wrong')).toThrow();
        expect(() => (definition as any).toSQL(knex)).toThrow(/Expected 1/);
        for (const method of [
            'ref',
            'apply',
            'selectRaw',
            'first',
            'update',
            'transacting'
        ])
            expect(() => (definition as any)[method]()).toThrow(/Bind query/);
        expect(() => query(User).whereRaw('?', [knex.raw('1')])).toThrow(
            /Bind a connection/
        );
        expect(() =>
            query(User).whereIn('id', knex('users').select('id'))
        ).toThrow(/Bind a connection/);
        expect(() => query(User).where('id', knex.raw('1'))).toThrow(
            /Bind a connection/
        );
        const json = query(User).whereJsonPath('profile', '$.score', '=', 3);
        expect(() =>
            json
                .query(Knex({ client: 'sqlite3', useNullAsDefault: true }))
                .toQuery()
        ).toThrow(/only supported on PostgreSQL/);
    });

    it('snapshots definition values and inspected bindings independently', () => {
        const birthday = new Date('2026-01-01T00:00:00Z');
        const profile = { score: 3, label: 'captured' };
        const definition = query(User)
            .where('birthday', birthday)
            .where('profile', profile)
            .whereRaw('display_name = ?', ['Jane']);
        birthday.setUTCFullYear(2040);
        profile.label = 'changed';
        const first = definition.toSQL(knex);
        expect(first.bindings).toContainEqual(new Date('2026-01-01T00:00:00Z'));
        expect(first.bindings).toContainEqual({ score: 3, label: 'captured' });
        (
            first.bindings.find(value => value instanceof Date) as Date
        ).setUTCFullYear(2050);
        expect(definition.toSQL(knex).bindings).toContainEqual(
            new Date('2026-01-01T00:00:00Z')
        );
    });

    it('hands native Knex snapshots to escape hatches without changing event listeners', () => {
        const bound = query(User).query(knex);
        const rowSchema = bound.rowSchema;
        const raw = bound.toKnexQuery();
        const listener = vi.fn();
        raw.on('query', listener);
        expect(raw.listeners('query')).toContain(listener);
        raw.removeListener('query', listener);
        expect(raw.listeners('query')).not.toContain(listener);
        const opaque = bound.apply(
            sql => {
                sql.on('query', listener);
                expect(sql.listeners('query')).toContain(listener);
                sql.removeListener('query', listener);
                return sql.clearSelect().select({ id: 'id' });
            },
            { output: object({ id: number() }) }
        );
        const opaqueSql = opaque.toKnexQuery();
        opaqueSql.on('query', listener);
        expect(opaqueSql.listeners('query')).toContain(listener);
        opaqueSql.removeListener('query', listener);
        expect(opaqueSql.listeners('query')).not.toContain(listener);
        expect(bound.rowSchema).toBe(rowSchema);
    });
});
