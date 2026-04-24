import path from 'node:path';
import type { Logger } from '@cleverbrush/log';
import type { Knex } from 'knex';
import { MigrationRan } from '../logTemplates.js';

// Resolution order:
//   1. MIGRATIONS_DIR env var (set in container / CI)
//   2. /app/migrations  (Docker runtime layout — migrations/ copied next to dist/)
//   3. <cwd>/migrations (local dev: run from demos/todo-backend/)
const MIGRATIONS_DIR =
    process.env.MIGRATIONS_DIR ??
    (/^\/app(\/|$)/.test(process.cwd()) ? '/app/migrations' : path.join(process.cwd(), 'migrations'));
const MIGRATIONS_TABLE = 'knex_migrations';

export async function runMigrations(
    knex: Knex,
    logger?: Logger
): Promise<void> {
    const [_batch, filenames] = await knex.migrate.latest({
        directory: MIGRATIONS_DIR,
        tableName: MIGRATIONS_TABLE,
        loadExtensions: ['.ts', '.js']
    });

    for (const name of filenames) {
        logger?.info(MigrationRan, { MigrationName: path.basename(name) });
    }
}
