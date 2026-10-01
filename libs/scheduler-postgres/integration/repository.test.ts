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
    scheduler: new JobScheduler({ repository, namespace: randomUUID() }),
    advance: ms => new Promise(resolve => setTimeout(resolve, ms))
}));

describe('PostgreSQL durability', () => {
    it('rolls back an enqueue with the enclosing business transaction', async () => {
        let id = '';
        await expect(
            db.transaction(async tx => {
                const scheduler = new JobScheduler({
                    repository: new PostgresJobRepository(tx, options)
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
            repository,
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
        const scheduler = new JobScheduler({ repository, namespace });
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
