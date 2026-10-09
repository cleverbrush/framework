import {
    InMemoryJobRepository,
    JobScheduler,
    type RunRecord,
    type ScheduleRecord
} from '@cleverbrush/scheduler';
import { afterEach, describe, expect, it } from 'vitest';
import { mockDriver } from '../../knex-schema/testing/mock-driver.js';
import { testJob } from '../../scheduler/testing/repository-contract.js';
import { PostgresJobRepository, PostgresJobStorage } from './storage.js';

const drivers: ReturnType<typeof mockDriver>[] = [];
afterEach(async () => {
    await Promise.all(drivers.splice(0).map(d => d.knex.destroy()));
});
function setup() {
    const driver = mockDriver();
    drivers.push(driver);
    return {
        ...driver,
        driver,
        storage: new PostgresJobStorage(driver.knex, {
            tablePrefix: 'unit_jobs'
        })
    };
}
async function runRecord(): Promise<RunRecord> {
    const repo = new InMemoryJobRepository();
    const scheduler = new JobScheduler({ storageRepository: repo });
    const run = await scheduler.enqueue(testJob(), { id: 'one' });
    return (await repo.get('default', run.id))!;
}
const row = (run: RunRecord) => ({
    id: run.id,
    namespace: run.namespace,
    name: run.name,
    version: run.version,
    status: run.status,
    availableAt: run.availableAt,
    leaseExpiresAt: run.leaseExpiresAt,
    scheduleId: run.scheduleId,
    dedupeKey: run.dedupeKey,
    expiresAt: null,
    record: JSON.stringify(run)
});

