// Tests for newly added APIs: getPrimaryKeyColumns, .select(selector),
// bulkInsert / bulkUpdate / bulkUpsert. SQL-level snapshots only — no real
// DB roundtrip (Knex 'pg' client is constructed without a connection).

import Knex from 'knex';
import { afterAll, describe, expect, it } from 'vitest';
import {
    getPrimaryKeyColumns,
    number,
    object,
    query,
    string
} from './index.js';

const knex = Knex({ client: 'pg' });

afterAll(async () => {
    await knex.destroy();
});

const User = object({
    id: number().primaryKey(),
    email: string().hasColumnName('email_address'),
    name: string()
}).hasTableName('users');

const PostTag = object({
    postId: number().hasColumnName('post_id'),
    tagId: number().hasColumnName('tag_id'),
    addedAt: string().hasColumnName('added_at').optional()
})
    .hasTableName('post_tags')
    .hasPrimaryKey(['post_id', 'tag_id']);

// ═══════════════════════════════════════════════════════════════════════════
describe('getPrimaryKeyColumns', () => {
    it('resolves a single-column primary key', () => {
        const pk = getPrimaryKeyColumns(User);
        expect(pk.propertyKeys).toEqual(['id']);
        expect(pk.columnNames).toEqual(['id']);
    });

    it('resolves a composite primary key (column-name entries)', () => {
        const pk = getPrimaryKeyColumns(PostTag);
        expect(pk.columnNames).toEqual(['post_id', 'tag_id']);
        expect(pk.propertyKeys).toEqual(['postId', 'tagId']);
    });

    it('returns empty arrays when no primary key is declared', () => {
        const NoPk = object({
            a: string(),
            b: string()
        }).hasTableName('no_pk');
        const pk = getPrimaryKeyColumns(NoPk);
        expect(pk.propertyKeys).toEqual([]);
        expect(pk.columnNames).toEqual([]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('SchemaQueryBuilder.select(selector) — DTO projection', () => {
    it('emits aliased SQL for a record of descriptors', () => {
        const sql = query(knex, User)
            .select(t => ({ id: t.id, n: t.name, mail: t.email }))
            .toQuery();
        // Knex aliases each entry as `?? AS ??`. Order of keys in `select`
        // is preserved.
        expect(sql).toContain('"id" as "id"');
        expect(sql).toContain('"name" as "n"');
        expect(sql).toContain('"email_address" as "mail"');
        expect(sql).toContain('from "users"');
    });

    it('throws when an alias value is not a property descriptor', () => {
        expect(() =>
            query(knex, User).select(_t => ({
                bogus: 'not-a-descriptor' as any
            }))
        ).toThrow(/property descriptor/);
    });

    it('still supports the existing column-list overload', () => {
        const sql = query(knex, User).select('id', 'name').toQuery();
        expect(sql).toContain('select "id", "name"');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('SchemaQueryBuilder.bulkInsert', () => {
    it('returns [] for an empty input without hitting the database', async () => {
        const result = await query(knex, User).bulkInsert([]);
        expect(result).toEqual([]);
    });

    it('rejects onConflict without conflictColumns', async () => {
        await expect(
            query(knex, User).bulkInsert([{ id: 1, email: 'a@x', name: 'A' }], {
                onConflict: 'merge' as const
            })
        ).rejects.toThrow(/conflictColumns/);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('SchemaQueryBuilder.bulkUpdate', () => {
    it('returns 0 for an empty input', async () => {
        const n = await query(knex, User).bulkUpdate([]);
        expect(n).toBe(0);
    });

    it('throws when an entry omits the primary key', async () => {
        await expect(
            query(knex, User).bulkUpdate([{ where: {}, set: { name: 'x' } }])
        ).rejects.toThrow(/primary key/);
    });
});
