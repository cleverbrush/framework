import { generateCreateTable, getTableName } from '@cleverbrush/knex-schema';
import type { Knex } from 'knex';
import { type PostgresStorageOptions, storageSchemas } from './schema.js';

/**
 * Explicit initial migration. Call once through your migration runner, never on worker startup.
 * Creates four tables, indexes and cascading foreign keys in one transaction.
 */
export async function createSchedulerTables(
    knex: Knex,
    options: PostgresStorageOptions = {}
): Promise<void> {
    const schemas = storageSchemas(options);
    await knex.transaction(async tx => {
        for (const schema of [
            schemas.runs,
            schemas.schedules,
            schemas.events,
            schemas.attempts
        ])
            await generateCreateTable(schema)(tx);
        const runs = getTableName(schemas.runs);
        await tx.schema.alterTable(runs, table => {
            table.unique(['namespace', 'dedupeKey'], runs + '_dedupe');
            table.index(
                ['namespace', 'status', 'availableAt'],
                runs + '_ready'
            );
            table.index(
                ['namespace', 'status', 'leaseExpiresAt'],
                runs + '_leases'
            );
            table.index(
                ['namespace', 'scheduleId', 'status'],
                runs + '_overlap'
            );
            table.index(['namespace', 'expiresAt'], runs + '_expiry');
        });
        await tx.schema.alterTable(getTableName(schemas.schedules), table => {
            table.index(
                ['namespace', 'active', 'nextAt'],
                getTableName(schemas.schedules) + '_due'
            );
        });
        for (const schema of [schemas.events, schemas.attempts]) {
            await tx.schema.alterTable(getTableName(schema), table => {
                table
                    .foreign('runId')
                    .references('id')
                    .inTable(runs)
                    .onDelete('CASCADE');
            });
        }
    });
}
/**
 * Explicit destructive down migration. Deletes all scheduler data for this prefix.
 * Stop all producers, dispatchers and workers before calling.
 */
export async function dropSchedulerTables(
    knex: Knex,
    options: PostgresStorageOptions = {}
): Promise<void> {
    const schemas = storageSchemas(options);
    await knex.transaction(async tx => {
        for (const schema of [
            schemas.events,
            schemas.attempts,
            schemas.schedules,
            schemas.runs
        ])
            await tx.schema.dropTable(getTableName(schema));
    });
}
