// @cleverbrush/orm — public API tests
//
// Covers DbContext / DbSet / EntityQuery proxy semantics, find / findOrFail /
// findMany behaviour (SQL + validation + EntityNotFoundError), include /
// includeVariant forwarding, and saveGraph topology + validation paths.
//
// All tests run against a Knex `pg` client whose connection layer is
// stubbed (`acquireConnection` / `_query` / `processResponse`) so SQL is
// captured without a real database.

import {
    array,
    boolean,
    date,
    defineEntity,
    number,
    object,
    string
} from '@cleverbrush/knex-schema';
import type { Knex as KnexT } from 'knex';
import Knex from 'knex';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDb, EntityNotFoundError } from './index.js';

// ═══════════════════════════════════════════════════════════════════════════
// Knex stub: capture SQL without hitting a real database.
// ═══════════════════════════════════════════════════════════════════════════

interface CapturedQuery {
    readonly sql: string;
    readonly bindings: readonly unknown[];
    readonly method: string;
}

interface MockKnex {
    knex: KnexT;
    captured: CapturedQuery[];
    /** Programmable response queue; default is `[]` (returned for every call). */
    responses: unknown[][];
}

function makeMockKnex(): MockKnex {
    const knex = Knex({ client: 'pg' });
    const captured: CapturedQuery[] = [];
    const responses: unknown[][] = [];

    const client = knex.client as unknown as {
        acquireConnection: () => Promise<unknown>;
        releaseConnection: () => Promise<void>;
        _query: (conn: unknown, obj: any) => Promise<unknown>;
        processResponse: (resp: any, runner: any) => unknown;
    };

    client.acquireConnection = async () => ({ __mock: true });
    client.releaseConnection = async () => {};
    client._query = async (_conn, obj) => {
        captured.push({
            sql: obj.sql,
            bindings: obj.bindings ?? [],
            method: obj.method ?? 'select'
        });
        const next = responses.length > 0 ? responses.shift()! : [];
        return { rows: next, rowCount: next.length, command: 'SELECT' };
    };
    client.processResponse = (resp, runner) => {
        const rows = resp?.rows ?? [];
        const builder = runner?.builder;
        if (builder?._method === 'first') return rows[0];
        if (builder?._method === 'insert') return rows;
        if (builder?._method === 'update') return rows;
        if (builder?._method === 'del') return resp?.rowCount ?? 0;
        return rows;
    };

    return { knex, captured, responses };
}

// ═══════════════════════════════════════════════════════════════════════════
// Test schemas + entities
// ═══════════════════════════════════════════════════════════════════════════

const UserSchema = object({
    id: number().primaryKey(),
    email: string().hasColumnName('email_address'),
    name: string(),
    createdAt: date().hasColumnName('created_at').optional()
}).hasTableName('users');

const TodoSchema = object({
    id: number().primaryKey(),
    title: string(),
    completed: boolean().defaultTo(false),
    userId: number().hasColumnName('user_id'),
    author: object({
        id: number().primaryKey(),
        name: string()
    })
        .hasTableName('users')
        .optional()
}).hasTableName('todos');

const TodoWithRelations = object({
    id: number().primaryKey(),
    title: string(),
    userId: number().hasColumnName('user_id'),
    author: object({
        id: number().primaryKey(),
        name: string()
    })
        .hasTableName('users')
        .optional(),
    tags: array(
        object({
            id: number().primaryKey(),
            name: string()
        }).hasTableName('tags')
    ).optional()
}).hasTableName('todos');

// Composite-PK entity (junction-style table).
const PostTagSchema = object({
    postId: number().hasColumnName('post_id'),
    tagId: number().hasColumnName('tag_id'),
    addedAt: date().hasColumnName('added_at').optional()
})
    .hasTableName('post_tags')
    .hasPrimaryKey(['post_id', 'tag_id']);

// PK-less entity for negative tests.
const AuditLogSchema = object({
    message: string(),
    at: date()
}).hasTableName('audit_log');

const UserEntity = defineEntity(UserSchema);
const TodoEntity = defineEntity(TodoSchema).belongsTo(
    t => t.author,
    l => l.userId,
    r => r.id
);
const TodoWithTagsEntity = defineEntity(TodoWithRelations)
    .belongsTo(
        t => t.author,
        l => l.userId,
        r => r.id
    )
    .belongsToMany(t => t.tags, {
        table: 'todo_tags',
        localKey: 'todo_id',
        foreignKey: 'tag_id'
    });
