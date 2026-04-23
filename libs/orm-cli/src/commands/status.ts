// @cleverbrush/orm-cli — migrate status command

import type { OrmCliConfig } from '../types.js';
import { buildMigrationConfig } from './run.js';

/**
 * List applied and pending migrations in a two-column display.
 */
export async function status(
    config: OrmCliConfig,
    flags: Record<string, string | true>
): Promise<void> {
    const migrationConfig = buildMigrationConfig(config, flags);

    const [completed, pending] =
        await config.knex.migrate.list(migrationConfig);

    if ((completed as any[]).length === 0 && (pending as any[]).length === 0) {
        console.log('No migrations found in the configured directory.');
        return;
    }

    if ((completed as any[]).length > 0) {
        console.log('\nApplied migrations:');
        for (const m of completed as any[]) {
            const name = typeof m === 'string' ? m : (m.name ?? m.file ?? m);
            console.log(`  ✓ ${name}`);
        }
    }

    if ((pending as any[]).length > 0) {
        console.log('\nPending migrations:');
        for (const m of pending as any[]) {
            const name = typeof m === 'string' ? m : (m.file ?? m.name ?? m);
            console.log(`  ○ ${name}`);
        }
    } else {
        console.log('\nDatabase is up to date.');
    }
}
