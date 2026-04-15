import type { Knex } from 'knex';
import { up as migration001Up } from './migrations/001_initial.js';

type MigrationEntry = {
    name: string;
    up: (knex: Knex) => Promise<void>;
};

const migrations: MigrationEntry[] = [
    { name: '001_initial', up: migration001Up }
];

export async function runMigrations(knex: Knex): Promise<void> {
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

        console.log(`[migrations] ran ${migration.name}`);
    }
}
