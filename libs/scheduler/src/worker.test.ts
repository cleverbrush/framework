import { afterEach, describe, expect, it, vi } from 'vitest';
import { testJob } from '../testing/repository-contract.js';
import {
    InMemoryJobRepository,
    JobScheduler,
    type JobWorker,
    NonRetryableJobError
} from './index.js';

const workers: JobWorker[] = [];
afterEach(async () => {
    await Promise.all(
        workers.splice(0).map(worker => worker.stop({ drainTimeoutMs: 30 }))
    );
});
function setup() {
    const repository = new InMemoryJobRepository();
    return {
        repository,
        scheduler: new JobScheduler({
            storageRepository: repository,
            pollIntervalMs: 2
        })
    };
}
describe('function worker', () => {
    it('stops over-limit progress without retrying or persisting extra events', async () => {
        const { scheduler, repository } = setup();
        const job = testJob({
            maxProgressEvents: 1,
            retry: { maxAttempts: 3 }
        });
        const run = await scheduler.enqueue(job, { id: 'one' });
        const worker = scheduler.createWorker({
            pollIntervalMs: 2,
            jobs: [
                job.handle(async (_, context) => {
                    await context.report({ percent: 10 });
                    await context.report({ percent: 20 });
                    return { url: '/report' };
                })
            ]
        });
        workers.push(worker);
        await worker.start();
        await vi.waitFor(async () =>
            expect(await scheduler.getRun(job, run.id)).toMatchObject({
                status: 'failed',
                attempt: 1,
                error: { code: 'progress_limit' }
            })
        );
        expect(
            (await repository.events('default', run.id, 0)).filter(
                event => event.type === 'progress'
            )
        ).toHaveLength(1);
    });
    it('validates input/progress/output and publishes progress before success', async () => {
        const { scheduler, repository } = setup();
        const job = testJob();
        const run = await scheduler.enqueue(job, { id: 'one' });
        const worker = scheduler.createWorker({
            pollIntervalMs: 2,
            jobs: [
                job.handle(async (_, context) => {
                    await context.report({ percent: 50 });
                    expect(
                        (await repository.events('default', run.id, 0)).at(-1)
                            ?.type
                    ).toBe('progress');
                    return { url: '/report' };
                })
            ]
        });
        workers.push(worker);
        await worker.start();
        await vi.waitFor(async () =>
            expect(await scheduler.getRun(job, run.id)).toHaveProperty(
                'status',
                'succeeded'
            )
        );
    });
    it('retries opt-in, but not explicit permanent failures', async () => {
        const { scheduler } = setup();
        const job = testJob({ retry: { maxAttempts: 3, initialDelayMs: 1 } });
        const run = await scheduler.enqueue(job, { id: 'one' });
        let count = 0;
        const worker = scheduler.createWorker({
            pollIntervalMs: 2,
            jobs: [
                job.handle(() => {
                    count++;
                    if (count === 1) throw new Error('retry');
                    throw new NonRetryableJobError('permanent');
                })
            ]
        });
        workers.push(worker);
        await worker.start();
        await vi.waitFor(async () =>
            expect(await scheduler.getRun(job, run.id)).toHaveProperty(
                'status',
                'failed'
            )
        );
        expect(count).toBe(2);
    });
    it('fails invalid output and a forgotten invalid progress promise', async () => {
        for (const mode of ['output', 'progress']) {
            const { scheduler } = setup();
            const job = testJob();
            const run = await scheduler.enqueue(job, { id: mode });
            const worker = scheduler.createWorker({
                pollIntervalMs: 2,
                jobs: [
                    job.handle((_, context) => {
                        if (mode === 'progress')
                            void context.report({ percent: 'wrong' } as any);
                        return (
                            mode === 'output'
                                ? { wrong: true }
                                : { url: '/report' }
                        ) as any;
                    })
                ]
            });
            workers.push(worker);
            await worker.start();
            await vi.waitFor(async () =>
                expect(await scheduler.getRun(job, run.id)).toMatchObject({
                    status: 'failed',
                    error: { code: 'invalid_payload' }
                })
            );
        }
    });
    it('bounds progress and retains a local slot while a timed-out function is alive', async () => {
        const { scheduler } = setup();
        const job = testJob({ timeoutMs: 20 });
        const first = await scheduler.enqueue(
            job,
            { id: 'one' },
            { runAt: new Date(0) }
        );
        const second = await scheduler.enqueue(job, { id: 'two' });
        let release!: () => void;
        let started = 0;
        const worker = scheduler.createWorker({
            pollIntervalMs: 2,
            jobs: [
                job.handle(async () => {
                    started++;
                    await new Promise<void>(resolve => {
                        release = resolve;
                    });
                    return { url: '/report' };
                })
            ]
        });
        workers.push(worker);
        await worker.start();
        await vi.waitFor(async () =>
            expect(await scheduler.getRun(job, first.id)).toMatchObject({
                status: 'failed',
                error: { code: 'timeout' }
            })
        );
        expect(started).toBe(1);
        expect(await scheduler.getRun(job, second.id)).toHaveProperty(
            'status',
            'queued'
        );
        await worker.stop({ drainTimeoutMs: 10 });
        release();
        await expect(worker.start()).rejects.toThrow('already');
    });
    it('records shutdown interruption and rejects progress after cancellation', async () => {
        const { scheduler } = setup();
        const job = testJob();
        const run = await scheduler.enqueue(job, { id: 'one' });
        const worker = scheduler.createWorker({
            pollIntervalMs: 2,
            jobs: [
                job.handle(async (_, context) => {
                    await new Promise<void>(resolve =>
                        context.signal.addEventListener(
                            'abort',
                            () => resolve(),
                            { once: true }
                        )
                    );
                    await expect(
                        context.report({ percent: 100 })
                    ).rejects.toThrow();
                    return { url: '/report' };
                })
            ]
        });
        workers.push(worker);
        await worker.start();
        await vi.waitFor(async () =>
            expect(await scheduler.getRun(job, run.id)).toHaveProperty(
                'status',
                'running'
            )
        );
        await worker.stop({ drainTimeoutMs: 5 });
        expect(await scheduler.getRun(job, run.id)).toMatchObject({
            status: 'failed',
            error: { code: 'shutdown' }
        });
    });
});
