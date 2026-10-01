import { describe, expect, it } from 'vitest';
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
        scheduler: new JobScheduler({ repository }),
        advance: async ms => {
            time += ms;
        }
    };
});

describe('memory repository', () => {
    it('shares detached state across repository instances', async () => {
        const storage = new InMemoryJobStorage();
        const a = new JobScheduler({
            repository: new InMemoryJobRepository({ storage })
        });
        const b = new JobScheduler({
            repository: new InMemoryJobRepository({ storage })
        });
        const run = await a.enqueue(testJob(), { id: 'one' });
        run.input = 'mutated';
        expect((await b.getRun(testJob(), run.id))!.input).toEqual({
            id: 'one'
        });
    });
    it.each([
        'coalesce',
        'skip',
        'replay'
    ] as const)('applies missed policy %s', async missed => {
        const repository = new InMemoryJobRepository();
        const scheduler = new JobScheduler({ repository });
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
    });
    it('skips overlap including already queued occurrences', async () => {
        const scheduler = new JobScheduler({
            repository: new InMemoryJobRepository()
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
