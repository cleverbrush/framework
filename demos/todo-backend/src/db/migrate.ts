import type { Logger } from '@cleverbrush/log';
import type { Knex } from 'knex';
import { MigrationRan } from '../logTemplates.js';
import { up as migration001Up } from './migrations/001_initial.js';
import { up as migration002Up } from './migrations/002_todos_soft_delete.js';
import { up as migration003Up } from './migrations/003_todo_activity.js';

type MigrationEntry = {
    name: string;
    up: (knex: Knex) => Promise<void>;
};

const migrations: MigrationEntry[] = [
    { name: '001_initial', up: migration001Up },
    { name: '002_todos_soft_delete', up: migration002Up },
    { name: '003_todo_activity', up: migration003Up }
];

export async function runMigrations(
    knex: Knex,
    logger?: Logger
): Promise<void> {
    // Ensure the migrations tracking table exists
    const hasMigrationsTable = await knex.schema.hasTable('_migrations');
    if (!hasMigrationsTable) {
        await knex.schema.createTable('_migrations', table => {
            table.string('name', 255).primary();
            table
                .timestamp('ran_at', { useTz: true })
                .notNullable()
                .defaultTo(knex.fn.now());
        });
    }

    // Run each migration that has not been executed yet
    for (const migration of migrations) {
        const already = await knex('_migrations')
            .where('name', migration.name)
            .first();
        if (already) {
            continue;
        }

        await knex.transaction(async trx => {
            await migration.up(trx);
            await trx('_migrations').insert({ name: migration.name });
        });

        logger?.info(MigrationRan, { MigrationName: migration.name });
    }
}
