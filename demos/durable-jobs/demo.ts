import { JobScheduler, InMemoryJobRepository } from '@cleverbrush/scheduler';
import { Report } from './contracts.ts';
import { handleReport } from './handler.ts';

const jobs = new JobScheduler({ storageRepository: new InMemoryJobRepository(), pollIntervalMs: 10 });
const worker = jobs.createWorker({ jobs: [Report.handle(handleReport)], pollIntervalMs: 10 });
const run = await jobs.enqueue(Report, { reportId: 'quarterly' });
await worker.start();
try {
    for await (const event of jobs.events(Report, run.id)) {
        console.log(event.sequence, event.type, event.data);
    }
    const snapshot = await jobs.getRun(Report, run.id);
    console.log(snapshot?.status, snapshot?.output);
    if (snapshot?.status !== 'succeeded') process.exitCode = 1;
} finally { await worker.stop(); }
