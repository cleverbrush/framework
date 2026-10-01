import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { JobScheduler } from '@cleverbrush/scheduler';
import knex from 'knex';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    repositoryContract,
    testJob
} from '../../scheduler/testing/repository-contract.js';
import {
    createSchedulerTables,
    dropSchedulerTables,
    PostgresJobRepository
} from '../src/index.js';

const connection = process.env.SCHEDULER_TEST_DATABASE_URL;
if (!connection)
    throw new Error(
        'SCHEDULER_TEST_DATABASE_URL is required for integration tests'
    );
const db = knex({
    client: 'pg',
    connection,
    pool: { min: 0, max: 10 },
    acquireConnectionTimeout: 5000
});
const options = {
    tablePrefix: 'test_jobs_' + randomUUID().replaceAll('-', '').slice(0, 30)
};
beforeAll(() => createSchedulerTables(db, options));
afterAll(async () => {
    await dropSchedulerTables(db, options);
    await db.destroy();
});
const repository = new PostgresJobRepository(db, options);
repositoryContract(async () => ({
    repository,
    scheduler: new JobScheduler({
        storageRepository: repository,
        namespace: randomUUID()
    }),
    advance: ms => new Promise(resolve => setTimeout(resolve, ms))
}));

describe('PostgreSQL durability', () => {
    it('executes recurring runs and retains the cursor across scheduler/repository replacement', async () => {
        const namespace = randomUUID();
        const first = new JobScheduler({
            storageRepository: repository,
            namespace
        });
        const job = testJob();
        const spec = {
            schedule: {
                every: 'minute' as const,
                startsOn: new Date(Date.now() - 120000),
                maxOccurences: 3
            },
            missed: 'replay' as const
        };
        await first.upsertSchedule('periodic', job, { id: 'periodic' }, spec);
        const replacement = new JobScheduler({
            storageRepository: new PostgresJobRepository(db, options),
            namespace
        });
        const counts = await Promise.all([
            first.dispatch(),
            replacement.dispatch()
        ]);
        expect(counts.reduce((a, b) => a + b)).toBe(3);
        const worker = replacement.createWorker({
            pollIntervalMs: 2,
            jobs: [
                job.handle(async (input, context) => {
                    await context.report({ percent: 100 });
                    return { url: '/' + input.id };
                })
            ]
        });
        try {
            await worker.start();
            await expect
                .poll(async () => (await replacement.health()).counts.succeeded)
                .toBe(3);
        } finally {
            await worker.stop();
        }
        const same = await replacement.upsertSchedule(
            'periodic',
            job,
            { id: 'periodic' },
            {
                ...spec,
                schedule: {
                    ...spec.schedule,
                    maxOccurences: undefined,
                    maxOccurrences: 3,
                    interval: 1,
                    skipFirst: 0,
                    timeZone: 'UTC'
                }
            }
        );
        expect(same).toMatchObject({ revision: 1, cursor: 3, nextAt: null });
        expect(await replacement.dispatch()).toBe(0);
    });
    it('rolls back an enqueue with the enclosing business transaction', async () => {
        let id = '';
        await expect(
            db.transaction(async tx => {
                const scheduler = new JobScheduler({
                    storageRepository: new PostgresJobRepository(tx, options)
                });
                id = (await scheduler.enqueue(testJob(), { id: 'rollback' }))
                    .id;
                throw new Error('business rollback');
            })
        ).rejects.toThrow('business rollback');
        expect(await repository.get('default', id)).toBeUndefined();
    });
    it('skips a row held by another transaction instead of blocking claims', async () => {
        const scheduler = new JobScheduler({
            storageRepository: repository,
            namespace: randomUUID()
        });
        const first = await scheduler.enqueue(testJob(), { id: 'one' });
        await scheduler.enqueue(testJob(), { id: 'two' });
        const tx = await db.transaction();
        try {
            await tx(options.tablePrefix + '_runs')
                .where({ id: first.id })
                .forUpdate();
            const run = await repository.claim(
                scheduler.namespace,
                [testJob()],
                10000
            );
            expect(run?.id).not.toBe(first.id);
            expect(run).toBeDefined();
        } finally {
            await tx.rollback();
        }
    });
    it('recovers after SIGKILL and preserves committed progress across processes', async () => {
        const namespace = randomUUID();
        const scheduler = new JobScheduler({
            storageRepository: repository,
            namespace
        });
        const job = testJob({ retry: { maxAttempts: 2, initialDelayMs: 1 } });
        const run = await scheduler.enqueue(job, { id: 'restart' });
        const child = fork(
            new URL(
                '../../../demos/durable-jobs/crash-worker.mjs',
                import.meta.url
            ),
            [],
            {
                env: {
                    ...process.env,
                    SCHEDULER_TEST_DATABASE_URL: connection,
                    JOB_TABLE_PREFIX: options.tablePrefix,
                    JOB_NAMESPACE: namespace
                },
                stdio: ['ignore', 'ignore', 'pipe', 'ipc']
            }
        );
        try {
            await Promise.race([
                once(child, 'message'),
                new Promise((_, reject) => {
                    const timer = setTimeout(
                        () =>
                            reject(
                                new Error(
                                    'Crash worker did not report progress'
                                )
                            ),
                        8000
                    );
                    timer.unref();
                })
            ]);
            child.kill('SIGKILL');
            await once(child, 'exit');
            expect(
                (await repository.events(namespace, run.id, 0)).map(
                    event => event.type
                )
            ).toEqual(['queued', 'running', 'progress']);
            await new Promise(resolve => setTimeout(resolve, 650));
            await repository.claim(namespace, [job], 10000);
            await new Promise(resolve => setTimeout(resolve, 5));
            const claim = (await repository.claim(namespace, [job], 10000))!;
            expect(claim.attempt).toBe(2);
            await repository.complete(namespace, run.id, claim.leaseToken!, {
                url: '/after-restart'
            });
            expect(await scheduler.getRun(job, run.id)).toMatchObject({
                status: 'succeeded',
                output: { url: '/after-restart' }
            });
        } finally {
            if (child.exitCode === null && child.signalCode === null)
                child.kill('SIGKILL');
        }
    });
});
