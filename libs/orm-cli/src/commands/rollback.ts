// @cleverbrush/orm-cli — migrate rollback command

import type { OrmCliConfig } from '../types.js';
import { buildMigrationConfig } from './run.js';

/**
 * Roll back the last migration batch (or all batches with `--all`).
 */
export async function rollback(
    config: OrmCliConfig,
    flags: Record<string, string | true>
): Promise<void> {
    const migrationConfig = buildMigrationConfig(config, flags);
    const all = flags['--all'] === true;

    const [batchNo, reverted] = await config.knex.migrate.rollback(
        migrationConfig,
        all
    );

    if ((reverted as string[]).length === 0) {
        console.log('Nothing to roll back.');
    } else {
        console.log(
            `Batch ${batchNo} rolled back. Reverted ${(reverted as string[]).length} migration(s):`
        );
        for (const m of reverted as string[]) console.log(`  ✗ ${m}`);
    }
}
