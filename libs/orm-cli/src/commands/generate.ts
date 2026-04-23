// @cleverbrush/orm-cli — migrate generate command

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
    generateMigrationsForContext,
    loadSnapshot,
    writeSnapshot
} from '@cleverbrush/knex-schema';
import type { OrmCliConfig } from '../types.js';

/**
 * Diff the current entity schemas against the committed snapshot and write a
 * single timestamped TypeScript migration file when changes are detected.
 * Also updates the snapshot file so the next run starts from the new baseline.
 *
 * No live database connection is needed — the snapshot is the source of truth.
 *
 * File name pattern: `YYYYMMDDHHmmss_<name>.ts`  (matches Knex defaults).
 */
export async function generate(
    name: string,
    config: OrmCliConfig,
    flags: Record<string, string | true>
): Promise<void> {
    const dir =
        (flags['--dir'] as string | undefined) ?? config.migrations.directory;
    const absDir = path.resolve(process.cwd(), dir);
    const snapshotPath =
        config.migrations.snapshot ?? path.join(absDir, 'snapshot.json');
    const absSnapshotPath = path.resolve(process.cwd(), snapshotPath);

    const entities = Object.values(config.entities);

    const prevSnapshot = loadSnapshot(absSnapshotPath);
    const result = generateMigrationsForContext(entities, prevSnapshot);

    if (result.isEmpty) {
        console.log('No schema changes detected.');
        return;
    }

    mkdirSync(absDir, { recursive: true });

    const timestamp = formatTimestamp(new Date());
    const safeName = name.replace(/[^a-z0-9_]/gi, '_');
    const filename = `${timestamp}_${safeName}.ts`;
    const filepath = path.join(absDir, filename);

    writeFileSync(filepath, result.full, 'utf-8');
    console.log(`Created migration: ${filepath}`);

    writeSnapshot(absSnapshotPath, result.nextSnapshot);
    console.log(`Updated snapshot: ${absSnapshotPath}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return (
        `${d.getFullYear()}` +
        `${p(d.getMonth() + 1)}` +
        `${p(d.getDate())}` +
        `${p(d.getHours())}` +
        `${p(d.getMinutes())}` +
        `${p(d.getSeconds())}`
    );
}
