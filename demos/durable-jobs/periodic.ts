import { setTimeout as delay } from 'node:timers/promises';
import { InMemoryJobRepository, JobScheduler, ScheduleSchema } from '@cleverbrush/scheduler';
import { Report } from './contracts.ts';
import { handleReport } from './handler.ts';

// --fast advances only this demo's in-memory clock after the first completion.
const fast = process.argv.includes('--fast');
let clock = Date.now();
const jobs = new JobScheduler({
    storageRepository: new InMemoryJobRepository({ now: () => fast ? clock : Date.now() }),
    pollIntervalMs: 10
});
const worker = jobs.createWorker({ jobs: [Report.handle(handleReport)], pollIntervalMs: 10 });
await jobs.upsertSchedule('minute-report', Report, { reportId: 'periodic' }, {
    schedule: ScheduleSchema.parse({ every: 'minute', interval: 1, maxOccurrences: 2 }),
    missed: 'coalesce', overlap: 'skip'
});

try {
    await worker.start(); // Executes jobs accepted by the dispatcher.
    await jobs.start(); // Materializes due occurrences, not handler execution.
    const deadline = Date.now() + (fast ? 5000 : 65000);
    let advanced = false;
    for (;;) {
        const completed = (await jobs.health()).counts.succeeded ?? 0;
        if (completed === 2) {
            console.log('Completed both periodic reports.');
            break;
        }
        if (jobs.lastError) throw jobs.lastError;
        if (worker.lastError) throw worker.lastError;
        if (Date.now() > deadline) throw new Error('Periodic demo timed out');
        if (fast && completed === 1 && !advanced) {
            clock += 60000;
            advanced = true;
        }
        await delay(10);
    }
} finally {
    await jobs.stop(); // Stop producing before draining the worker.
    await worker.stop();
}
