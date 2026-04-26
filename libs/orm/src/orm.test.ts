// @cleverbrush/orm — public API tests
//
// Covers DbContext / DbSet / EntityQuery proxy semantics, find / findOrFail /
// findMany behaviour (SQL + validation + EntityNotFoundError), include /
// includeVariant forwarding, saveGraph topology + validation paths,
// polymorphic write API (insertVariant, updateVariant, deleteVariant,
// findVariant), and tracked DbContext (identity map, saveChanges,
// discardChanges, reload, onSavingChanges, Symbol.asyncDispose).
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
import {
    ConcurrencyError,
    createDb,
    EntityNotFoundError,
    InvariantViolationError,
    PendingChangesError
} from './index.js';

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
        await expect(db.postTags.find([1, 2, 3] as any)).rejects.toThrow(
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

// ═══════════════════════════════════════════════════════════════════════════
// Polymorphic write API — insertVariant / updateVariant / deleteVariant /
// findVariant
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Shared polymorphic entity definitions (CTI + STI)
// ---------------------------------------------------------------------------

// Base schema: STI shape — everything in one table.
const ActivityBaseSchema = object({
    id: number().primaryKey(),
    type: string(),
    todoId: number().hasColumnName('todo_id'),
    userId: number().hasColumnName('user_id')
}).hasTableName('activities');

const AssignedExtrasSTI = object({
    type: string('assigned'),
    assigneeId: number().hasColumnName('assignee_id').optional()
}); // no separate table — STI

const CommentedExtrasSTI = object({
    type: string('commented'),
    body: string().optional()
}); // STI

// STI entity: all variants share the 'activities' table
const ActivityEntitySTI = defineEntity(ActivityBaseSchema)
    .discriminator('type')
    .stiVariant('assigned', AssignedExtrasSTI)
    .stiVariant('commented', CommentedExtrasSTI);

// CTI shape: variant rows live in separate tables
const CTIBaseSchema = object({
    id: number().primaryKey(),
    type: string(),
    todoId: number().hasColumnName('todo_id')
}).hasTableName('activities');

const AssignedExtrasCTI = object({
    activityId: number().hasColumnName('activity_id'),
    type: string('assigned'),
    assigneeId: number().hasColumnName('assignee_id')
}).hasTableName('assigned_activities');

const CommentedExtrasCTI = object({
    activityId: number().hasColumnName('activity_id'),
    type: string('commented'),
    body: string()
}).hasTableName('commented_activities');

const ActivityEntityCTI = defineEntity(CTIBaseSchema)
    .discriminator('type')
    .ctiVariant(
        'assigned',
        defineEntity(AssignedExtrasCTI),
        t => t.activityId,
        { allowOrphan: true }
    )
    .ctiVariant(
        'commented',
        defineEntity(CommentedExtrasCTI),
        t => t.activityId,
        { allowOrphan: true }
    );

// ---------------------------------------------------------------------------
// DbSet.ofVariant — insert
// ---------------------------------------------------------------------------

describe('DbSet.ofVariant — insert', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('STI: inserts a single row into the base table with discriminator set', async () => {
        stubTransaction();
        mock.responses.push([
            { id: 1, type: 'assigned', todo_id: 42, assignee_id: 9, user_id: 7 }
        ]);

        const db = createDb(mock.knex, { activities: ActivityEntitySTI });
        const result = await db.activities.ofVariant('assigned').insert({
            todoId: 42,
            userId: 7,
            assigneeId: 9
        });

        // Should have emitted exactly one INSERT into 'activities'.
        const inserts = mock.captured.filter(c => /^insert /i.test(c.sql));
        expect(inserts).toHaveLength(1);
        expect(inserts[0].sql).toContain('"activities"');
        expect(result).toMatchObject({ type: 'assigned' });
    });

    it('CTI: inserts base row then variant row in a transaction', async () => {
        stubTransaction();
        // Base row insert returns generated PK.
        mock.responses.push([{ id: 5, type: 'assigned', todo_id: 42 }]);
        // Variant row insert.
        mock.responses.push([]);

        const db = createDb(mock.knex, { activities: ActivityEntityCTI });
        const result = await db.activities.ofVariant('assigned').insert({
            todoId: 42,
            assigneeId: 9
        });

        const inserts = mock.captured.filter(c => /^insert /i.test(c.sql));
        expect(inserts).toHaveLength(2);
        // First insert → base table
        expect(inserts[0].sql).toContain('"activities"');
        // Second insert → variant table
        expect(inserts[1].sql).toContain('"assigned_activities"');
        // Variant row must carry the base PK as FK.
        expect(inserts[1].bindings).toContain(5);
        // Returned result contains the merged shape.
        expect(result).toMatchObject({
            id: 5,
            type: 'assigned',
            assigneeId: 9
        });
    });

    it('CTI: discriminator is set automatically on the base row', async () => {
        stubTransaction();
        mock.responses.push([{ id: 7, type: 'commented', todo_id: 1 }]);
        mock.responses.push([]);

        const db = createDb(mock.knex, { activities: ActivityEntityCTI });
        await db.activities.ofVariant('commented').insert({
            todoId: 1,
            body: 'hi'
        });

        const baseInsert = mock.captured.find(c =>
            c.sql.includes('"activities"')
        );
        expect(baseInsert).toBeDefined();
        // The 'commented' discriminator value must be in the bindings.
        expect(baseInsert!.bindings).toContain('commented');
    });

    it('throws when the schema is not polymorphic', async () => {
        const db = createDb(mock.knex, { users: UserEntity });
        expect(() => (db.users as any).ofVariant('foo')).toThrow(
            /not polymorphic/i
        );
    });

    it('throws when the variant key is unknown', async () => {
        stubTransaction();
        const db = createDb(mock.knex, { activities: ActivityEntitySTI });
        await expect(
            db.activities.ofVariant('nonexistent' as any).insert({})
        ).rejects.toThrow(/unknown/i);
    });
});

