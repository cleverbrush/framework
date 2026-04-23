// @cleverbrush/orm-cli — migrate generate command

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateMigrationsForContext } from '@cleverbrush/knex-schema';
import type { OrmCliConfig } from '../types.js';

/**
 * Diff the live database against all registered entity schemas and write a
 * single timestamped TypeScript migration file when changes are detected.
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
    const entities = Object.values(config.entities);

    console.log('Comparing schema against database…');
    const result = await generateMigrationsForContext(entities, config.knex);

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
