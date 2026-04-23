// @cleverbrush/knex-schema — Schema snapshot serialization

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Entity } from './entity.js';
import { getPolymorphicVariantSchemas, getTableName } from './extension.js';
import { entitySchemaToTableState } from './migration.js';
import type { SchemaSnapshot } from './types.js';

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Build a {@link SchemaSnapshot} from a set of entities without a live DB.
 *
 * Handles polymorphic (CTI) entities by including each variant table.
 * Deduplicates tables so STI variants sharing a base table are only included
 * once.
 *
 * @param entities - The entities from your `EntityMap`.
 * @returns A snapshot reflecting the current code-first schema state.
 *
 * @example
 * ```ts
 * const snapshot = entitiesToSnapshot(Object.values(entityMap));
 * writeSnapshot('./migrations/snapshot.json', snapshot);
 * ```
 */
export function entitiesToSnapshot(
    entities: Entity<any, any>[]
): SchemaSnapshot {
    const tables: SchemaSnapshot['tables'] = {};

    for (const entity of entities) {
        const schema = entity.schema;
        const tableName = getTableName(schema);
        if (!tables[tableName]) {
            tables[tableName] = entitySchemaToTableState(schema);
        }

        for (const vs of getPolymorphicVariantSchemas(schema)) {
            const variantTableName = vs.getExtension('tableName') as
                | string
                | undefined;
            if (variantTableName && !tables[variantTableName]) {
                tables[variantTableName] = entitySchemaToTableState(vs);
            }
        }
    }

    return { version: 1, tables };
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

/**
 * Load a {@link SchemaSnapshot} from disk.
 *
 * Returns an empty snapshot (no tables) when the file does not exist — this
 * is the "first run" case, which causes `migrate generate` to emit a single
 * migration containing `CREATE TABLE` for every entity.
 *
 * @param snapshotPath - Absolute or cwd-relative path to `snapshot.json`.
 * @returns The parsed snapshot, or `{ version: 1, tables: {} }` if missing or
 *   unreadable.
 */
export function loadSnapshot(snapshotPath: string): SchemaSnapshot {
    try {
        const raw = readFileSync(resolve(snapshotPath), 'utf-8');
        const parsed = JSON.parse(raw) as SchemaSnapshot;
        if (parsed.version !== 1 || typeof parsed.tables !== 'object') {
            return { version: 1, tables: {} };
        }
        return parsed;
    } catch {
        return { version: 1, tables: {} };
    }
}

/**
 * Write a {@link SchemaSnapshot} to disk atomically (temp-file + rename) with
 * deterministic key ordering so diffs in version control are minimal.
 *
 * @param snapshotPath - Absolute or cwd-relative path to write `snapshot.json`.
 * @param snapshot - The snapshot to serialize.
 */
export function writeSnapshot(
    snapshotPath: string,
    snapshot: SchemaSnapshot
): void {
    const absPath = resolve(snapshotPath);
    const tmp = absPath + '.tmp';
    writeFileSync(
        tmp,
        JSON.stringify(_sortSnapshot(snapshot), null, 2) + '\n',
        'utf-8'
    );
    renameSync(tmp, absPath);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** @internal Sort all keys in the snapshot for deterministic JSON output. */
function _sortSnapshot(snapshot: SchemaSnapshot): SchemaSnapshot {
    const sortedTables: SchemaSnapshot['tables'] = {};
    for (const tableName of Object.keys(snapshot.tables).sort()) {
        const state = snapshot.tables[tableName];
        sortedTables[tableName] = {
            columns: Object.fromEntries(
                Object.entries(state.columns).sort(([a], [b]) =>
                    a.localeCompare(b)
                )
            ),
            indexes: [...state.indexes].sort((a, b) =>
                a.name.localeCompare(b.name)
            ),
            foreignKeys: [...state.foreignKeys].sort((a, b) =>
                a.constraintName.localeCompare(b.constraintName)
            ),
            checks: [...state.checks].sort((a, b) =>
                a.name.localeCompare(b.name)
            )
        };
    }
    return { version: 1, tables: sortedTables };
}
