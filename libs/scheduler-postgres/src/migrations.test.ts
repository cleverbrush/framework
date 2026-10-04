import { expect, it } from 'vitest';
import { mockDriver } from '../../knex-schema/testing/mock-driver.js';
import { createSchedulerTables, dropSchedulerTables } from './migrations.js';

it('creates namespaced tables, indexes and cascade constraints, then drops in dependency order', async () => {
    const { knex, queries } = mockDriver();
    try {
        await createSchedulerTables(knex, { tablePrefix: 'unit_jobs' });
        const sql = queries.map(q => q.sql).join('\n');
        for (const name of ['runs', 'schedules', 'events', 'attempts'])
            expect(sql).toContain(`create table "unit_jobs_${name}"`);
        expect(sql).toContain('on delete CASCADE');
        expect(sql).toContain('"unit_jobs_runs_dedupe"');
        expect(sql).toContain('"unit_jobs_runs_ready"');
        queries.length = 0;
        await dropSchedulerTables(knex, { tablePrefix: 'unit_jobs' });
        expect(
            queries.filter(q => q.sql.startsWith('drop table')).map(q => q.sql)
        ).toEqual([
            'drop table "unit_jobs_events"',
            'drop table "unit_jobs_attempts"',
            'drop table "unit_jobs_schedules"',
            'drop table "unit_jobs_runs"'
        ]);
    } finally {
        await knex.destroy();
    }
});

it('rolls back a failed migration and validates prefixes before opening a transaction', async () => {
    const { knex, queries } = mockDriver();
    const failing = mockDriver();
    failing.respond = query => {
        if (query.sql.startsWith('create table')) throw new Error('DDL failed');
        return [];
    };
    try {
        await expect(createSchedulerTables(failing.knex)).rejects.toThrow(
            'DDL failed'
        );
        expect(failing.queries.at(-1)?.sql).toBe('ROLLBACK');
        await expect(
            createSchedulerTables(knex, { tablePrefix: 'invalid-prefix' })
        ).rejects.toThrow('Invalid scheduler table prefix');
        expect(queries).toEqual([]);
    } finally {
        await knex.destroy();
        await failing.knex.destroy();
    }
});