// ---------------------------------------------------------------------------
// VariantDbSet.update (via ofVariant chain)
// ---------------------------------------------------------------------------

describe('VariantDbSet.update', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('STI: emits an UPDATE on the base table filtered by discriminator', async () => {
        // First query: execute() to collect PKs → returns matching rows.
        mock.responses.push([
            { id: 3, type: 'assigned', todo_id: 10, user_id: 1, assignee_id: 4 }
        ]);
        // Second query: the UPDATE itself.
        mock.responses.push([]);

        const db = createDb(mock.knex, { activities: ActivityEntitySTI });
        await db.activities
            .ofVariant('assigned')
            .where(t => t.id, 3)
            .update({ assigneeId: 99 });

        const updates = mock.captured.filter(c => /^update /i.test(c.sql));
        expect(updates).toHaveLength(1);
        expect(updates[0].sql).toContain('"activities"');
        expect(updates[0].bindings).toContain(99);
    });

    it('CTI: emits an UPDATE on the variant table', async () => {
        stubTransaction();
        // execute() returns matched base-table rows.
        mock.responses.push([{ id: 5, type: 'assigned', todo_id: 1 }]);
        // UPDATE on the variant table.
        mock.responses.push([]);

        const db = createDb(mock.knex, { activities: ActivityEntityCTI });
        await db.activities
            .ofVariant('assigned')
            .where(t => t.id, 5)
            .update({ assigneeId: 10 });

        const updates = mock.captured.filter(c => /^update /i.test(c.sql));
        expect(updates).toHaveLength(1);
        expect(updates[0].sql).toContain('"assigned_activities"');
        expect(updates[0].bindings).toContain(10);
    });

    it('is a no-op when the WHERE clause matches no rows', async () => {
        // execute() returns empty result set.
        mock.responses.push([]);

        const db = createDb(mock.knex, { activities: ActivityEntitySTI });
        await db.activities
            .ofVariant('assigned')
            .where(t => t.id, 999)
            .update({ assigneeId: 1 });

        const updates = mock.captured.filter(c => /^update /i.test(c.sql));
        expect(updates).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// VariantDbSet.delete (via ofVariant chain)
// ---------------------------------------------------------------------------

describe('VariantDbSet.delete', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('STI: emits a DELETE on the base table with discriminator filter', async () => {
        stubTransaction();
        // execute() to collect PKs.
        mock.responses.push([{ id: 2, type: 'commented', todo_id: 1 }]);
        // The DELETE.
        mock.responses.push([]);

        const db = createDb(mock.knex, { activities: ActivityEntitySTI });
        await db.activities
            .ofVariant('commented')
            .where(t => t.id, 2)
            .delete();

        const deletes = mock.captured.filter(c => /^delete /i.test(c.sql));
        expect(deletes).toHaveLength(1);
        expect(deletes[0].sql).toContain('"activities"');
    });

    it('CTI: deletes variant row first then base row', async () => {
        stubTransaction();
        // execute() → matched base rows.
        mock.responses.push([{ id: 7, type: 'assigned', todo_id: 3 }]);
        // DELETE from variant table.
        mock.responses.push([]);
        // DELETE from base table.
        mock.responses.push([]);

        const db = createDb(mock.knex, { activities: ActivityEntityCTI });
        await db.activities
            .ofVariant('assigned')
            .where(t => t.id, 7)
            .delete();

        const deletes = mock.captured.filter(c => /^delete /i.test(c.sql));
        expect(deletes).toHaveLength(2);
        // Variant table first.
        expect(deletes[0].sql).toContain('"assigned_activities"');
        // Base table second.
        expect(deletes[1].sql).toContain('"activities"');
    });

    it('is a no-op when no rows match', async () => {
        mock.responses.push([]);

        const db = createDb(mock.knex, { activities: ActivityEntitySTI });
        await db.activities
            .ofVariant('assigned')
            .where(t => t.id, 0)
            .delete();

        const deletes = mock.captured.filter(c => /^delete /i.test(c.sql));
        expect(deletes).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// VariantDbSet.find
// ---------------------------------------------------------------------------

describe('VariantDbSet.find', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('returns the matched row', async () => {
        mock.responses.push([
            { id: 3, type: 'assigned', todo_id: 5, user_id: 1, assignee_id: 2 }
        ]);

        const db = createDb(mock.knex, { activities: ActivityEntitySTI });
        const result = await db.activities.ofVariant('assigned').find(3);
        expect(result).toMatchObject({ id: 3, type: 'assigned' });
    });

    it('returns undefined when no row matches', async () => {
        mock.responses.push([]);

        const db = createDb(mock.knex, { activities: ActivityEntitySTI });
        const result = await db.activities.ofVariant('assigned').find(999);
        expect(result).toBeUndefined();
    });

    it('emits a WHERE clause for the supplied PK', async () => {
        mock.responses.push([]);

        const db = createDb(mock.knex, { activities: ActivityEntitySTI });
        await db.activities.ofVariant('assigned').find(42);

        expect(mock.captured).toHaveLength(1);
        expect(mock.captured[0].sql).toContain('"id"');
        expect(mock.captured[0].bindings).toContain(42);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — identity map + saveChanges + discardChanges + reload
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    // -------------------------------------------------------------------------
    // createDb with tracking option
    // -------------------------------------------------------------------------

    it('createDb({ tracking: true }) returns a context with saveChanges', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        expect(typeof db.saveChanges).toBe('function');
        expect(typeof db.discardChanges).toBe('function');
        expect(typeof db.attach).toBe('function');
        expect(typeof db.detach).toBe('function');
        expect(typeof db.entry).toBe('function');
        expect(typeof db.reload).toBe('function');
        expect(typeof db.onSavingChanges).toBe('function');
        expect(typeof db[Symbol.asyncDispose]).toBe('function');
    });

    it('createDb without tracking option does not expose saveChanges', () => {
        const db = createDb(mock.knex, { users: UserEntity });
        expect((db as any).saveChanges).toBeUndefined();
    });

    // -------------------------------------------------------------------------
    // Identity map
    // -------------------------------------------------------------------------

    it('querying the same PK twice returns the same object reference', async () => {
        mock.responses.push([{ id: 1, email: 'a@b', name: 'A' }]);
        mock.responses.push([{ id: 1, email: 'a@b', name: 'A' }]);

        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const a = await db.users.find(1);
        const b = await db.users.find(1);
        expect(a).toBeDefined();
        expect(a).toBe(b); // strict identity
    });

    it('rows returned from all() are attached to the tracker', async () => {
        mock.responses.push([
            { id: 1, email: 'a@b', name: 'A' },
            { id: 2, email: 'c@d', name: 'B' }
        ]);

        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const rows = (await db.users.execute()) as any[];

        // Querying one of the same PKs should return the existing object.
        mock.responses.push([{ id: 1, email: 'a@b', name: 'A' }]);
        const reloaded = await db.users.find(1);
        expect(reloaded).toBe(rows[0]);
    });

    // -------------------------------------------------------------------------
    // attach / detach / entry
    // -------------------------------------------------------------------------

    it('attach adds an entity to the tracker; entry() reads its state', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 10, email: 'x@y', name: 'X' };
        db.attach('users', user);
        const e = db.entry(user);
        expect(e.state).toBe('Unchanged');
        expect(e.currentValues).toBe(user);
    });

    it('attach returns existing tracked object for duplicate PK', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const u1 = { id: 5, email: 'a@b', name: 'A' };
        const u2 = { id: 5, email: 'c@d', name: 'C' }; // same PK, different object
        db.attach('users', u1);
        const returned = db.attach('users', u2);
        expect(returned).toBe(u1); // identity-map: existing wins
    });

    it('entry().originalValues returns the snapshot', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b.com', name: 'Alice' };
        db.attach('users', user);

        const original = db.entry(user).originalValues;
        expect(original.name).toBe('Alice');
        expect(original.email).toBe('a@b.com');
    });

    it('entry().isModified() returns false on unmodified entity', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        expect(db.entry(user).isModified()).toBe(false);
    });

    it('entry().isModified() returns true after mutation', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        user.name = 'Changed';
        expect(db.entry(user).isModified()).toBe(true);
        expect(db.entry(user).isModified('name')).toBe(true);
        expect(db.entry(user).isModified('email')).toBe(false);
    });

    it('entry().reset() reverts mutations', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        user.name = 'Changed';
        db.entry(user).reset();
        expect(user.name).toBe('A');
        expect(db.entry(user).state).toBe('Unchanged');
    });

    it('entry() throws for untracked entity', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 99, email: 'x', name: 'X' };
        expect(() => db.entry(user)).toThrow(/not tracked/i);
    });

    it('detach removes entity from tracker; entry throws afterwards', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        db.detach(user);
        expect(() => db.entry(user)).toThrow(/not tracked/i);
    });

    it('detach removes added-without-PK entity from tracker (lines 382-385)', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        // Attach with no PK — goes to #addedWithoutPk
        const user = { id: undefined as any, email: 'x@y', name: 'X' };
        db.attach('users', user);
        // Detach should remove from the #addedWithoutPk set
        db.detach(user);
        expect(() => db.entry(user)).toThrow(/not tracked/i);
    });

    it('attach() throws when entity set is unknown (line 290)', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        expect(() => db.attach('nonexistent' as any, { id: 1 })).toThrow(
            /unknown entity set/i
        );
    });

    // -------------------------------------------------------------------------
    // remove / Deleted state
    // -------------------------------------------------------------------------

    it('remove() marks a tracked entity as Deleted', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        db.remove(user);
        expect(db.entry(user).state).toBe('Deleted');
    });

    it('remove() throws for untracked entity', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        expect(() => db.remove({ id: 1, email: 'x', name: 'X' })).toThrow();
    });

    // -------------------------------------------------------------------------
    // saveChanges — UPDATE path
    // -------------------------------------------------------------------------

    it('saveChanges() detects silently mutated Unchanged entries and emits UPDATE', async () => {
        stubTransaction();
        mock.responses.push([{ id: 1, email_address: 'a@b', name: 'Updated' }]);

        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        user.name = 'Updated'; // mutate without calling any set-state method

        const result = await db.saveChanges();
        expect(result.updated).toBe(1);
        expect(result.inserted).toBe(0);
        expect(result.deleted).toBe(0);

        const updates = mock.captured.filter(c => /^update /i.test(c.sql));
        expect(updates).toHaveLength(1);
        expect(updates[0].sql).toContain('"users"');
        expect(updates[0].bindings).toContain('Updated');
    });

    it('saveChanges() emits no SQL when nothing changed', async () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);

        const result = await db.saveChanges();
        expect(result).toEqual({ inserted: 0, updated: 0, deleted: 0 });
        expect(mock.captured).toHaveLength(0);
    });

    // -------------------------------------------------------------------------
    // saveChanges — INSERT path (Added)
    // -------------------------------------------------------------------------

    it('saveChanges() inserts Added entities', async () => {
        stubTransaction();
        mock.responses.push([{ id: 42, email_address: 'new@e', name: 'New' }]);

        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        // Attach with no PK — treated as Added
        const user = { id: undefined as any, email: 'new@e', name: 'New' };
        db.attach('users', user);

        const result = await db.saveChanges();
        expect(result.inserted).toBe(1);

        const inserts = mock.captured.filter(c => /^insert /i.test(c.sql));
        expect(inserts).toHaveLength(1);
        expect(inserts[0].sql).toContain('"users"');
    });

    // -------------------------------------------------------------------------
    // saveChanges — DELETE path
    // -------------------------------------------------------------------------

    it('saveChanges() deletes Deleted entities', async () => {
        stubTransaction();
        mock.responses.push([]); // DELETE response

        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 3, email: 'x@y', name: 'X' };
        db.attach('users', user);
        db.remove(user);

        const result = await db.saveChanges();
        expect(result.deleted).toBe(1);

        const deletes = mock.captured.filter(c => /^delete /i.test(c.sql));
        expect(deletes).toHaveLength(1);
        expect(deletes[0].sql).toContain('"users"');
        expect(deletes[0].bindings).toContain(3);
    });

    it('saveChanges() refreshes snapshot so subsequent saves are no-ops', async () => {
        stubTransaction();
        mock.responses.push([]); // first UPDATE

        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        user.name = 'B';

        await db.saveChanges();
        // No further mutation → second saveChanges should be a no-op
        const result2 = await db.saveChanges();
        expect(result2).toEqual({ inserted: 0, updated: 0, deleted: 0 });
    });

    // -------------------------------------------------------------------------
    // saveChanges — PK / discriminator invariant checks
    // -------------------------------------------------------------------------

    it('saveChanges() throws InvariantViolationError when PK is mutated', async () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        (user as any).id = 99; // mutate PK

        await expect(db.saveChanges()).rejects.toBeInstanceOf(
            InvariantViolationError
        );
    });

    // -------------------------------------------------------------------------
    // discardChanges
    // -------------------------------------------------------------------------

    it('discardChanges() reverts Modified entries to snapshot', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        user.name = 'Changed';

        db.discardChanges();
        expect(user.name).toBe('A');
        expect(db.entry(user).state).toBe('Unchanged');
    });

    it('discardChanges() restores Deleted entries to Unchanged', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        db.remove(user);
        expect(db.entry(user).state).toBe('Deleted');

        db.discardChanges();
        expect(db.entry(user).state).toBe('Unchanged');
    });

    // -------------------------------------------------------------------------
    // onSavingChanges hooks
    // -------------------------------------------------------------------------

    it('onSavingChanges hook is called for each dirty entry before flush', async () => {
        stubTransaction();
        mock.responses.push([]);

        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        user.name = 'B';

        const hookEntries: string[] = [];
        db.onSavingChanges(entry => {
            hookEntries.push(entry.state);
        });

        await db.saveChanges();
        expect(hookEntries).toContain('Modified');
    });

    // -------------------------------------------------------------------------
    // reload
    // -------------------------------------------------------------------------

    it('reload() refreshes entity values from DB', async () => {
        mock.responses.push([
            { id: 1, email_address: 'new@b', name: 'Refreshed' }
        ]);

        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        user.name = 'Dirty'; // simulate dirty state

        await db.reload(user);

        expect(user.name).toBe('Refreshed');
        // After reload the snapshot is fresh, so entry is Unchanged.
        expect(db.entry(user).state).toBe('Unchanged');
        expect(db.entry(user).isModified()).toBe(false);
    });

    it('reload() refreshes rowVersion snapshotValue', async () => {
        mock.responses.push([{ id: 1, name: 'Original', version: 7 }]);

        const db = createDb(
            mock.knex,
            { versioned: VersionedEntity },
            { tracking: true }
        );
        const entity = { id: 1, name: 'Original', version: 5 };
        db.attach('versioned', entity);

        await db.reload(entity);

        expect(entity.version).toBe(7);
        expect(db.entry(entity).state).toBe('Unchanged');
    });

    // -------------------------------------------------------------------------
    // Symbol.asyncDispose
    // -------------------------------------------------------------------------

    it('[Symbol.asyncDispose]() is a no-op when there are no pending changes', async () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        // No mutations → dispose should not throw.
        await expect(db[Symbol.asyncDispose]()).resolves.toBeUndefined();
    });

    it('[Symbol.asyncDispose]() throws PendingChangesError when dirty entries exist', async () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        user.name = 'Dirty';

        await expect(db[Symbol.asyncDispose]()).rejects.toBeInstanceOf(
            PendingChangesError
        );
    });

    it('[Symbol.asyncDispose]() clears tracker even when it throws', async () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b', name: 'A' };
        db.attach('users', user);
        user.name = 'Dirty';

        await expect(db[Symbol.asyncDispose]()).rejects.toBeInstanceOf(
            PendingChangesError
        );
        // After dispose, entry should no longer be tracked.
        expect(() => db.entry(user)).toThrow(/not tracked/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// New error classes
// ═══════════════════════════════════════════════════════════════════════════

describe('ConcurrencyError', () => {
    it('extends Error with typed fields', () => {
        const e = new ConcurrencyError('users', 1, 42);
        expect(e).toBeInstanceOf(Error);
        expect(e.name).toBe('ConcurrencyError');
        expect(e.entity).toBe('users');
        expect(e.pk).toBe(1);
        expect(e.expected).toBe(42);
        expect(e.message).toContain('users');
        expect(e.message).toContain('42');
    });
});

describe('InvariantViolationError', () => {
    it('extends Error with typed fields', () => {
        const e = new InvariantViolationError('todos', 5, 'id', 'PK changed');
        expect(e).toBeInstanceOf(Error);
        expect(e.name).toBe('InvariantViolationError');
        expect(e.entity).toBe('todos');
        expect(e.pk).toBe(5);
        expect(e.field).toBe('id');
        expect(e.message).toContain('PK changed');
    });
});

describe('PendingChangesError', () => {
    it('extends Error with pendingCount field', () => {
        const e = new PendingChangesError(3, '(3 Modified)');
        expect(e).toBeInstanceOf(Error);
        expect(e.name).toBe('PendingChangesError');
        expect(e.pendingCount).toBe(3);
        expect(e.message).toContain('3');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — withTransaction / transaction (dbcontext.ts lines 195–206)
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — withTransaction / transaction', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('withTransaction returns a new tracked context bound to the transaction', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const trxDb = db.withTransaction(
            mock.knex as unknown as KnexT.Transaction
        );
        expect(trxDb).not.toBe(db);
        expect(trxDb.users.entity).toBe(UserEntity);
    });

    it('transaction() on a tracked context runs the callback inside knex.transaction', async () => {
        const fakeTrx = { __isTrx: true } as unknown as KnexT.Transaction;
        const txSpy = vi
            .spyOn(mock.knex, 'transaction')
            .mockImplementation(((cb: any) => cb(fakeTrx)) as any);

        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const cb = vi.fn(async (innerDb: any) => {
            expect(innerDb.users.entity).toBe(UserEntity);
            return 'ok';
        });
        const result = await db.transaction(cb);
        expect(result).toBe('ok');
        expect(txSpy).toHaveBeenCalledOnce();
        expect(cb).toHaveBeenCalledOnce();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — rowVersion snapshot refresh (change-tracker.ts 852, 864)
// ═══════════════════════════════════════════════════════════════════════════

const VersionedSchema = object({
    id: number().primaryKey(),
    name: string(),
    version: number().rowVersion()
}).hasTableName('versioned');
const VersionedEntity = defineEntity(VersionedSchema);

describe('Tracked DbContext — rowVersion snapshot refresh', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('saveChanges() refreshes rowVersion.snapshotValue on an Added entity after INSERT (line 852)', async () => {
        stubTransaction();
        // The INSERT returns a row with generated id and initial version.
        mock.responses.push([{ id: 7, name: 'Test', version: 1 }]);

        const db = createDb(
            mock.knex,
            { versioned: VersionedEntity },
            { tracking: true }
        );
        // No `id` → goes into addedWithoutPk with rowVersion tracked.
        const entity = { name: 'Test' } as any;
        db.attach('versioned', entity);

        const result = await db.saveChanges();
        expect(result.inserted).toBe(1);

        // The INSERT result propagated id and version back to the entity.
        expect(entity.id).toBe(7);
        expect(entity.version).toBe(1);

        // Entry is now Unchanged; a second saveChanges() emits no SQL.
        expect(db.entry(entity).state).toBe('Unchanged');
        const result2 = await db.saveChanges();
        expect(result2.inserted).toBe(0);
        expect(result2.updated).toBe(0);
    });

    it('saveChanges() increments rowVersion and refreshes snapshot on a Modified entity (line 864)', async () => {
        stubTransaction();
        // Stub the UPDATE response (rowCount = 1).
        mock.responses.push([]);

        const db = createDb(
            mock.knex,
            { versioned: VersionedEntity },
            { tracking: true }
        );
        const entity = { id: 3, name: 'Original', version: 0 };
        db.attach('versioned', entity);

        // Mutate a non-PK field → isDirty triggers the UPDATE path.
        entity.name = 'Updated';

        const result = await db.saveChanges();
        expect(result.updated).toBe(1);

        // The ORM increments the version by 1 in-place on the entity.
        expect(entity.version).toBe(1);

        // Snapshot refreshed → a second saveChanges() emits no UPDATE.
        const result2 = await db.saveChanges();
        expect(result2.updated).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — entities without PK, clear() (change-tracker.ts 912)
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — Added-without-PK and clear()', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('[Symbol.asyncDispose]() clears addedWithoutPk entries and removes tracker symbol (line 912)', async () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        // Entity with no `id` → goes to addedWithoutPk.
        const newUser = { email: 'no-pk@test.com', name: 'New' } as any;
        db.attach('users', newUser);

        // Dispose must throw because addedWithoutPk.size > 0.
        await expect(db[Symbol.asyncDispose]()).rejects.toBeInstanceOf(
            PendingChangesError
        );

        // After clear(), the tracker symbol is stripped → entry() throws.
        expect(() => db.entry(newUser)).toThrow(/not tracked/i);
    });

    it('discardChanges() clears addedWithoutPk entries', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const newUser = { email: 'no-pk@test.com', name: 'New' } as any;
        db.attach('users', newUser);

        db.discardChanges();

        // Entity no longer tracked.
        expect(() => db.entry(newUser)).toThrow(/not tracked/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — polymorphic entity (resolveVariantKey, line 938)
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — polymorphic entity attachment', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('attaches a polymorphic entity and reads discriminator for variantKey (line 938)', () => {
        const db = createDb(
            mock.knex,
            { activities: ActivityEntitySTI },
            { tracking: true }
        );
        const row = {
            id: 5,
            type: 'assigned',
            todoId: 10,
            userId: 1,
            assigneeId: 2
        };
        db.attach('activities', row);
        const entry = db.entry(row);
        expect(entry.state).toBe('Unchanged');

        // Mutation to non-discriminator field is tracked.
        (row as any).assigneeId = 99;
        expect(entry.isModified('assigneeId' as any)).toBe(true);
    });

    it('saveChanges() throws InvariantViolationError when discriminator is mutated', async () => {
        const db = createDb(
            mock.knex,
            { activities: ActivityEntitySTI },
            { tracking: true }
        );
        const row = { id: 5, type: 'assigned', todoId: 10, userId: 1 };
        db.attach('activities', row);

        // Mutate the discriminator (forbidden).
        (row as any).type = 'commented';

        await expect(db.saveChanges()).rejects.toBeInstanceOf(
            InvariantViolationError
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// save-graph — belongsToMany error paths
// ═══════════════════════════════════════════════════════════════════════════

describe('DbSet.save — belongsToMany error paths', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('throws when a non-array is passed for a belongsToMany relation', async () => {
        stubTransaction();
        // Root entity update response (save sees PK present → UPDATE path).
        mock.responses.push([{ id: 1, title: 'T', user_id: 1 }]);
        const db = createDb(mock.knex, { todos: TodoWithTagsEntity });
        await expect(
            db.todos.save({
                id: 1,
                title: 'T',
                userId: 1,
                tags: 'not-an-array' as any
            })
        ).rejects.toThrow(/expects an array/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — insertVariant attaches result (dbset.ts line 718)
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — insertVariant tracking', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('insertVariant in a tracked context attaches the result to the identity map (line 718)', async () => {
        stubTransaction();
        mock.responses.push([
            {
                id: 1,
                type: 'assigned',
                todo_id: 42,
                user_id: 1,
                assignee_id: 9
            }
        ]);

        const db = createDb(
            mock.knex,
            { activities: ActivityEntitySTI },
            { tracking: true }
        );
        const result = await db.activities.ofVariant('assigned').insert({
            todoId: 42,
            userId: 1,
            assigneeId: 9
        });

        // The result should be tracked by the identity map.
        const entry = db.entry(result as object);
        expect(entry.state).toBe('Unchanged');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — first() single result is attached (dbset.ts line 481)
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — first() single result onResults (line 481)', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('first() in a tracked context attaches the resolved single object', async () => {
        mock.responses.push([{ id: 2, email_address: 'b@b', name: 'Bob' }]);

        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        // Call first() directly (not via find) to exercise the single-object path.
        const user = await db.users.where(t => t.id, 2).first();

        expect(user).toBeDefined();
        // The returned object should be in the identity map.
        const entry = db.entry(user as object);
        expect(entry.state).toBe('Unchanged');
        // Mutating it marks it as modified.
        (user as any).name = 'BobChanged';
        expect(entry.isModified('name' as any)).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — reload() early returns (change-tracker.ts ~491-499)
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — reload() early returns', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('reload() is a no-op for an untracked entity', async () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const untracked = { id: 99, email: 'x@y.com', name: 'X' };
        // Should not throw and should not emit any SQL.
        await db.reload(untracked);
        expect(mock.captured).toHaveLength(0);
    });

    it('reload() is a no-op for an entity with no PK columns on its schema', async () => {
        const db = createDb(
            mock.knex,
            { auditLogs: AuditLogEntity },
            { tracking: true }
        );
        const entry = { message: 'test', at: new Date() } as any;
        // AuditLogSchema has no PK columns → pkInfo.propertyKeys.length === 0 → early return
        db.attach('auditLogs', entry);
        await db.reload(entry);
        expect(mock.captured).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — attach() same-object snapshot refresh (change-tracker.ts ~335)
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — attach() same-object snapshot refresh', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('re-attaching the same object reference refreshes its snapshot', () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b.com', name: 'Alice' };
        db.attach('users', user);

        // Dirty the entity.
        user.name = 'Dirty';
        expect(db.entry(user).isModified('name' as any)).toBe(true);

        // Re-attach the same JS reference — should refresh snapshot to current values.
        db.attach('users', user);
        expect(db.entry(user).isModified('name' as any)).toBe(false);
        expect(db.entry(user).state).toBe('Unchanged');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — rowVersion 'manual' strategy (change-tracker.ts ~758)
// ═══════════════════════════════════════════════════════════════════════════

const ManualVersionSchema = object({
    id: number().primaryKey(),
    name: string(),
    etag: string().rowVersion()
}).hasTableName('manual_versioned');
const ManualVersionEntity = defineEntity(ManualVersionSchema);

describe('Tracked DbContext — rowVersion manual strategy', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('saveChanges() uses the caller-supplied new etag value in the UPDATE (manual strategy)', async () => {
        stubTransaction();
        // UPDATE response (1 row updated).
        mock.responses.push([{ id: 1, name: 'Updated', etag: 'v2' }]);

        const db = createDb(
            mock.knex,
            { items: ManualVersionEntity },
            { tracking: true }
        );
        const item = { id: 1, name: 'Original', etag: 'v1' };
        db.attach('items', item);

        // Caller sets the new version and mutates the name.
        item.name = 'Updated';
        item.etag = 'v2';

        const result = await db.saveChanges();
        expect(result.updated).toBe(1);

        // The UPDATE SQL should include WHERE etag = 'v1' (snapshot) and SET etag = 'v2'.
        const updateQuery = mock.captured.find(q => q.method === 'update');
        expect(updateQuery).toBeDefined();
        expect(updateQuery!.bindings).toContain('v1'); // WHERE old etag value
        expect(updateQuery!.bindings).toContain('v2'); // SET new etag value
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — ConcurrencyError on 0 rows updated (change-tracker.ts ~793)
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — ConcurrencyError on stale rowVersion', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransactionWithZeroUpdate(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
        // Make all UPDATE queries return 0 (simulate rowVersion conflict).
        const client = mock.knex.client as any;
        const origProcess = client.processResponse.bind(client);
        client.processResponse = (resp: any, runner: any) => {
            if (runner?.builder?._method === 'update') return 0;
            return origProcess(resp, runner);
        };
    }

    it('saveChanges() throws ConcurrencyError when UPDATE affects 0 rows', async () => {
        stubTransactionWithZeroUpdate();
        mock.responses.push([]); // UPDATE response (0 rows via processResponse override)

        const db = createDb(
            mock.knex,
            { versioned: VersionedEntity },
            { tracking: true }
        );
        const entity = { id: 1, name: 'Original', version: 5 };
        db.attach('versioned', entity);

        entity.name = 'Modified';

        await expect(db.saveChanges()).rejects.toBeInstanceOf(ConcurrencyError);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — pendingSummary() Modified/Deleted counts (change-tracker.ts ~907)
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — pendingSummary() branch coverage', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    it('PendingChangesError message reflects silently-mutated Modified entries', async () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 1, email: 'a@b.com', name: 'Alice' };
        db.attach('users', user);

        // Silently mutate (no explicit state change — isDirty triggers Modified count).
        user.name = 'Changed';

        const err = await db[Symbol.asyncDispose]().catch(e => e);
        expect(err).toBeInstanceOf(PendingChangesError);
        expect(err.message).toMatch(/Modified/i);
    });

    it('PendingChangesError message reflects Deleted entries', async () => {
        const db = createDb(
            mock.knex,
            { users: UserEntity },
            { tracking: true }
        );
        const user = { id: 2, email: 'b@c.com', name: 'Bob' };
        db.attach('users', user);

        db.remove(user);

        const err = await db[Symbol.asyncDispose]().catch(e => e);
        expect(err).toBeInstanceOf(PendingChangesError);
        expect(err.message).toMatch(/Deleted/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracked DbContext — timestamp rowVersion and DELETE with rowVersion
// ═══════════════════════════════════════════════════════════════════════════

const TimestampVersionSchema = object({
    id: number().primaryKey(),
    name: string(),
    updatedAt: date().rowVersion()
}).hasTableName('ts_versioned');
const TimestampVersionEntity = defineEntity(TimestampVersionSchema);

describe('Tracked DbContext — timestamp rowVersion strategy', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('saveChanges() sets updatedAt to a new Date on UPDATE (timestamp strategy)', async () => {
        stubTransaction();
        mock.responses.push([
            { id: 1, name: 'Updated', updated_at: new Date() }
        ]);

        const db = createDb(
            mock.knex,
            { items: TimestampVersionEntity },
            { tracking: true }
        );
        const entity = {
            id: 1,
            name: 'Original',
            updatedAt: new Date('2020-01-01')
        };
        db.attach('items', entity);

        entity.name = 'Updated';

        const result = await db.saveChanges();
        expect(result.updated).toBe(1);

        // The updatedAt should be a new Date (auto-set by timestamp strategy)
        expect(entity.updatedAt).toBeInstanceOf(Date);
        expect(entity.updatedAt.getTime()).toBeGreaterThan(
            new Date('2020-01-01').getTime()
        );
    });
});

describe('Tracked DbContext — DELETE with rowVersion WHERE clause', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('saveChanges() includes rowVersion in DELETE WHERE clause', async () => {
        stubTransaction();
        // Response with rowCount=1 (1 row deleted)
        mock.responses.push([{ id: 1 }]);

        const db = createDb(
            mock.knex,
            { versioned: VersionedEntity },
            { tracking: true }
        );
        const entity = { id: 1, name: 'ToDelete', version: 3 };
        db.attach('versioned', entity);
        db.remove(entity);

        const result = await db.saveChanges();
        expect(result.deleted).toBe(1);

        // The DELETE query should include the rowVersion column in WHERE
        const deleteQuery = mock.captured.find(q => q.method === 'del');
        expect(deleteQuery).toBeDefined();
        // bindings should include the version snapshot value (3)
        expect(deleteQuery!.bindings).toContain(3);
    });

    it('saveChanges() throws ConcurrencyError when DELETE affects 0 rows due to stale rowVersion', async () => {
        stubTransaction();
        // Empty response → rowCount=0 → ConcurrencyError
        mock.responses.push([]);

        const db = createDb(
            mock.knex,
            { versioned: VersionedEntity },
            { tracking: true }
        );
        const entity = { id: 1, name: 'ToDelete', version: 5 };
        db.attach('versioned', entity);
        db.remove(entity);

        await expect(db.saveChanges()).rejects.toBeInstanceOf(ConcurrencyError);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// change-tracker.ts line 584-585: already-Modified entry path
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — explicit Modified state re-save', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('second saveChanges() after ConcurrencyError takes the already-Modified path', async () => {
        // First save: UPDATE returns 0 → ConcurrencyError, entity stays Modified
        // Second save: returns 1 → succeeds, taking the already-Modified branch (lines 584-585)
        const client = mock.knex.client as any;
        let callCount = 0;
        const origProcess = client.processResponse.bind(client);
        client.processResponse = (resp: any, runner: any) => {
            if (runner?.builder?._method === 'update') {
                callCount++;
                return callCount === 1 ? 0 : 1;
            }
            return origProcess(resp, runner);
        };

        stubTransaction();
        mock.responses.push([]);

        const db = createDb(
            mock.knex,
            { versioned: VersionedEntity },
            { tracking: true }
        );
        const entity = { id: 1, name: 'Original', version: 5 };
        db.attach('versioned', entity);
        entity.name = 'Changed';

        // First save fails → entity retains Modified state
        await expect(db.saveChanges()).rejects.toBeInstanceOf(ConcurrencyError);

        stubTransaction();
        mock.responses.push([{ id: 1, name: 'Changed', version: 6 }]);

        // Second save: entity is already Modified → hits lines 584-585
        const result = await db.saveChanges();
        expect(result.updated).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// change-tracker.ts line 740: new property added to entity after attach
// ═══════════════════════════════════════════════════════════════════════════

describe('Tracked DbContext — new property added after attach', () => {
    let mock: MockKnex;
    beforeEach(() => {
        mock = makeMockKnex();
    });
    afterEach(async () => {
        await mock.knex.destroy();
    });

    function stubTransaction(): void {
        vi.spyOn(mock.knex, 'transaction').mockImplementation((async (
            cb: any
        ) => cb(mock.knex)) as any);
    }

    it('saveChanges() includes new properties not in original snapshot in UPDATE', async () => {
        stubTransaction();
        mock.responses.push([{ id: 1 }]);

        const db = createDb(
            mock.knex,
            { users: defineEntity(UserSchema) },
            { tracking: true }
        );
        const entity: Record<string, unknown> = {
            id: 1,
            email: 'a@b.com',
            name: 'Alice'
        };
        db.attach('users', entity as any);

        // Mutate existing field so entity is dirty
        entity.name = 'Bob';
        // Add new property not present in original snapshot (covers line 740)
        entity.extra = 'value';

        const result = await db.saveChanges();
        expect(result.updated).toBe(1);

        const updateQuery = mock.captured.find(q => q.method === 'update');
        expect(updateQuery).toBeDefined();
        // The 'extra' field should be included in UPDATE bindings
        expect(updateQuery!.bindings).toContain('value');
    });
});
