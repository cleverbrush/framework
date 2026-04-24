// @cleverbrush/orm-cli — migrate run command

import type { OrmCliConfig } from '../types.js';

/**
 * Apply pending migrations via `knex.migrate.latest`.
 * Pass `--to <migrationName>` to migrate up to a specific file.
 */
export async function run(
    config: OrmCliConfig,
    flags: Record<string, string | true>
): Promise<void> {
    const migrationConfig = buildMigrationConfig(config, flags);
    const toMigration = flags['--to'] as string | undefined;

    if (toMigration) {
        const [batchNo, applied] = await config.knex.migrate.up({
            ...migrationConfig,
            name: toMigration
        });
        if ((applied as string[]).length === 0) {
            console.log(`${toMigration} — already applied.`);
        } else {
            console.log(
                `Batch ${batchNo}. Applied: ${(applied as string[]).join(', ')}`
            );
        }
    } else {
        const [batchNo, applied] =
            await config.knex.migrate.latest(migrationConfig);
        if ((applied as string[]).length === 0) {
            console.log('Already up to date.');
        } else {
            console.log(
                `Batch ${batchNo}. Applied ${(applied as string[]).length} migration(s):`
            );
            for (const m of applied as string[]) console.log(`  ✓ ${m}`);
        }
    }
}

// ---------------------------------------------------------------------------
// Shared helper (used by run, rollback, status, push)
// ---------------------------------------------------------------------------

export function buildMigrationConfig(
    config: OrmCliConfig,
    flags: Record<string, string | true>
) {
    return {
        directory:
            (flags['--dir'] as string | undefined) ??
            config.migrations.directory,
        tableName: config.migrations.tableName ?? 'knex_migrations',
        loadExtensions: ['.ts', '.js']
    };
}
