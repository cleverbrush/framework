import { afterEach, describe, expect, it, vi } from 'vitest';
import { testJob } from '../testing/repository-contract.js';
import {
    InMemoryJobRepository,
    JobScheduler,
    LeaseLostError
} from './index.js';
import type { JobWorker } from './worker.js';

const workers: JobWorker[] = [];
const schedulers: JobScheduler[] = [];
afterEach(async () => {
    await Promise.all(
        workers.splice(0).map(w => w.stop({ drainTimeoutMs: 10 }))
    );
    await Promise.all(schedulers.splice(0).map(s => s.stop()));
    vi.restoreAllMocks();
});
function setup() {
    const repository = new InMemoryJobRepository();
    const scheduler = new JobScheduler({
        storageRepository: repository,
        pollIntervalMs: 2
    });
    schedulers.push(scheduler);
    return { repository, scheduler };
}
describe('durable lifecycle failures', () => {
    it('validates worker registrations and single-use lifecycle', async () => {
        const { scheduler } = setup();
        const binding = testJob().handle(() => ({ url: '/' }));
        expect(() =>
            scheduler.createWorker({ jobs: [], heartbeatMs: 10, leaseMs: 10 })
        ).toThrow('shorter');
        expect(() => scheduler.createWorker({ jobs: [] })).toThrow(
            'At least one'
        );
        expect(() =>
            scheduler.createWorker({ jobs: [binding, binding] })
        ).toThrow('Duplicate');
        expect(() =>
            scheduler.createWorker({
                jobs: [{ definition: binding.definition } as any]
            })
        ).toThrow('exactly one');
        const worker = scheduler.createWorker({ jobs: [binding] });
        workers.push(worker);
        await worker.start();
        await expect(worker.start()).rejects.toThrow('already');
        await worker.stop();
        await expect(worker.start()).rejects.toThrow('already');
    });
    it('isolates dispatch observers and recovers from storage errors', async () => {
        const repository = new InMemoryJobRepository();
        const error = new Error('temporarily offline');
        const dispatch = vi
            .spyOn(repository, 'dispatch')
            .mockRejectedValueOnce(error);
        const observer = vi.fn(() => {
            throw new Error('observer failed');
        });
        const scheduler = new JobScheduler({
            storageRepository: repository,
            pollIntervalMs: 2,
            onError: observer
        });
        schedulers.push(scheduler);
        await scheduler.start();
        await expect(scheduler.start()).rejects.toThrow('already');
        await vi.waitFor(() => expect(observer).toHaveBeenCalledWith(error));
        await vi.waitFor(() =>
            expect(dispatch.mock.calls.length).toBeGreaterThan(1)
        );
        await vi.waitFor(() => expect(scheduler.lastError).toBeUndefined());
    });
    it('validates schedule policies, dates and event cursors and rejects mismatched definitions', async () => {
        const { scheduler } = setup();
        const job = testJob();
        await expect(
            scheduler.enqueue(job, { id: 'a' }, { runAt: new Date(NaN) })
        ).rejects.toThrow('Invalid runAt');
        await expect(
            scheduler.upsertSchedule(
                'daily',
                job,
                { id: 'a' },
                {
                    schedule: { type: 'interval', everyMs: 1000 } as any,
                    missed: 'invalid' as any
                }
            )
        ).rejects.toThrow('Invalid schedule policy');
        await expect(
            scheduler.events(job, 'missing', { after: -1 }).next()
        ).rejects.toThrow('Invalid event cursor');
        expect(await scheduler.events(job, 'missing').next()).toMatchObject({
            done: true
        });
        const run = await scheduler.enqueue(job, { id: 'a' });
        await expect(
            scheduler.getRun({ ...job, version: job.version + 1 }, run.id)
        ).rejects.toThrow('does not match');
        const controller = new AbortController();
        const events = scheduler.events(job, run.id, {
            signal: controller.signal
        });
        expect((await events.next()).done).toBe(false);
        controller.abort();
        expect((await events.next()).done).toBe(true);
        expect(await scheduler.health()).toHaveProperty('counts');
        expect(await scheduler.cleanup()).toBe(0);
        expect(await scheduler.pauseSchedule('missing')).toBe(false);
        expect(await scheduler.removeSchedule('missing')).toBe(false);
    });
    it.each([new Error('heartbeat unavailable'), new LeaseLostError()])(
        'aborts work after lost heartbeat without committing a terminal state',
        async error => {
            const { repository, scheduler } = setup();
            const job = testJob({ timeoutMs: 1000 });
            const run = await scheduler.enqueue(job, { id: 'a' });
            const heartbeat = vi
                .spyOn(repository, 'heartbeat')
                .mockRejectedValue(error);
            const complete = vi.spyOn(repository, 'complete');
            const fail = vi.spyOn(repository, 'fail');
            const diagnostic = vi.fn();
            const worker = scheduler.createWorker({
                heartbeatMs: 2,
                leaseMs: 1000,
                pollIntervalMs: 2,
                onDiagnostic: diagnostic,
                jobs: [
                    job.handle(async (_, context) => {
                        await new Promise<void>(resolve =>
                            context.signal.addEventListener(
                                'abort',
                                () => resolve(),
                                { once: true }
                            )
                        );
                        return { url: '/' };
                    })
                ]
            });
            workers.push(worker);
            await worker.start();
            await vi.waitFor(() => expect(heartbeat).toHaveBeenCalled());
            await worker.stop({ drainTimeoutMs: 20 });
            expect(complete).not.toHaveBeenCalled();
            expect(fail).not.toHaveBeenCalled();
            expect(diagnostic).toHaveBeenCalledWith(
                expect.objectContaining({
                    type:
                        error instanceof LeaseLostError
                            ? 'lease_lost'
                            : 'infrastructure_error',
                    runId: run.id
                })
            );
        }
    );
    it('returns a claim interrupted by shutdown and isolates failing diagnostics', async () => {
        const { repository, scheduler } = setup();
        const job = testJob();
        const run = await scheduler.enqueue(job, { id: 'a' });
        const original = repository.claim.bind(repository);
        let release!: () => void;
        const claimed = new Promise<void>(resolve => {
            release = resolve;
        });
        const claim = vi
            .spyOn(repository, 'claim')
            .mockImplementation(async (...args) => {
                const result = await original(...args);
                await claimed;
                return result;
            });
        const handler = vi.fn(() => ({ url: '/' }));
        const worker = scheduler.createWorker({
            pollIntervalMs: 2,
            jobs: [job.handle(handler)],
            onDiagnostic: () => {
                throw new Error('ignored');
            }
        });
        workers.push(worker);
        await worker.start();
        await vi.waitFor(() => expect(claim).toHaveBeenCalled());
        const stopped = worker.stop();
        release();
        await stopped;
        expect(handler).not.toHaveBeenCalled();
        expect(await scheduler.getRun(job, run.id)).toMatchObject({
            status: 'failed',
            error: { code: 'shutdown' }
        });
    });
    it.each([new Error('write unavailable'), new LeaseLostError()])(
        'reports failure-persistence errors without crashing the poll loop',
        async error => {
            const { repository, scheduler } = setup();
            const job = testJob();
            await scheduler.enqueue(job, { id: 'a' });
            vi.spyOn(repository, 'fail').mockRejectedValue(error);
            const diagnostic = vi.fn(() => {
                throw new Error('observer unavailable');
            });
            const worker = scheduler.createWorker({
                pollIntervalMs: 2,
                jobs: [
                    job.handle(() => {
                        throw new Error('job failed');
                    })
                ],
                onDiagnostic: diagnostic
            });
            workers.push(worker);
            await worker.start();
            await vi.waitFor(() =>
                expect(diagnostic).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type:
                            error instanceof LeaseLostError
                                ? 'lease_lost'
                                : 'infrastructure_error'
                    })
                )
            );
        }
    );
});
