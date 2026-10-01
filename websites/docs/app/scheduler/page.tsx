/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: trusted highlighted examples */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';
import { docsMetadata } from '../site';

export const metadata = docsMetadata('/scheduler');

const contract = `// contracts/report.ts
import { object, string, number } from '@cleverbrush/schema';
import { defineJob } from '@cleverbrush/scheduler';

export const Report = defineJob({
    name: 'report', version: 1,
    input: object({ reportId: string() }),
    progress: object({ percent: number() }),
    output: object({ downloadUrl: string() }),
    retry: { maxAttempts: 3 } // opt-in; default: one attempt
});`;

const handler = `// handlers/report.ts — strong types across file boundaries
import type { JobHandler } from '@cleverbrush/scheduler';
import { Report } from '../contracts/report.js';

export const handleReport: JobHandler<typeof Report> = async (input, context) => {
    context.signal.throwIfAborted();
    await context.report({ percent: 50 }); // persisted before resolving
    return { downloadUrl: '/reports/' + input.reportId };
};`;

const runtime = `import knex from 'knex';
import { JobScheduler } from '@cleverbrush/scheduler';
import { PostgresJobRepository } from '@cleverbrush/scheduler-postgres';
import { Report } from './contracts/report.js';
import { handleReport } from './handlers/report.js';

const database = knex({
    client: 'pg', connection: process.env.DATABASE_URL,
    acquireConnectionTimeout: 5000
});
const jobs = new JobScheduler({
    repository: new PostgresJobRepository(database),
    namespace: 'reports'
});
const run = await jobs.enqueue(Report, { reportId: 'quarterly' }, {
    idempotencyKey: 'quarterly:2026-Q4'
});
const worker = jobs.createWorker({
    jobs: [Report.handle(handleReport)], concurrency: 4
});
await worker.start();
for await (const event of jobs.events(Report, run.id)) {
    console.log(event.sequence, event.type, event.data);
}
// On shutdown, stop workers before closing the caller-owned pool.
await worker.stop();
await jobs.stop();
await database.destroy();`;

const recurring = `await jobs.upsertSchedule('weekday-reports', Report, { reportId: 'daily' }, {
    schedule: {
        every: 'week', dayOfWeek: [1, 2, 3, 4, 5],
        hour: 9, minute: 0, timeZone: 'Europe/Berlin'
    },
    missed: 'coalesce', // or skip / replay
    overlap: 'allow'    // or skip
});
await jobs.start(); // starts dispatch, not workers
await jobs.pauseSchedule('weekday-reports');
await jobs.pauseSchedule('weekday-reports', false);
await jobs.removeSchedule('weekday-reports');`;

export default function SchedulerPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Durable jobs and progress</h1>
                    <p className="subtitle">
                        Typed immediate, delayed and recurring jobs with
                        PostgreSQL persistence and replayable progress.
                    </p>
                </div>
                <div className="card">
                    <h2>Install and migrate</h2>
                    <pre>
                        <code>
                            npm install @cleverbrush/scheduler
                            @cleverbrush/scheduler-postgres knex pg
                        </code>
                    </pre>
                    <p>
                        Run createSchedulerTables(database) once through your
                        migration runner. Workers never create or alter tables
                        implicitly. For development, explicitly choose
                        InMemoryJobRepository; its state does not survive
                        process exits.
                    </p>
                    <p>
                        <a href="https://github.com/cleverbrush/framework/blob/development/libs/scheduler-postgres/README.md">
                            PostgreSQL setup and transactional enqueue
                        </a>
                        {' · '}
                        <a href="https://github.com/cleverbrush/framework/blob/development/libs/scheduler/MIGRATION-v5.md">
                            Migration from v4.x to v5
                        </a>
                    </p>
                </div>
                <div className="card">
                    <h2>Contracts and handlers in separate files</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(contract)
                            }}
                        />
                    </pre>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(handler)
                            }}
                        />
                    </pre>
                    <p>
                        Input, progress and output use synchronous Framework
                        schemas and strict JSON values. Store file references
                        and date strings rather than binary files or Date
                        instances. Job versions identify persisted contracts;
                        keep handlers for versions still in the queue.
                    </p>
                </div>
                <div className="card">
                    <h2>Produce, execute and observe</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(runtime)
                            }}
                        />
                    </pre>
                    <p>
                        Producer processes need no start call. Workers and
                        recurring dispatchers have independent lifecycles and
                        may run in separate processes. Register a trusted
                        compiled module with Report.thread(new URL(...)) to use
                        worker threads.
                    </p>
                    <p>
                        events accepts an exclusive after sequence cursor and an
                        AbortSignal. It replays committed events and follows
                        until terminal state or disconnect. Disconnecting does
                        not cancel work. Use cancel(runId) explicitly.
                        Applications own authentication, authorization and
                        SSE/WebSocket/HTTP transport; namespaces are not access
                        control.
                    </p>
                </div>
                <div className="card">
                    <h2>Retries and ownership</h2>
                    <p>
                        Retries are opt-in and rerun the whole handler. Leases
                        fence stale state writes, but they cannot undo business
                        side effects. Execution with retries is at-least-once,
                        not exactly-once: use idempotent effects keyed by runId.
                        A timeout, crash or shutdown consumes an attempt. Throw
                        NonRetryableJobError for permanent failures.
                    </p>
                    <p>
                        Ordinary functions must cooperate with their AbortSignal
                        and retain their local concurrency slot until they
                        settle. Worker threads can be terminated. PostgreSQL
                        claims use database time and row locks; accepted work
                        and progress survive process restarts.
                    </p>
                </div>
                <div className="card">
                    <h2>Recurring triggers</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(recurring)
                            }}
                        />
                    </pre>
                    <p>
                        Recurring occurrences are enqueued through the same
                        worker engine. Identical registrations preserve cursors;
                        updates affect future dispatch only. Pause/remove do not
                        cancel accepted runs.
                    </p>
                    <p>
                        Minutes use elapsed time. Days, weeks, months and years
                        use UTC or explicit IANA calendar time. DST gaps are
                        skipped; repeated wall times use the earlier instant
                        once. Monthly days are 1–28 or last. Missed occurrences
                        coalesce by default; skip drops backlogs and replay
                        enqueues bounded batches. Overlap skip includes queued
                        and retry-wait work.
                    </p>
                </div>
                <div className="card">
                    <h2>Limits and operations</h2>
                    <p>
                        Defaults: concurrency 1, polling 1 second, lease 30
                        seconds, heartbeat 10 seconds, attempt timeout 5
                        minutes, terminal retention 7 days. Payloads are limited
                        to 1 MiB, progress to 64 KiB per event and 10,000 events
                        per run. Define policies explicitly when changing these
                        limits.
                    </p>
                    <p>
                        health returns queue counts, ready age and queued
                        definition versions. lastError and diagnostic callbacks
                        expose infrastructure failures. Cleanup removes terminal
                        runs and their history only; deduplication lasts for
                        retained runs, not forever.
                    </p>
                    <p>
                        <a href="https://github.com/cleverbrush/framework/blob/development/libs/scheduler/README.md">
                            Complete API guide
                        </a>
                        {' · '}
                        <a href="https://github.com/cleverbrush/framework/tree/development/demos/durable-jobs">
                            Runnable multi-file example
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
