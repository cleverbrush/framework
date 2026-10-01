import { number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { defineJob, type JobRepository, JobScheduler } from '../src/index.js';

export const testJob = (options = {}) =>
    defineJob({
        name: 'report',
        version: 1,
        input: object({ id: string() }),
        progress: object({ percent: number() }),
        output: object({ url: string() }),
        ...options
    });
export type Fixture = {
    repository: JobRepository;
    scheduler: JobScheduler;
    advance(ms: number): Promise<void>;
};
/** Shared assertions: both adapters must preserve the same durable transition contract. */
export function repositoryContract(create: () => Promise<Fixture>) {
    describe('repository contract', () => {
        it('deduplicates concurrent producers, rejects conflicts, isolates namespaces', async () => {
            const { scheduler, repository } = await create();
            const job = testJob();
            const runs = await Promise.all(
                Array.from({ length: 8 }, () =>
                    scheduler.enqueue(
                        job,
                        { id: 'one' },
                        { idempotencyKey: 'one' }
                    )
                )
            );
            expect(new Set(runs.map(run => run.id)).size).toBe(1);
            await expect(
                scheduler.enqueue(job, { id: 'two' }, { idempotencyKey: 'one' })
            ).rejects.toThrow('different submission');
            const other = new JobScheduler({
                storageRepository: repository,
                namespace: 'other'
            });
            expect(await other.getRun(job, runs[0].id)).toBeUndefined();
            expect(await other.cancel(runs[0].id)).toBe(false);
            expect(await repository.events('other', runs[0].id, 0)).toEqual([]);
            expect(
                await other.enqueue(
                    job,
                    { id: 'one' },
                    { idempotencyKey: 'one' }
                )
            ).not.toHaveProperty('id', runs[0].id);
        });
        it('claims once across competing workers and replays ordered durable progress', async () => {
            const { scheduler, repository } = await create();
            const job = testJob();
            const run = await scheduler.enqueue(job, { id: 'one' });
            const claims = await Promise.all(
                Array.from({ length: 4 }, () =>
                    repository.claim(scheduler.namespace, [job], 10000)
                )
            );
            expect(claims.filter(Boolean)).toHaveLength(1);
            const owned = claims.find(Boolean)!;
            const owner = [
                scheduler.namespace,
                run.id,
                owned.leaseToken!
            ] as const;
            await Promise.all([
                repository.report(...owner, { percent: 20 }),
                repository.report(...owner, { percent: 80 })
            ]);
            await repository.complete(...owner, { url: '/result' });
            expect(await scheduler.getRun(job, run.id)).toMatchObject({
                status: 'succeeded',
                output: { url: '/result' },
                attempt: 1
            });
            expect(await scheduler.getRun(job, run.id)).not.toHaveProperty(
                'leaseToken'
            );
            const events = [];
            for await (const event of scheduler.events(job, run.id, {
                after: 2
            }))
                events.push(event);
            expect(events.map(event => event.sequence)).toEqual([3, 4, 5]);
            expect(events.map(event => event.type)).toEqual([
                'progress',
                'progress',
                'succeeded'
            ]);
            expect(
                await repository.attempts(scheduler.namespace, run.id)
            ).toMatchObject([{ attempt: 1, status: 'succeeded' }]);
            await expect(repository.complete(...owner, {})).rejects.toThrow(
                'lease'
            );
        });
        it('fences expired owners; lease recovery consumes the configured attempt budget', async () => {
            const { scheduler, repository, advance } = await create();
            const job = testJob({
                retry: { maxAttempts: 2, initialDelayMs: 1 }
            });
            const run = await scheduler.enqueue(job, { id: 'one' });
            const first = (await repository.claim(
                scheduler.namespace,
                [job],
                500
            ))!;
            await advance(550);
            const oldOwner = [
                scheduler.namespace,
                run.id,
                first.leaseToken!
            ] as const;
            await expect(
                repository.heartbeat(...oldOwner, 500)
            ).rejects.toThrow('lease');
            await expect(repository.report(...oldOwner, {})).rejects.toThrow(
                'lease'
            );
            expect(
                await repository.claim(scheduler.namespace, [], 500)
            ).toBeUndefined();
            expect(await scheduler.getRun(job, run.id)).toMatchObject({
                status: 'retry_wait',
                error: { code: 'lease_expired' }
            });
            await advance(5);
            const second = (await repository.claim(
                scheduler.namespace,
                [job],
                500
            ))!;
            expect(second.attempt).toBe(2);
            expect(second.leaseToken).not.toBe(first.leaseToken);
            await expect(repository.complete(...oldOwner, {})).rejects.toThrow(
                'lease'
            );
            await repository.fail(
                scheduler.namespace,
                run.id,
                second.leaseToken!,
                { code: 'test', message: 'failed' }
            );
            expect(await scheduler.getRun(job, run.id)).toMatchObject({
                status: 'failed',
                attempt: 2
            });
            expect(
                await repository.attempts(scheduler.namespace, run.id)
            ).toMatchObject([{ status: 'interrupted' }, { status: 'failed' }]);
        });
        it('does not retry by default, and respects delayed/unsupported work', async () => {
            const { scheduler, repository, advance } = await create();
            const job = testJob();
            const delayed = await scheduler.enqueue(
                job,
                { id: 'later' },
                { runAt: new Date(Date.now() + 1000) }
            );
            const run = await scheduler.enqueue(job, { id: 'now' });
            expect(
                await repository.claim(
                    scheduler.namespace,
                    [{ name: job.name, version: 2 }],
                    500
                )
            ).toBeUndefined();
            const claim = (await repository.claim(
                scheduler.namespace,
                [job],
                500
            ))!;
            expect(claim.id).toBe(run.id);
            await advance(550);
            await repository.claim(scheduler.namespace, [job], 500);
            expect(await scheduler.getRun(job, run.id)).toMatchObject({
                status: 'failed',
                attempt: 1
            });
            expect(await scheduler.getRun(job, delayed.id)).toHaveProperty(
                'status',
                'queued'
            );
            expect((await scheduler.health()).queuedDefinitions).toMatchObject([
                { name: 'report', version: 1, count: 1 }
            ]);
        });
        it('cancels queued/running jobs and cleanup removes only expired terminal data', async () => {
            const { scheduler, repository, advance } = await create();
            const job = testJob({ retentionMs: 100 });
            const run = await scheduler.enqueue(
                job,
                { id: 'one' },
                { idempotencyKey: 'one' }
            );
            const claim = (await repository.claim(
                scheduler.namespace,
                [job],
                10000
            ))!;
            expect(await scheduler.cancel(run.id)).toBe(true);
            expect(await scheduler.cancel(run.id)).toBe(false);
            await expect(
                repository.report(
                    scheduler.namespace,
                    run.id,
                    claim.leaseToken!,
                    {}
                )
            ).rejects.toThrow('lease');
            const queued = await scheduler.enqueue(job, { id: 'keep' });
            await advance(150);
            expect(await scheduler.cleanup()).toBe(1);
            expect(await scheduler.getRun(job, run.id)).toBeUndefined();
            expect(await scheduler.getRun(job, queued.id)).toBeDefined();
            expect(
                await repository.events(scheduler.namespace, run.id, 0)
            ).toEqual([]);
            const again = await scheduler.enqueue(
                job,
                { id: 'one' },
                { idempotencyKey: 'one' }
            );
            expect(again.id).not.toBe(run.id);
        });
        it('rolls back state and events together when a transition fails', async () => {
            const { scheduler, repository } = await create();
            const run = await scheduler.enqueue(testJob(), { id: 'one' });
            await expect(
                repository.storage.atomic(async tx => {
                    const record = (await tx.run(
                        scheduler.namespace,
                        run.id,
                        true
                    ))!;
                    record.status = 'failed';
                    await tx.saveRun(record);
                    await tx.appendEvent({
                        runId: run.id,
                        sequence: 2,
                        attempt: 0,
                        at: 0,
                        type: 'failed',
                        data: null
                    });
                    throw new Error('rollback');
                })
            ).rejects.toThrow('rollback');
            expect(await scheduler.getRun(testJob(), run.id)).toHaveProperty(
                'status',
                'queued'
            );
            expect(
                await repository.events(scheduler.namespace, run.id, 0)
            ).toHaveLength(1);
        });
        it('preserves revisions for canonical defaults, weekday order and date input forms', async () => {
            const { scheduler } = await create();
            const register = (schedule: any) =>
                scheduler.upsertSchedule(
                    'equivalent',
                    testJob(),
                    { id: 'one' },
                    { schedule }
                );
            const startsOn = new Date('2030-01-01T00:00:00Z');
            const first = await register({
                every: 'week',
                dayOfWeek: [5, 1],
                startsOn,
                maxOccurences: 3
            });
            const second = await register({
                every: 'week',
                dayOfWeek: [1, 5],
                startsOn: startsOn.toISOString(),
                maxOccurrences: 3,
                interval: 1,
                timeZone: 'UTC',
                hour: 9,
                minute: 0,
                skipFirst: 0
            });
            expect(second).toEqual(first);
            const revised = await register({
                every: 'week',
                dayOfWeek: [1, 5],
                startsOn,
                maxOccurrences: 3,
                hour: 10
            });
            expect(revised.revision).toBe(2);
        });
        it('dispatches each occurrence once, retains cursors and revisions', async () => {
            const { scheduler, repository } = await create();
            const job = testJob();
            const options = {
                schedule: {
                    every: 'minute' as const,
                    startsOn: new Date(Date.now() - 180100)
                },
                missed: 'replay' as const
            };
            const initial = await scheduler.upsertSchedule(
                'daily',
                job,
                { id: 'one' },
                options
            );
            const counts = await Promise.all([
                scheduler.dispatch(),
                scheduler.dispatch()
            ]);
            expect(counts.reduce((a, b) => a + b)).toBe(4);
            expect(await scheduler.dispatch()).toBe(0);
            const same = await scheduler.upsertSchedule(
                'daily',
                job,
                { id: 'one' },
                options
            );
            expect(same.revision).toBe(initial.revision);
            expect(same.cursor).toBe(4);
            await scheduler.pauseSchedule('daily');
            expect(await scheduler.dispatch()).toBe(0);
            await scheduler.removeSchedule('daily');
            const updated = await scheduler.upsertSchedule(
                'daily',
                job,
                { id: 'two' },
                options
            );
            expect(updated.revision).toBe(2);
            expect(await scheduler.dispatch()).toBe(0);
            expect(
                (await repository.health(scheduler.namespace)).counts.queued
            ).toBe(4);
        });
    });
}
