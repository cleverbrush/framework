// Tests for snapshot-based migration primitives:
// entitySchemaToTableState, generateMigrationsForContext (offline),
// loadSnapshot, writeSnapshot, entitiesToSnapshot.
//
// All tests are pure (no live DB connection).

import { mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { defineEntity } from './entity.js';
import { boolean, number, object, string } from './extension.js';
import {
    entitySchemaToTableState,
    generateMigrationsForContext
} from './migration.js';
import { entitiesToSnapshot, loadSnapshot, writeSnapshot } from './snapshot.js';

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const UserSchema = object({
    id: number().primaryKey({ autoIncrement: true }),
    email: string().hasColumnName('email_address'),
    name: string(),
    active: boolean().optional()
}).hasTableName('users');

const PostSchema = object({
    id: number().primaryKey({ autoIncrement: true }),
    title: string(),
    userId: number()
        .hasColumnName('user_id')
        .references('users', 'id')
        .onDelete('CASCADE')
}).hasTableName('posts');

const UserEntity = defineEntity(UserSchema);
const PostEntity = defineEntity(PostSchema);

// ---------------------------------------------------------------------------
// entitySchemaToTableState
// ---------------------------------------------------------------------------

describe('entitySchemaToTableState', () => {
    it('includes all schema columns', () => {
        const state = entitySchemaToTableState(UserSchema);
        expect(Object.keys(state.columns)).toContain('id');
        expect(Object.keys(state.columns)).toContain('email_address');
        expect(Object.keys(state.columns)).toContain('name');
        expect(Object.keys(state.columns)).toContain('active');
    });

    it('marks optional columns as nullable', () => {
        const state = entitySchemaToTableState(UserSchema);
        expect(state.columns['active'].nullable).toBe(true);
        expect(state.columns['name'].nullable).toBe(false);
    });

    it('records foreign key relationships', () => {
        const state = entitySchemaToTableState(PostSchema);
        const fk = state.foreignKeys.find(f => f.columnName === 'user_id');
        expect(fk).toBeDefined();
        expect(fk!.foreignTable).toBe('users');
        expect(fk!.foreignColumn).toBe('id');
        expect(fk!.deleteRule).toBe('CASCADE');
    });

    it('uses Knex FK constraint naming convention', () => {
        const state = entitySchemaToTableState(PostSchema);
        const fk = state.foreignKeys.find(f => f.columnName === 'user_id');
        expect(fk!.constraintName).toBe('posts_user_id_foreign');
    });

    it('returns empty foreignKeys for schemas with no references', () => {
        const state = entitySchemaToTableState(UserSchema);
        expect(state.foreignKeys).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// generateMigrationsForContext — offline (snapshot-based)
// ---------------------------------------------------------------------------

describe('generateMigrationsForContext (snapshot-based)', () => {
    it('produces CREATE TABLE for all tables on empty snapshot', () => {
        const result = generateMigrationsForContext([UserEntity, PostEntity], {
            version: 1,
            tables: {}
        });

        expect(result.isEmpty).toBe(false);
        expect(result.up).toContain("createTable('users'");
        expect(result.up).toContain("createTable('posts'");
        expect(result.full).toContain("import type { Knex } from 'knex'");
        expect(result.full).toContain('export async function up');
        expect(result.full).toContain('export async function down');
    });

    it('orders parent tables before child tables (topological sort)', () => {
        const result = generateMigrationsForContext(
            [PostEntity, UserEntity], // reversed input order
            { version: 1, tables: {} }
        );

        // users (no FK deps) must appear before posts (FK → users) in up
        const usersIdx = result.up.indexOf("createTable('users'");
        const postsIdx = result.up.indexOf("createTable('posts'");
        expect(usersIdx).toBeLessThan(postsIdx);
    });

    it('returns isEmpty:true when snapshot matches current entities', () => {
        // First generate to get the snapshot
        const { nextSnapshot } = generateMigrationsForContext([UserEntity], {
            version: 1,
            tables: {}
        });

        // Second run against the produced snapshot — no changes
        const result = generateMigrationsForContext([UserEntity], nextSnapshot);
        expect(result.isEmpty).toBe(true);
    });

    it('emits ALTER TABLE when a column is added', () => {
        const { nextSnapshot } = generateMigrationsForContext([UserEntity], {
            version: 1,
            tables: {}
        });

        const UserSchemaV2 = object({
            id: number().primaryKey({ autoIncrement: true }),
            email: string().hasColumnName('email_address'),
            name: string(),
            active: boolean().optional(),
            bio: string().optional() // new column
        }).hasTableName('users');

        const UserEntityV2 = defineEntity(UserSchemaV2);
        const result = generateMigrationsForContext(
            [UserEntityV2],
            nextSnapshot
        );

        expect(result.isEmpty).toBe(false);
        expect(result.up).toContain("alterTable('users'");
        expect(result.up).toContain("'bio'");
    });

    it('emits DROP TABLE for removed entities', () => {
        const { nextSnapshot } = generateMigrationsForContext(
            [UserEntity, PostEntity],
            { version: 1, tables: {} }
        );

        // Remove posts entity
        const result = generateMigrationsForContext([UserEntity], nextSnapshot);

        expect(result.isEmpty).toBe(false);
        expect(result.up).toContain('dropTableIfExists("posts"');
        expect(result.down).toContain('createTable("posts"');
    });

    it('returns nextSnapshot reflecting current entities', () => {
        const result = generateMigrationsForContext([UserEntity], {
            version: 1,
            tables: {}
        });

        expect(result.nextSnapshot.version).toBe(1);
        expect(result.nextSnapshot.tables['users']).toBeDefined();
        expect(result.nextSnapshot.tables['posts']).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// entitiesToSnapshot
// ---------------------------------------------------------------------------

describe('entitiesToSnapshot', () => {
    it('produces a snapshot with one entry per entity', () => {
        const snap = entitiesToSnapshot([UserEntity, PostEntity]);
        expect(snap.version).toBe(1);
        expect(Object.keys(snap.tables)).toContain('users');
        expect(Object.keys(snap.tables)).toContain('posts');
    });

    it('returns empty tables for empty entity list', () => {
        const snap = entitiesToSnapshot([]);
        expect(Object.keys(snap.tables)).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// loadSnapshot / writeSnapshot round-trip
// ---------------------------------------------------------------------------

describe('loadSnapshot / writeSnapshot', () => {
    let tmpDir: string;

    beforeAll(() => {
        tmpDir = path.join(os.tmpdir(), `snap-test-${Date.now()}`);
        mkdirSync(tmpDir, { recursive: true });
    });

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns empty snapshot when file does not exist', () => {
        const snap = loadSnapshot(path.join(tmpDir, 'nonexistent.json'));
        expect(snap.version).toBe(1);
        expect(snap.tables).toEqual({});
    });

    it('round-trips write then load', () => {
        const original = entitiesToSnapshot([UserEntity, PostEntity]);
        const p = path.join(tmpDir, 'snapshot.json');
        writeSnapshot(p, original);

        const loaded = loadSnapshot(p);
        expect(loaded.version).toBe(1);
        expect(Object.keys(loaded.tables)).toContain('users');
        expect(Object.keys(loaded.tables)).toContain('posts');
        // Column data preserved
        expect(loaded.tables['users'].columns['email_address']).toBeDefined();
    });

    it('writes with deterministic (sorted) key order', async () => {
        const snap = entitiesToSnapshot([PostEntity, UserEntity]); // posts first
        const p = path.join(tmpDir, 'sorted.json');
        writeSnapshot(p, snap);

        const { readFileSync } = await import('node:fs');
        const raw = readFileSync(p, 'utf-8');
        const postsPos = raw.indexOf('"posts"');
        const usersPos = raw.indexOf('"users"');
        // Alphabetically posts < users
        expect(postsPos).toBeLessThan(usersPos);
    });
});
