import Knex from 'knex';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    alias,
    date,
    defineEntity,
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
    balance: number().decimal(24, 6)
}).hasTableName('users');
const knex = Knex({ client: 'pg' });
afterEach(() => vi.restoreAllMocks());

describe('compiled parameterized SELECTs', () => {
    it('compiles lazily once, reuses named bindings and keeps values out of SQL', () => {
        const compiler = vi.spyOn(knex.client, 'queryCompiler');
        const read = query(knex, User)
            .where(t => t.name, parameter('name'))
            .orWhere(t => t.name, parameter('name'))
            .where(t => t.age, '>=', parameter('age'));
        expect(compiler).not.toHaveBeenCalled();
        const one = read.toSQL("' OR 1=1 --", 18);
        const calls = compiler.mock.calls.length;
        expect(calls).toBeGreaterThan(0);
        const two = read.toSQL('Jane', 21);
        expect(compiler).toHaveBeenCalledTimes(calls);
        expect(two.sql).toBe(one.sql);
        expect(one.sql).not.toContain('OR 1=1');
        expect(one.bindings).toEqual(["' OR 1=1 --", "' OR 1=1 --", 18]);
        expect(two.bindings).toEqual(['Jane', 'Jane', 21]);
        expect(one.sql).toContain('"display_name"');
    });

    it('materializes independent composable readers without replaying callbacks', () => {
        const selector = vi.fn((t: any) => t.id);
        const group = vi.fn((p: any) => p.where(selector, parameter('id')));
        const read = query(knex, User).where(group);
        const one = (read as any).query(10).where('age', 18);
        const two = (read as any).query(20);
        expect(one.toQuery()).toContain('= 10');
        expect(two.toQuery()).toContain('= 20');
        expect(two.toQuery()).not.toContain('= 18');
        expect(group).toHaveBeenCalledTimes(1);
        expect(selector).toHaveBeenCalledTimes(1);
        expect((read as any).toSQL(30).bindings).toEqual([30]);
        const rebound = two.where('age', parameter('id'));
        expect(rebound.toSQL(40).bindings).toEqual([20, 40]);
    });

    it('preserves SQL null comparison behavior with a fixed statement', () => {
        {
            const read = query(knex, User).where(
                t => t.birthday,
                parameter('date')
            );
            const empty = read.toSQL(null);
            const date = new Date('2026-01-01T00:00:00Z');
            const present = read.toSQL(date);
            expect(empty.sql).toBe(present.sql);
            expect(empty.sql).toContain('case when ? then');
            expect(empty.bindings).toEqual([true, null]);
            expect(present.bindings).toEqual([false, date]);
        }
    });

    it('validates arity and storage types before compiling', () => {
        const read = query(knex, User).where(
            t => t.balance,
            parameter('amount')
        );
        const compiler = vi.spyOn(knex.client, 'queryCompiler');
        for (const args of [[], [1], [undefined], [null], ['1.00', 2]]) {
            expect(() => (read.toSQL as any)(...args)).toThrow();
        }
        expect(compiler).not.toHaveBeenCalled();
        expect(read.toSQL('1.00').bindings).toEqual(['1.00']);
        expect(() => (read as any).where('age', parameter('amount'))).toThrow(
            /incompatible/
        );
    });

    it('captures scopes once, preserves their filters and rejects scope parameters', () => {
        const defaults = vi.fn((q: any) => q.where('age', '>=', 18));
        const named = vi.fn((q: any) => q.where('name', 'John'));
        const schema = User.defaultScope(defaults).scope('john', named);
        const read = query(knex, schema)
            .where(t => t.id, parameter('id'))
            .scoped('john');
        expect(read.toSQL(1).bindings).toEqual([18, 1, 'John']);
        expect(read.toSQL(2).bindings).toEqual([18, 2, 'John']);
        expect(read.query(3).toQuery()).toContain('= 3');
        expect(defaults).toHaveBeenCalledTimes(1);
        expect(named).toHaveBeenCalledTimes(1);
        expect(read.unscoped().toSQL(4).bindings).toEqual([4, 'John']);
        const invalid = User.defaultScope(q =>
            q.where(t => t.id, parameter('id'))
        );
        expect(() => query(knex, invalid)).toThrow(/scopes cannot introduce/);
    });

    it('captures fixed membership slots and independently snapshots mutable values', () => {
        const read = query(knex, User)
            .whereIn(
                t => t.id,
                [parameter('a'), 2, parameter('b'), parameter('a')]
            )
            .whereBetween(
                t => t.birthday,
                [parameter('start'), parameter('end')]
            );
        const start = new Date('2026-01-01');
        const end = new Date('2026-02-01');
        const bound = read.query(1, 3, start, end);
        const before = bound.toQuery();
        const sql = read.toSQL(1, 3, start, end);
        start.setFullYear(2030);
        expect(bound.toQuery()).toBe(before);
        expect((sql.bindings[4] as Date).getFullYear()).toBe(2026);
        expect(sql.bindings.slice(0, 4)).toEqual([1, 2, 3, 1]);
    });

    it('creates a fresh plan for shape changes and preserves the source', () => {
        const read = query(knex, User).where(t => t.id, parameter('id'));
        const before = read.toSQL(1);
        const changed = read
            .orderBy(t => t.age)
            .limit(3)
            .select(t => ({ name: t.name }));
        expect(changed.toSQL(2).sql).toContain('limit ?');
        expect(read.toSQL(3).sql).toBe(before.sql);
        expect(changed.toSQL(2).sql).not.toBe(before.sql);
    });

    it('supports alias readers without rebuilding the planner on warmed calls', () => {
        const read = query(knex, alias(User, 'u'))
            .where(t => t.u.id, parameter('id'))
            .select(t => ({ name: t.u.name }));
        const first = read.toSQL(1);
        const clone = vi.spyOn(
            knex.queryBuilder().constructor.prototype,
            'clone'
        );
        const compiler = vi.spyOn(knex.client, 'queryCompiler');
        expect(read.toSQL(2).sql).toBe(first.sql);
        expect(compiler).not.toHaveBeenCalled();
        expect(clone).not.toHaveBeenCalled();
        expect(read.query(3).toQuery()).toContain('= 3');
    });

    it('captures relation and variant customizers once and removes inactive arguments', () => {
        const Task = object({
            id: number().primaryKey(),
            ownerId: number(),
            owner: User.optional()
        }).hasTableName('tasks');
        const entity = defineEntity(Task).belongsTo(
            t => t.owner,
            t => t.ownerId,
            t => t.id
        );
        const customize = vi.fn((q: any) => q.where('name', parameter('name')));
        const read = query(knex, entity.schema)
            .include(t => t.owner, customize)
            .where(t => t.id, parameter('id'));
        expect((read as any).toSQL('John', 10).bindings).toEqual([
            'John',
            1,
            10,
            'John',
            1
        ]);
        expect((read as any).query('Jane', 20).toQuery()).toContain("'Jane'");
        expect(customize).toHaveBeenCalledTimes(1);

        const Asset = defineEntity(
            object({ id: number().primaryKey(), kind: string() }).hasTableName(
                'assets'
            )
        )
            .discriminator('kind')
            .stiVariant('note', object({ text: string() }))
            .stiVariant('image', object({ width: number() }));
        const poly = query(knex, Asset.schema)
            .forVariant('note', q => q.where(t => t.text, parameter('text')))
            .where(t => t.id, parameter('id'));
        expect(poly.toSQL('Hello', 1).bindings).toContain('Hello');
        expect(poly.query('World', 2).toQuery()).toContain('World');
        const image = poly.selectVariants(['image']);
        expect(image.toSQL(3).bindings).not.toContain('Hello');
        expect(image.toSQL(3).bindings).toContain(3);
    });

    it.each([false, true])(
        'executes and caches concurrent calls (inspect first: %s)',
        async inspectFirst => {
            const db = Knex({ client: 'pg' });
            vi.spyOn(db.client, 'acquireConnection').mockResolvedValue({});
            const release = vi
                .spyOn(db.client, 'releaseConnection')
                .mockResolvedValue(undefined);
            const event = vi.fn();
            db.on('query', event);
            vi.spyOn(db.client, '_query').mockImplementation(
                async (_connection: unknown, statement: any) => {
                    statement.response = {
                        command: 'SELECT',
                        rows: [
                            {
                                id: statement.bindings[0],
                                birthday: '2026-01-01T00:00:00Z'
                            }
                        ]
                    };
                    return statement;
                }
            );
            const read = query(db, User)
                .where(t => t.id, parameter('id'))
                .select(t => ({ id: t.id, birthday: t.birthday }));
            const compiler = vi.spyOn(db.client, 'queryCompiler');
            if (inspectFirst) read.toSQL(1);
            const [a, b] = await Promise.all([read(1), read(2)]);
            expect(a).toEqual([
                { id: 1, birthday: new Date('2026-01-01T00:00:00Z') }
            ]);
            expect(b[0].id).toBe(2);
            const compiled = compiler.mock.calls.length;
            expect(compiled).toBeGreaterThan(0);
            await read(3);
            expect(compiler).toHaveBeenCalledTimes(compiled);
            expect(event).toHaveBeenCalledTimes(3);
            expect(release).toHaveBeenCalledTimes(3);
            expect(event.mock.calls[0][0].sql).toContain('$1');
            await db.destroy();
        }
    );

    it('blocks unbound escape hatches and unsupported placeholder positions', async () => {
        const read = query(knex, User).where(t => t.id, parameter('id'));
        expect((read as any).then).toBeUndefined();
        expect(await Promise.resolve(read)).toBe(read);
        for (const method of [
            'execute',
            'compile',
            'first',
            'update',
            'delete',
            'toKnexQuery',
            'apply'
        ]) {
            expect(() => (read as any)[method]()).toThrow(
                /Bind query parameters/
            );
        }
        const source: any = query(knex, User);
        expect(() => source.where({ id: parameter('id') })).toThrow(
            /schema-typed/
        );
        expect(() => source.whereRaw('id = ?', [parameter('id')])).toThrow(
            /schema-typed/
        );
        expect(() =>
            source.whereJsonPath('name', '$.x', '=', parameter('x'))
        ).toThrow(/schema-typed/);
        const other = Knex({ client: 'pg' });
        other.client.config.client = 'other';
        expect(() =>
            query(other, User)
                .where(t => t.id, parameter('id'))
                .toSQL(1)
        ).toThrow(/PostgreSQL/);
    });
});
