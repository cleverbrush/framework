// Integration fixture: deliberately never finishes after committing progress.
import knex from 'knex';
import { object, string, number } from '@cleverbrush/schema';
import { defineJob, JobScheduler } from '@cleverbrush/scheduler';
import { PostgresJobRepository } from '@cleverbrush/scheduler-postgres';
const db = knex({ client: 'pg', connection: process.env.SCHEDULER_TEST_DATABASE_URL });
const job = defineJob({ name: 'report', version: 1, input: object({ id: string() }), progress: object({ percent: number() }), output: object({ url: string() }), retry: { maxAttempts: 2, initialDelayMs: 1 } });
const scheduler = new JobScheduler({ repository: new PostgresJobRepository(db, { tablePrefix: process.env.JOB_TABLE_PREFIX }), namespace: process.env.JOB_NAMESPACE });
const worker = scheduler.createWorker({ jobs: [job.handle(async (_, context) => {
    await context.report({ percent: 50 });
    process.send?.({ ready: true });
    await new Promise(() => {});
})], pollIntervalMs: 10, leaseMs: 500, heartbeatMs: 100 });
await worker.start();