const PostTagEntity = defineEntity(PostTagSchema);
const AuditLogEntity = defineEntity(AuditLogSchema);

// User entity with hasMany todos (for save-graph topology tests).
const UserWithTodosSchema = object({
    id: number().primaryKey(),
    name: string(),
    todos: array(
        object({
            id: number().primaryKey(),
            title: string(),
            userId: number().hasColumnName('user_id')
        }).hasTableName('todos')
    ).optional(),
    profile: object({
        id: number().primaryKey(),
        bio: string(),
        userId: number().hasColumnName('user_id')
    })
        .hasTableName('profiles')
        .optional()
}).hasTableName('users');

const UserWithTodosEntity = defineEntity(UserWithTodosSchema)
    .hasMany(
        u => u.todos,
        l => l.id,
        r => r.userId
    )
    .hasOne(
        u => u.profile,
        l => l.id,
        r => r.userId
    );

// ═══════════════════════════════════════════════════════════════════════════
// createDb / DbContext
// ═══════════════════════════════════════════════════════════════════════════

describe('createDb', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('exposes a DbSet for every registered entity', () => {
        const db = createDb(mock.knex, {
            users: UserEntity,
            todos: TodoEntity
        });
        expect(db.users).toBeDefined();
        expect(db.todos).toBeDefined();
        expect(db.users.entity).toBe(UserEntity);
        expect(db.todos.entity).toBe(TodoEntity);
    });

    it('exposes the underlying knex instance', () => {
        const db = createDb(mock.knex, { users: UserEntity });
        expect(db.knex).toBe(mock.knex);
    });

    it('withTransaction returns a new context bound to the trx', () => {
        const db = createDb(mock.knex, { users: UserEntity });
        const fakeTrx = { __isTrx: true } as unknown as KnexT.Transaction;
        const trxDb = db.withTransaction(fakeTrx);
        expect(trxDb).not.toBe(db);
        expect(trxDb.users).toBeDefined();
        expect(trxDb.users.entity).toBe(UserEntity);
    });

    it('transaction() runs the callback inside knex.transaction', async () => {
        const fakeTrx = { __isTrx: true } as unknown as KnexT.Transaction;
        const txSpy = vi
            .spyOn(mock.knex, 'transaction')
            .mockImplementation(((cb: any) => cb(fakeTrx)) as any);

        const db = createDb(mock.knex, { users: UserEntity });
        const cb = vi.fn(async (innerDb: typeof db) => {
            expect(innerDb).not.toBe(db);
            expect(innerDb.users.entity).toBe(UserEntity);
            return 42;
        });
        const result = await db.transaction(cb);
        expect(result).toBe(42);
        expect(txSpy).toHaveBeenCalledOnce();
        expect(cb).toHaveBeenCalledOnce();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// DbSet — structural surface
// ═══════════════════════════════════════════════════════════════════════════

describe('DbSet', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('.entity returns the wrapped Entity definition', () => {
        const db = createDb(mock.knex, { users: UserEntity });
        expect(db.users.entity).toBe(UserEntity);
    });

    it('.query() returns a fresh EntityQuery with its own state', () => {
        const db = createDb(mock.knex, { users: UserEntity });
        const q1 = db.users.query();
        const q2 = db.users.query();
        expect(q1).not.toBe(q2);
        // Mutating one chain must not bleed into another.
        const a = q1.where(t => t.id, 1);
        const b = q2.where(t => t.id, 99);
        expect(a.toQuery()).toContain('"id" = 1');
        expect(b.toQuery()).toContain('"id" = 99');
    });

    it('.withTransaction returns a new DbSet bound to the trx', () => {
        const db = createDb(mock.knex, { users: UserEntity });
        // Use the mock knex itself as the "transaction" handle so the
        // returned DbSet can build a real query against the same client.
        const txSet = db.users.withTransaction(
            mock.knex as unknown as KnexT.Transaction
        );
        expect(txSet).not.toBe(db.users);
        expect(txSet.entity).toBe(UserEntity);
        // Sanity-check it builds a query without crashing.
        const sql = txSet.where(t => t.id, 5).toQuery();
        expect(sql).toContain('from "users"');
    });

    it('forwards arbitrary SchemaQueryBuilder methods (toQuery, where)', () => {
        const db = createDb(mock.knex, { users: UserEntity });
        const sql = db.users.where(t => t.id, 1).toQuery();
        expect(sql).toContain('from "users"');
        expect(sql).toContain('"id" = 1');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// EntityQuery — proxy chains, include selector
// ═══════════════════════════════════════════════════════════════════════════

describe('EntityQuery proxy', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('this-returning chains keep the typed proxy so .include is still available', () => {
        const db = createDb(mock.knex, { todos: TodoEntity });
        const chain = db.todos
            .where(t => t.completed, false)
            .orderBy(t => t.id, 'desc');
        expect(typeof chain.include).toBe('function');
        expect(typeof chain.toQuery).toBe('function');
    });

    it('.include(selector) forwards the relation name and emits a JOIN', () => {
        const db = createDb(mock.knex, { todos: TodoEntity });
        const sql = db.todos.include(t => t.author).toQuery();
        expect(sql.toLowerCase()).toContain('join');
        expect(sql).toContain('users');
    });

    it('.include(selector) accepts a customize callback', () => {
        const db = createDb(mock.knex, { todos: TodoEntity });
        const customize = vi.fn();
        db.todos.include(t => t.author, customize);
        expect(customize).toHaveBeenCalledOnce();
    });

    it('.include() chained twice both apply', () => {
        const db = createDb(mock.knex, { todos: TodoWithTagsEntity });
        const sql = db.todos
            .include(t => t.author)
            .include(t => t.tags)
            .toQuery();
        expect(sql.toLowerCase()).toContain('join');
        // Both nav properties should appear in the JSON-aggregation columns.
        expect(sql).toContain('users');
        expect(sql).toContain('tags');
    });

    it('.includeVariant forwards to the underlying query builder', () => {
        // TodoEntity is not polymorphic, so the underlying call rejects
        // with a recognisable error — proving the proxy delegated rather
        // than swallowing the call.
        const db = createDb(mock.knex, { todos: TodoEntity });
        expect(() => db.todos.includeVariant('foo', 'author')).toThrow(
            /not polymorphic/i
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// find / findOrFail / findMany
// ═══════════════════════════════════════════════════════════════════════════

describe('DbSet.find / findOrFail / findMany', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    // ---- single-PK happy paths ---------------------------------------------

    it('find(scalar) emits WHERE id = ? and returns the first row', async () => {
        mock.responses.push([{ id: 42, email: 'a@b', name: 'A' }]);
        const db = createDb(mock.knex, { users: UserEntity });
        const u = await db.users.find(42);
        expect(u).toEqual({ id: 42, email: 'a@b', name: 'A' });
        expect(mock.captured).toHaveLength(1);
        expect(mock.captured[0].sql).toContain('"id" = $1');
        expect(mock.captured[0].bindings).toContain(42);
    });

    it('find(scalar) returns undefined when no row matches', async () => {
        mock.responses.push([]);
        const db = createDb(mock.knex, { users: UserEntity });
        const u = await db.users.find(999);
        expect(u).toBeUndefined();
    });

    it('findOrFail returns the row when present', async () => {
        mock.responses.push([{ id: 1, email: 'x', name: 'Y' }]);
        const db = createDb(mock.knex, { users: UserEntity });
        const u = await db.users.findOrFail(1);
        expect(u).toEqual({ id: 1, email: 'x', name: 'Y' });
    });

    it('findOrFail throws EntityNotFoundError when no row matches', async () => {
        mock.responses.push([]);
        const db = createDb(mock.knex, { users: UserEntity });
        await expect(db.users.findOrFail(7)).rejects.toBeInstanceOf(
            EntityNotFoundError
        );
        try {
            await db.users.findOrFail(7);
        } catch (err) {
            const e = err as EntityNotFoundError;
            expect(e.name).toBe('EntityNotFoundError');
            expect(e.entity).toBe('users');
            expect(e.pk).toBe(7);
            expect(e.message).toContain('users');
            expect(e.message).toContain('7');
        }
    });

    it('findMany([]) short-circuits and never hits the database', async () => {
        const db = createDb(mock.knex, { users: UserEntity });
        const rows = await db.users.findMany([]);
        expect(rows).toEqual([]);
        expect(mock.captured).toHaveLength(0);
    });

    it('findMany on single-PK emits WHERE id IN (...)', async () => {
        mock.responses.push([
            { id: 1, email: 'a', name: 'A' },
            { id: 2, email: 'b', name: 'B' }
        ]);
        const db = createDb(mock.knex, { users: UserEntity });
        const rows = await db.users.findMany([1, 2]);
        expect(rows).toHaveLength(2);
        expect(mock.captured[0].sql.toLowerCase()).toContain('"id" in (');
        expect(mock.captured[0].bindings).toEqual([1, 2]);
    });

    // ---- composite-PK paths -----------------------------------------------

    it('find on composite-PK accepts a tuple', async () => {
        mock.responses.push([{ postId: 1, tagId: 9 }]);
        const db = createDb(mock.knex, { postTags: PostTagEntity });
        const r = await db.postTags.find([1, 9]);
        expect(r).toEqual({ postId: 1, tagId: 9 });
        expect(mock.captured[0].sql).toContain('"post_id"');
        expect(mock.captured[0].sql).toContain('"tag_id"');
        expect(mock.captured[0].bindings).toEqual(
            expect.arrayContaining([1, 9])
        );
    });

    it('find on composite-PK throws when given a scalar', async () => {
        const db = createDb(mock.knex, { postTags: PostTagEntity });
        await expect(
            // @ts-expect-error — scalar is invalid for a composite-PK entity.
            db.postTags.find(42)
        ).rejects.toThrow(/composite primary key requires a tuple/i);
    });

    it('find with the wrong tuple length throws', async () => {
        const db = createDb(mock.knex, { postTags: PostTagEntity });
        await expect(db.postTags.find([1, 2, 3])).rejects.toThrow(
            /expected 2 primary-key value/i
        );
    });

    it('findMany on composite-PK emits OR-grouped predicates', async () => {
        mock.responses.push([
            { postId: 1, tagId: 9 },
            { postId: 2, tagId: 9 }
        ]);
        const db = createDb(mock.knex, { postTags: PostTagEntity });
        const rows = await db.postTags.findMany([
            [1, 9],
            [2, 9]
        ]);
        expect(rows).toHaveLength(2);
        const sql = mock.captured[0].sql;
        // Both PK columns (column names, not property names) appear OR'd.
        expect(sql).toContain('"post_id"');
        expect(sql).toContain('"tag_id"');
        expect(sql.toLowerCase()).toContain(' or ');
        expect(mock.captured[0].bindings).toEqual(
            expect.arrayContaining([1, 9, 2, 9])
        );
    });

    // ---- argument validation ----------------------------------------------

    it('findMany rejects a non-array argument', async () => {
        const db = createDb(mock.knex, { users: UserEntity });
        await expect(
            // @ts-expect-error — non-array is invalid; runtime guard tested.
            db.users.findMany(42)
        ).rejects.toThrow(/expected an array/i);
    });

    // ---- no-PK entities ---------------------------------------------------

    it('find on a PK-less entity throws a descriptive error', async () => {
        const db = createDb(mock.knex, { logs: AuditLogEntity });
        await expect(
            // @ts-expect-error — PK-less entity: type rejects the argument.
            db.logs.find(1)
        ).rejects.toThrow(/no primary key declared/i);
    });

    it('findOrFail on a PK-less entity throws', async () => {
        const db = createDb(mock.knex, { logs: AuditLogEntity });
        await expect(
            // @ts-expect-error — PK-less entity: type rejects the argument.
            db.logs.findOrFail(1)
        ).rejects.toThrow(/no primary key declared/i);
    });

    it('findMany on a PK-less entity throws (when array is non-empty)', async () => {
        const db = createDb(mock.knex, { logs: AuditLogEntity });
        await expect(
            // @ts-expect-error — PK-less entity: type rejects the argument.
            db.logs.findMany([1])
        ).rejects.toThrow(/no primary key declared/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// EntityNotFoundError
// ═══════════════════════════════════════════════════════════════════════════

describe('EntityNotFoundError', () => {
    it('extends Error and exposes typed entity / pk fields', () => {
        const e = new EntityNotFoundError('users', 42);
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(EntityNotFoundError);
        expect(e.name).toBe('EntityNotFoundError');
        expect(e.entity).toBe('users');
        expect(e.pk).toBe(42);
        expect(e.message).toBe('Entity "users" not found for primary key 42');
    });

    it('accepts a tuple primary key', () => {
        const e = new EntityNotFoundError('post_tags', [1, 9]);
        expect(e.pk).toEqual([1, 9]);
        expect(e.message).toContain('[1,9]');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// DbSet.save — saveGraph topology + validation
// ═══════════════════════════════════════════════════════════════════════════

describe('DbSet.save — graph persistence', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    /**
     * `saveGraph` routes all writes through `knex.transaction(...)`. Stub
     * `knex.transaction` so the callback runs against the same mocked
     * client without opening a real transaction.
     */
    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('insert path: writes parent then child with FK propagated', async () => {
        stubTransaction();
        // belongsTo parent (author) insert returns the new user row.
        mock.responses.push([{ id: 7, name: 'Alice' }]);
        // root (todo) insert.
        mock.responses.push([
            { id: 13, title: 'T', userId: 7, completed: false }
        ]);

        const db = createDb(mock.knex, { todos: TodoEntity });
        const result = await db.todos.save({
            title: 'T',
            completed: false,
            author: { name: 'Alice' }
        } as any);

        expect(result).toMatchObject({ id: 13, title: 'T', userId: 7 });
        // Two insert statements were emitted (author first, then todo).
        const inserts = mock.captured.filter(c => /^insert /i.test(c.sql));
        expect(inserts.length).toBeGreaterThanOrEqual(2);
        // The todo insert must include the propagated FK = parent PK (7).
        const todoInsert = inserts.find(c => c.sql.includes('"todos"'));
        expect(todoInsert).toBeDefined();
        expect(todoInsert!.bindings).toContain(7);
    });

    it('hasOne array value throws "expects a single object"', async () => {
        stubTransaction();
        // Root insert succeeds first.
        mock.responses.push([{ id: 1, name: 'A' }]);
        const db = createDb(mock.knex, { users: UserWithTodosEntity });
        await expect(
            db.users.save({
                name: 'A',
                profile: [{ bio: 'oops', userId: 0 }] as any
            } as any)
        ).rejects.toThrow(/expects a single object/i);
    });

    it('hasMany non-array value throws "expects an array"', async () => {
        stubTransaction();
        mock.responses.push([{ id: 1, name: 'A' }]);
        const db = createDb(mock.knex, { users: UserWithTodosEntity });
        await expect(
            db.users.save({
                name: 'A',
                todos: { title: 'oops', userId: 0 } as any
            } as any)
        ).rejects.toThrow(/expects an array/i);
    });

    it('belongsTo value must be an object, not an array', async () => {
        stubTransaction();
        const db = createDb(mock.knex, { todos: TodoEntity });
        await expect(
            db.todos.save({
                title: 'T',
                completed: false,
                author: [{ name: 'X' }] as any
            } as any)
        ).rejects.toThrow(/expects an object \(belongsTo\)/i);
    });

    it('update path: PK present → emits UPDATE, no INSERT for root', async () => {
        stubTransaction();
        // The update returns the updated row.
        mock.responses.push([{ id: 5, name: 'X', email: 'x@y' }]);
        const db = createDb(mock.knex, { users: UserEntity });
        const out = await db.users.save({
            id: 5,
            name: 'X',
            email: 'x@y'
        } as any);
        expect(out).toMatchObject({ id: 5 });
        const updates = mock.captured.filter(c => /^update /i.test(c.sql));
        expect(updates.length).toBeGreaterThanOrEqual(1);
        // No INSERT for the root row.
        const inserts = mock.captured.filter(c =>
            /^insert into "users"/i.test(c.sql)
        );
        expect(inserts).toHaveLength(0);
    });

    it('belongsToMany attaches existing rows by PK without inserting them', async () => {
        stubTransaction();
        // Root todo insert.
        mock.responses.push([
            { id: 21, title: 'T', userId: null, completed: false }
        ]);
        // Pivot insert (todo_tags) returns []; we don't read it.
        mock.responses.push([]);

        const db = createDb(mock.knex, { todos: TodoWithTagsEntity });
        await db.todos.save({
            title: 'T',
            completed: false,
            userId: 0,
            tags: [{ id: 99 }]
        } as any);

        // Pivot insert must reference todo_tags + tag_id 99 + the new
        // todo's PK 21.
        const pivot = mock.captured.find(c => c.sql.includes('"todo_tags"'));
        expect(pivot).toBeDefined();
        expect(pivot!.bindings).toEqual(expect.arrayContaining([21, 99]));
        // The tag itself must NOT be inserted (PK was supplied → reference).
        const tagInsert = mock.captured.find(c =>
            /insert into "tags"/i.test(c.sql)
        );
        expect(tagInsert).toBeUndefined();
    });

    it('reuses an outer transaction when called via withTransaction', async () => {
        // Mark the knex handle as a transaction so saveGraph reuses it.
        (mock.knex as any).isTransaction = true;
        const txSpy = vi.spyOn(mock.knex, 'transaction');

        mock.responses.push([{ id: 9, email: 'x', name: 'Y' }]);
        const db = createDb(mock.knex, { users: UserEntity });
        await db.users
            .withTransaction(mock.knex as unknown as KnexT.Transaction)
            .save({ name: 'Y', email: 'x' } as any);

        // saveGraph must NOT open a fresh transaction.
        expect(txSpy).not.toHaveBeenCalled();
    });

    it('hasOne path: persists single child with FK propagated', async () => {
        stubTransaction();
        // Root user insert.
        mock.responses.push([{ id: 11, name: 'A' }]);
        // hasOne profile insert.
        mock.responses.push([{ id: 22, bio: 'hi', userId: 11 }]);
        const db = createDb(mock.knex, { users: UserWithTodosEntity });
        const out = await db.users.save({
            name: 'A',
            profile: { bio: 'hi', userId: 0 }
        } as any);
        expect((out as any).profile).toMatchObject({ id: 22, userId: 11 });
        const profileInsert = mock.captured.find(c =>
            /insert into "profiles"/i.test(c.sql)
        );
        expect(profileInsert).toBeDefined();
        // FK column "user_id" must carry the parent PK (11).
        expect(profileInsert!.bindings).toContain(11);
    });

    it('hasMany path: writes each child with FK propagated', async () => {
        stubTransaction();
        // Root user insert.
        mock.responses.push([{ id: 31, name: 'A' }]);
        // Two child todo inserts.
        mock.responses.push([{ id: 101, title: 't1', userId: 31 }]);
        mock.responses.push([{ id: 102, title: 't2', userId: 31 }]);

        const db = createDb(mock.knex, { users: UserWithTodosEntity });
        const out = await db.users.save({
            name: 'A',
            todos: [
                { title: 't1', userId: 0 },
                { title: 't2', userId: 0 }
            ]
        } as any);
        expect((out as any).todos).toHaveLength(2);
        const todoInserts = mock.captured.filter(c =>
            /insert into "todos"/i.test(c.sql)
        );
        expect(todoInserts).toHaveLength(2);
        // Each child insert must carry the parent PK (31).
        for (const ins of todoInserts) {
            expect(ins.bindings).toContain(31);
        }
    });

    it('belongsToMany inserts a brand-new child when no PK is supplied', async () => {
        stubTransaction();
        // Root todo insert.
        mock.responses.push([
            { id: 41, title: 'T', userId: null, completed: false }
        ]);
        // Tag insert (because PK was not supplied → create new row).
        mock.responses.push([{ id: 77, name: 'urgent' }]);
        // Pivot insert.
        mock.responses.push([]);

        const db = createDb(mock.knex, { todos: TodoWithTagsEntity });
        await db.todos.save({
            title: 'T',
            completed: false,
            userId: 0,
            tags: [{ name: 'urgent' }]
        } as any);

        const tagInsert = mock.captured.find(c =>
            /insert into "tags"/i.test(c.sql)
        );
        expect(tagInsert).toBeDefined();
        const pivot = mock.captured.find(c => c.sql.includes('"todo_tags"'));
        expect(pivot).toBeDefined();
        // Pivot row must reference the new tag's PK (77) and the new
        // todo's PK (41).
        expect(pivot!.bindings).toEqual(expect.arrayContaining([41, 77]));
    });
});
