/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: needed for code examples */
import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export const metadata = {
    title: 'Scheduler — @cleverbrush/scheduler',
    description:
        'Schema-validated job scheduling with worker thread isolation, retries, and event streaming.'
};

export default function SchedulerPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>Scheduler</h1>
                    <p className="subtitle">
                        Schema-validated job scheduling with worker thread
                        isolation, automatic retries, and event streaming.
                    </p>
                </div>

                {/* ── Install ─────────────────────────────────────── */}
                <div className="card">
                    <h2>Installation</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(
                                    'npm install @cleverbrush/scheduler'
                                )
                            }}
                        />
                    </pre>
                    <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>
                        Requires Node.js 16+ (uses <code>worker_threads</code>).
                    </p>
                </div>

                {/* ── Features ────────────────────────────────────── */}
                <div className="card">
                    <h2>Key features</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Worker thread isolation</td>
                                    <td>
                                        Each job runs in its own{' '}
                                        <code>Worker</code> thread — crashes
                                        never affect the scheduler
                                    </td>
                                </tr>
                                <tr>
                                    <td>5 schedule types</td>
                                    <td>
                                        Minute, day, week, month, year with
                                        configurable intervals
                                    </td>
                                </tr>
                                <tr>
                                    <td>Automatic retries</td>
                                    <td>
                                        <code>maxRetries</code> for immediate
                                        retries; <code>maxConsequentFails</code>{' '}
                                        to auto-disable flaky jobs
                                    </td>
                                </tr>
                                <tr>
                                    <td>Concurrency control</td>
                                    <td>
                                        <code>noConcurrentRuns: true</code>{' '}
                                        prevents overlapping executions
                                    </td>
                                </tr>
                                <tr>
                                    <td>Event-driven</td>
                                    <td>
                                        <code>job:start</code>,{' '}
                                        <code>job:end</code>,{' '}
                                        <code>job:error</code>,{' '}
                                        <code>job:timeout</code>,{' '}
                                        <code>job:message</code> events with
                                        stdout/stderr streams
                                    </td>
                                </tr>
                                <tr>
                                    <td>Timeout handling</td>
                                    <td>
                                        Per-job timeout with automatic worker
                                        termination
                                    </td>
                                </tr>
                                <tr>
                                    <td>Pluggable persistence</td>
                                    <td>
                                        Implement <code>IJobRepository</code>{' '}
                                        for database-backed storage (default:
                                        in-memory)
                                    </td>
                                </tr>
                                <tr>
                                    <td>Schema-validated</td>
                                    <td>
                                        All schedules validated with{' '}
                                        <code>@cleverbrush/schema</code> —
                                        export{' '}
                                        <code>Schemas.ScheduleSchema</code> for
                                        API validation
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Basic usage ─────────────────────────────────── */}
                <div className="card">
                    <h2>Basic usage</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { JobScheduler } from '@cleverbrush/scheduler';

const scheduler = new JobScheduler({
    rootFolder: '/path/to/jobs'
});

scheduler.addJob({
    id: 'cleanup',
    path: 'cleanup.js',
    schedule: { every: 'day', interval: 1, hour: 3, minute: 0 }
});

scheduler.addJob({
    id: 'weekly-report',
    path: 'report.js',
    schedule: {
        every: 'week',
        interval: 1,
        dayOfWeek: [1],  // Monday
        hour: 9,
        minute: 0
    },
    timeout: 1000 * 60 * 5,   // 5 min timeout
    maxRetries: 3,
    noConcurrentRuns: true
});

scheduler.start();`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Events ──────────────────────────────────────── */}
                <div className="card">
                    <h2>Event handling</h2>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`scheduler.on('job:start', ({ jobId, instanceId, startDate, stdout, stderr }) => {
    console.log(\`Job \${jobId} started at \${startDate}\`);
    stdout.on('data', (chunk) => process.stdout.write(chunk));
});

scheduler.on('job:end', ({ jobId, endDate }) => {
    console.log(\`Job \${jobId} completed at \${endDate}\`);
});

scheduler.on('job:error', ({ jobId, error }) => {
    console.error(\`Job \${jobId} failed:\`, error);
});

scheduler.on('job:timeout', ({ jobId }) => {
    console.warn(\`Job \${jobId} timed out — worker terminated\`);
});

scheduler.on('job:message', ({ jobId, value }) => {
    console.log(\`Message from \${jobId}:\`, value);
});`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Schedule types ──────────────────────────────── */}
                <div className="card">
                    <h2>Schedule types</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="api-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Example</th>
                                    <th>Runs</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <code>minute</code>
                                    </td>
                                    <td>
                                        <code>
                                            {
                                                '{ every: "minute", interval: 15 }'
                                            }
                                        </code>
                                    </td>
                                    <td>Every 15 minutes</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>day</code>
                                    </td>
                                    <td>
                                        <code>
                                            {
                                                '{ every: "day", interval: 1, hour: 3, minute: 0 }'
                                            }
                                        </code>
                                    </td>
                                    <td>Daily at 03:00</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>week</code>
                                    </td>
                                    <td>
                                        <code>
                                            {
                                                '{ every: "week", interval: 1, dayOfWeek: [1, 5], hour: 9, minute: 0 }'
                                            }
                                        </code>
                                    </td>
                                    <td>Mon &amp; Fri at 09:00</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>month</code>
                                    </td>
                                    <td>
                                        <code>
                                            {
                                                '{ every: "month", interval: 1, day: 1, hour: 0, minute: 0 }'
                                            }
                                        </code>
                                    </td>
                                    <td>1st of each month at midnight</td>
                                </tr>
                                <tr>
                                    <td>
                                        <code>year</code>
                                    </td>
                                    <td>
                                        <code>
                                            {
                                                '{ every: "year", interval: 1, month: 1, day: 1, hour: 0, minute: 0 }'
                                            }
                                        </code>
                                    </td>
                                    <td>Jan 1 each year at midnight</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Schedule calculator ─────────────────────────── */}
                <div className="card">
                    <h2>Schedule calculator</h2>
                    <p>
                        Use <code>ScheduleCalculator</code> standalone to
                        preview or test schedule dates without running jobs:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { ScheduleCalculator } from '@cleverbrush/scheduler';

const calc = new ScheduleCalculator(
    { every: 'week', interval: 1, dayOfWeek: [1], hour: 9, minute: 0 },
    new Date('2025-01-01')
);

while (calc.hasNext()) {
    const next = calc.next();
    console.log(next); // 2025-01-06T09:00:00, 2025-01-13T09:00:00, ...
    if (next > someCutoff) break;
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Persistence ─────────────────────────────────── */}
                <div className="card">
                    <h2>Custom persistence</h2>
                    <p>
                        By default jobs are stored in memory. Implement{' '}
                        <code>IJobRepository</code> for durable storage:
                    </p>
                    <pre>
                        <code
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`const scheduler = new JobScheduler({
    rootFolder: '/path/to/jobs',
    persistRepository: myDatabaseRepository
});`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}