describe('PostgreSQL storage SQL and transaction contract', () => {
    it('sets transaction timeouts, uses database time and rolls back failures', async () => {
        const { driver, storage, queries } = setup();
        driver.respond = query =>
            query.sql.includes(' as now') ? [{ now: 1234 }] : [];
        expect(await storage.atomic(tx => tx.now())).toBe(1234);
        expect(queries.map(q => q.sql)).toEqual(
            expect.arrayContaining([
                'BEGIN;',
                "set local lock_timeout = '5s'",
                "set local statement_timeout = '15s'",
                'COMMIT;'
            ])
        );
        await expect(
            storage.atomic(async () => {
                throw new Error('rollback');
            })
        ).rejects.toThrow('rollback');
        expect(queries.at(-1)?.sql).toBe('ROLLBACK');
    });

    it('reads scoped records, returns missing rows and locks requested reads', async () => {
        const { driver, storage, queries } = setup();
        const record = await runRecord();
        driver.respond = query =>
            query.sql.startsWith('select') ? [row(record)] : [];
        for (const lock of [false, true]) {
            expect(
                await storage.atomic(tx => tx.run('tenant', record.id, lock))
            ).toEqual(record);
            const read = queries.findLast(q => q.sql.startsWith('select'))!;
            expect(read.bindings).toEqual(
                expect.arrayContaining(['tenant', record.id])
            );
            expect(read.sql.includes('for update')).toBe(lock);
        }
        driver.respond = () => [];
        expect(
            await storage.atomic(tx => tx.run('tenant', 'missing', false))
        ).toBeUndefined();
    });

    it('handles inserts, deduplication races, retention and missing conflicts', async () => {
        const { driver, storage, queries } = setup();
        const record = await runRecord();
        driver.respond = query =>
            query.sql.startsWith('insert') ? [row(record)] : [];
        expect(await storage.atomic(tx => tx.insertRun(record))).toEqual({
            record,
            inserted: true
        });
        const insert = queries.find(q => q.sql.startsWith('insert'))!;
        expect(insert.sql).toContain(
            'on conflict ("namespace", "dedupeKey") do nothing'
        );
        expect(insert.bindings).toContain(JSON.stringify(record));
        driver.respond = query =>
            query.sql.startsWith('select') ? [row(record)] : [];
        expect(await storage.atomic(tx => tx.insertRun(record))).toEqual({
            record,
            inserted: false
        });
        await storage.atomic(tx => tx.saveRun({ ...record, completedAt: 100 }));
        expect(
            queries.findLast(q => q.sql.startsWith('update'))?.bindings
        ).toContain(100 + record.policy.retentionMs);
        driver.respond = () => [];
        await expect(
            storage.atomic(tx => tx.insertRun(record))
        ).rejects.toThrow('Conflicting run disappeared');
    });

    it('claims expired leases and supported versions without blocking locked rows', async () => {
        const { driver, storage, queries } = setup();
        const record = await runRecord();
        driver.respond = query =>
            query.sql.startsWith('select') ? [row(record)] : [];
        for (const supported of [[], [{ name: 'report', version: 1 }]]) {
            expect(
                await storage.atomic(tx => tx.runnable('tenant', supported))
            ).toEqual(record);
            const query = queries.findLast(q => q.sql.startsWith('select'))!;
            expect(query.sql).toContain('for update skip locked');
            expect(query.sql).toContain('clock_timestamp()');
            expect(query.bindings).toContain('tenant');
            expect(query.sql.includes('"name" =')).toBe(supported.length > 0);
        }
    });

    it('serializes progress and attempts and reads them in cursor order', async () => {
        const { driver, storage, queries } = setup();
        const event = {
            runId: 'r',
            sequence: 2,
            type: 'progress',
            data: { percent: 50 }
        } as any;
        const attempt = { runId: 'r', attempt: 1, status: 'succeeded' } as any;
        driver.respond = query =>
            query.sql.startsWith('select')
                ? [
                      {
                          runId: 'r',
                          sequence: 2,
                          attempt: 1,
                          record: JSON.stringify(
                              query.sql.includes('_events') ? event : attempt
                          )
                      }
                  ]
                : [];
        await storage.atomic(async tx => {
            await tx.appendEvent(event);
            await tx.saveAttempt(attempt);
            expect(await tx.events('r', 1, 10)).toEqual([event]);
            expect(await tx.attempts('r')).toEqual([attempt]);
        });
        const events = queries.find(
            q => q.sql.startsWith('select') && q.sql.includes('_events')
        )!;
        expect(events.sql).toContain('"sequence" >');
        expect(events.sql).toMatch(/order by .*"sequence" asc limit/);
        expect(events.bindings).toEqual(['r', 1, 10]);
        expect(
            queries.find(
                q => q.sql.startsWith('insert') && q.sql.includes('_attempts')
            )?.sql
        ).toContain('do update');
    });

    it('locks schedule cursors, limits due work and detects unfinished runs', async () => {
        const { driver, storage, queries } = setup();
        const schedule = {
            namespace: 'tenant',
            id: 'daily',
            active: true,
            nextAt: 100
        } as ScheduleRecord;
        driver.respond = query =>
            query.sql.startsWith('select')
                ? [{ ...schedule, record: JSON.stringify(schedule) }]
                : [];
        await storage.atomic(async tx => {
            expect(await tx.schedule('tenant', 'daily')).toEqual(schedule);
            expect(await tx.insertSchedule(schedule)).toEqual(schedule);
            await tx.saveSchedule(schedule);
            expect(await tx.dueSchedules('tenant', 5)).toEqual([schedule]);
        });
        const due = queries.findLast(q => q.sql.startsWith('select'))!;
        expect(due.sql).toContain('for update skip locked');
        expect(due.bindings).toEqual(['tenant', true, 5]);
        const record = await runRecord();
        driver.respond = query =>
            query.sql.startsWith('select') ? [row(record)] : [];
        expect(
            await storage.atomic(tx =>
                tx.unfinishedScheduleRun('tenant', 'daily')
            )
        ).toBe(true);
        driver.respond = () => [];
        expect(
            await storage.atomic(tx =>
                tx.unfinishedScheduleRun('tenant', 'daily')
            )
        ).toBe(false);
    });

    it('bounds cleanup to expired terminal rows and does nothing for empty pages', async () => {
        const { driver, storage, queries } = setup();
        expect(await storage.atomic(tx => tx.cleanup('tenant', 2))).toBe(0);
        driver.respond = query =>
            query.sql.startsWith('select')
                ? [{ id: 'r' }]
                : query.sql.startsWith('delete')
                  ? [{}]
                  : [];
        expect(await storage.atomic(tx => tx.cleanup('tenant', 2))).toBe(1);
        const select = queries.findLast(q => q.sql.startsWith('select'))!;
        expect(select.sql).toContain('for update skip locked');
        expect(select.bindings).toEqual([
            'tenant',
            'succeeded',
            'failed',
            'cancelled',
            2
        ]);
        expect(
            queries.findLast(q => q.sql.startsWith('delete'))?.bindings
        ).toEqual(['r']);
    });

    it('reports status counts, queued definitions and nullable oldest-ready time', async () => {
        const { driver, storage } = setup();
        driver.respond = query => {
            if (query.sql.includes('min(')) return [{ at: null }];
            if (query.sql.includes('group by "name"'))
                return [{ name: 'report', version: 1, count: 2 }];
            if (query.sql.includes('group by "status"'))
                return [{ status: 'queued', count: 2 }];
            return [];
        };
        expect(await storage.atomic(tx => tx.health('tenant'))).toEqual({
            counts: { queued: 2 },
            oldestReadyAt: null,
            queuedDefinitions: [{ name: 'report', version: 1, count: 2 }]
        });
        expect(new PostgresJobRepository(driver.knex)).toBeInstanceOf(
            PostgresJobRepository
        );
    });
});
