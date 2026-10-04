import { describe, expect, it, vi } from 'vitest';
import { repositoryContract, testJob } from '../testing/repository-contract.js';
import {
    InMemoryJobRepository,
    InMemoryJobStorage,
    JobScheduler
} from './index.js';

repositoryContract(async () => {
    let time = Date.now();
    const repository = new InMemoryJobRepository({ now: () => time });
    return {
        repository,
        scheduler: new JobScheduler({ storageRepository: repository }),
        advance: async ms => {
            time += ms;
        }
    };
});

describe('memory repository', () => {
    it('anchors an omitted start only once, even after the end bound has passed', async () => {
        let now = 1000;
        const jobs = new JobScheduler({
            storageRepository: new InMemoryJobRepository({ now: () => now })
        });
        const options = {
            schedule: { every: 'minute' as const, endsOn: new Date(2000) }
        };
        await jobs.upsertSchedule('once', testJob(), { id: 'one' }, options);
        expect(await jobs.dispatch()).toBe(1);
        now = 5000;
        const current = await jobs.upsertSchedule(
            'once',
            testJob(),
            { id: 'one' },
            options
        );
        expect(current).toMatchObject({
            revision: 1,
            cursor: 1,
            schedule: { startsOn: 1000 }
        });
        expect(await jobs.dispatch()).toBe(0);
    });
    it.each([
        { every: 'minute', next: '2026-01-01T09:01:00Z' },
        { every: 'day', next: '2026-01-02T09:00:00Z' },
        { every: 'week', dayOfWeek: [4], next: '2026-01-08T09:00:00Z' },
        { every: 'month', day: 1, next: '2026-02-01T09:00:00Z' },
        { every: 'year', day: 1, month: 1, next: '2027-01-01T09:00:00Z' }
    ] as const)(
        'executes periodic $every jobs with independent dispatcher and worker lifecycles',
        async ({ next, ...rule }) => {
            let now = Date.parse('2026-01-01T09:00:00Z');
            const jobs = new JobScheduler({
                storageRepository: new InMemoryJobRepository({
                    now: () => now
                }),
                pollIntervalMs: 2
            });
            const job = testJob();
            const worker = jobs.createWorker({
                pollIntervalMs: 2,
                jobs: [
                    job.handle(async (input, context) => {
                        await context.report({ percent: 100 });
                        return { url: '/' + input.id };
                    })
                ]
            });
            await jobs.upsertSchedule(
                'periodic',
                job,
                { id: 'one' },
                {
                    schedule: {
                        ...rule,
                        ...('dayOfWeek' in rule
                            ? { dayOfWeek: [...rule.dayOfWeek] }
                            : {}),
                        maxOccurrences: 2
                    }
                }
            );
            try {
                await worker.start();
                expect((await jobs.health()).counts.succeeded ?? 0).toBe(0);
                await jobs.start();
                await vi.waitFor(async () =>
                    expect((await jobs.health()).counts.succeeded).toBe(1)
                );
                now = Date.parse(next) - 1;
                expect(await jobs.dispatch()).toBe(0);
                now++;
                await vi.waitFor(async () =>
                    expect((await jobs.health()).counts.succeeded).toBe(2)
                );
                expect(await jobs.dispatch()).toBe(0);
                expect(worker.lastError).toBeUndefined();
                expect(jobs.lastError).toBeUndefined();
            } finally {
                await jobs.stop();
                await worker.stop();
            }
        }
    );
    it('shares detached state across repository instances', async () => {
        const storage = new InMemoryJobStorage();
        const a = new JobScheduler({
            storageRepository: new InMemoryJobRepository({ storage })
        });
        const b = new JobScheduler({
            storageRepository: new InMemoryJobRepository({ storage })
        });
        const run = await a.enqueue(testJob(), { id: 'one' });
        run.input = 'mutated';
        expect((await b.getRun(testJob(), run.id))!.input).toEqual({
            id: 'one'
        });
    });
    it.each(['coalesce', 'skip', 'replay'] as const)(
        'applies missed policy %s',
        async missed => {
            const repository = new InMemoryJobRepository();
            const scheduler = new JobScheduler({
                storageRepository: repository
            });
            await scheduler.upsertSchedule(
                'one',
                testJob(),
                { id: 'one' },
                {
                    schedule: {
                        every: 'minute',
                        startsOn: new Date(Date.now() - 600000)
                    },
                    missed
                }
            );
            expect(await scheduler.dispatch()).toBe(
                missed === 'coalesce' ? 1 : missed === 'skip' ? 0 : 11
            );
            expect(await scheduler.dispatch()).toBe(0);
        }
    );
    it('skips overlap including already queued occurrences', async () => {
        const scheduler = new JobScheduler({
            storageRepository: new InMemoryJobRepository()
        });
        await scheduler.upsertSchedule(
            'one',
            testJob(),
            { id: 'one' },
            {
                schedule: {
                    every: 'minute',
                    startsOn: new Date(Date.now() - 600000)
                },
                missed: 'replay',
                overlap: 'skip'
            }
        );
        expect(await scheduler.dispatch()).toBe(1);
    });
});
