# @cleverbrush/scheduler

Typed immediate, delayed and recurring jobs with durable progress. Producers,
dispatchers and workers share one execution model, with separate lifecycles.

Use [@cleverbrush/scheduler-postgres](../scheduler-postgres/README.md) for durability.
`InMemoryJobRepository` is explicitly process-local and intended for development
and tests. Upgrading? Read [v4.x → v5 migration](./MIGRATION-v5.md).

## Separate contracts and handlers

```ts
// contracts/report.ts — safe for producer processes to import
import { number, object, string } from '@cleverbrush/schema';
import { defineJob } from '@cleverbrush/scheduler';

export const Report = defineJob({
    name: 'report', version: 1,
    input: object({ reportId: string() }),
    progress: object({ percent: number() }),
    output: object({ downloadUrl: string() }),
    retry: { maxAttempts: 3 } // opt-in; default is ONE attempt
});
```

```ts
// handlers/report.ts — execution dependencies stay here
import type { JobHandler } from '@cleverbrush/scheduler';
import { Report } from '../contracts/report.js';

export const handleReport: JobHandler<typeof Report> = async (input, context) => {
    context.signal.throwIfAborted();
    await context.report({ percent: 50 }); // committed before this resolves
    // Write an idempotent result keyed by context.runId.
    return { downloadUrl: '/reports/' + input.reportId };
};
```

```ts
// infrastructure/jobs.ts
import knex from 'knex';
import { JobScheduler } from '@cleverbrush/scheduler';
import { PostgresJobRepository } from '@cleverbrush/scheduler-postgres';

export const database = knex({
    client: 'pg', connection: process.env.DATABASE_URL,
    acquireConnectionTimeout: 5000
});
export const jobs = new JobScheduler({
    storageRepository: new PostgresJobRepository(database),
    namespace: 'reports'
});
```

```ts
// producer.ts — no start() required
import { jobs } from './infrastructure/jobs.js';
import { Report } from './contracts/report.js';

const run = await jobs.enqueue(Report, { reportId: 'quarterly' }, {
    idempotencyKey: 'quarterly:2026-Q4'
});
// Persist/send run.id to your client after acceptance commits.
```

```ts
// worker.ts
import { jobs, database } from './infrastructure/jobs.js';
import { Report } from './contracts/report.js';
import { handleReport } from './handlers/report.js';

const worker = jobs.createWorker({
    jobs: [Report.handle(handleReport)], concurrency: 4
});
await worker.start();
// On application shutdown:
await worker.stop({ drainTimeoutMs: 30000 });
await jobs.stop();
await database.destroy();
```

For isolated execution, register
`Report.thread(new URL('./handlers/report-thread.js', import.meta.url))`.
That module must default-export a compatible handler. URLs come only from
trusted deployment registration, never from job input. Build the handler for
Node ESM before starting the worker. A thread is not a security sandbox.

## Progress, results and cancellation

```ts
// Authorize access to runId in your application before either operation.
const snapshot = await jobs.getRun(Report, runId);
for await (const event of jobs.events(Report, runId, {
    after: lastSeenSequence, signal: requestAbortSignal
})) {
    // Persist event.sequence as the exclusive reconnect cursor.
    // Use event.type === 'progress' to identify progress events.
    sendToClient(event);
}
await jobs.cancel(runId);
```

Events are persisted and ordered per run, including state transitions.
The stream replays after an **exclusive** sequence cursor and polls for updates
until terminal state or abort. Disconnecting a subscriber does not cancel work.
Missing or retention-deleted runs end the stream; use getRun to distinguish them
before opening it. Events/results never expose lease tokens. Namespaces partition
jobs but are **not authorization**. No HTTP, SSE, WebSocket or UI dependency is
required; the application owns transport and access control.

Input, progress and output must validate against synchronous Framework schemas
and be strict JSON before and after validation. Undefined, sparse arrays,
accessors, dates, bigint, functions, cycles and non-finite numbers are rejected.
Represent files by object-storage keys and dates by strings. No arbitrary
functions, paths or credentials are serialized. Error messages are persisted:
handlers must avoid putting secrets in them.

Schemas are checked at production, execution and observation boundaries. Keep
preprocessors deterministic and idempotent; put business transformations in
handlers instead of durable transport contracts.

## Durability and retries

Accepted PostgreSQL jobs survive process restarts. Workers claim with
transactional row locks and renewable leases. Every state/progress/output write
is fenced by the current unexpired lease. Database time controls ownership.
A worker without a matching name/version leaves the run queued; health exposes
queued definitions so deployments can detect unsupported work.

Execution is **at-least-once when retries are enabled**, not exactly-once.
A crash or timeout can occur after a business side effect and before completion
is persisted. Handlers must use idempotent effects (often keyed by runId), and
cooperate with the AbortSignal. Fencing protects scheduler records, not external
services. Job versions identify persisted contracts: introduce a new version
when changing the contract and keep handlers for outstanding old versions.

Retries are disabled by default (`maxAttempts: 1`). Lease expiry, timeout,
shutdown interruption and handler failure all consume an attempt. Explicit
retries rerun the **whole handler** with exponential capped delay. Throw
`NonRetryableJobError` for permanent failures; validation/size errors never retry.
There are no implicit checkpoints or workflow-step replay.

Cancellation immediately fences the owner and marks the run cancelled. Ordinary
functions receive cancellation on their next heartbeat or failed progress write;
they cannot be forcibly stopped. Timed-out functions retain their local worker
slot until they actually settle, while another process may retry the run.
Worker threads can be terminated. Shutdown stops claims, drains, then requests
abort; it does not wait indefinitely for a non-cooperative function. Database
calls need bounded connection/statement timeouts too. Workers are single-use.

## Recurring triggers

Schedules are schema-driven discriminated objects. Import `Schedule` (also
available as `TaskSchedule`) for the inferred type, or `ScheduleSchema` to
validate configuration, including JSON date strings:

```ts
import {
    ScheduleSchema, ScheduleCalculator, type Schedule
} from '@cleverbrush/scheduler';

const examples: Schedule[] = [
    { every: 'minute', interval: 15 },
    { every: 'day', hour: 18, minute: 30 },
    { every: 'week', dayOfWeek: [1, 5], hour: 9 },
    { every: 'month', day: 'last' },
    { every: 'year', month: 2, day: 'last' }
];
const schedule = ScheduleSchema.parse({
    every: 'week', dayOfWeek: [1, 5],
    startsOn: '2026-10-01T00:00:00Z', maxOccurrences: 10
});
const preview = new ScheduleCalculator(schedule).next();
// { date: Date, index: 1 } — public indexes are one-based.
```

`ScheduleMinuteSchema`, `ScheduleDaySchema`, `ScheduleWeekSchema`,
`ScheduleMonthSchema`, `ScheduleYearSchema` and `ScheduleSchemaBase` are
also direct exports and members of `Schemas`. Weekly schedules require
`dayOfWeek`; monthly schedules require `day`; yearly schedules require
`month` and `day`. Minute schedules reject local `hour`/`minute` fields.
The same schemas validate registration and calculator inputs.

```ts
await jobs.upsertSchedule('weekday-reports', Report, { reportId: 'daily' }, {
    schedule: {
        every: 'week', dayOfWeek: [1, 2, 3, 4, 5],
        hour: 9, minute: 0, timeZone: 'Europe/Berlin'
    },
    missed: 'coalesce', // default; alternatives: 'skip', 'replay'
    overlap: 'allow'    // default; 'skip' includes queued and retry-wait runs
});
const worker = jobs.createWorker({ jobs: [Report.handle(handleReport)] });
await worker.start(); // execute accepted runs
await jobs.start();   // dispatch recurring occurrences

// Keep the process alive until application shutdown, then:
await jobs.stop();    // stop producing occurrences first
await worker.stop({ drainTimeoutMs: 30000 });
await database.destroy();
```

See the [runnable periodic demo](../../demos/durable-jobs/README.md) for a bounded
example. Use `pauseSchedule(id)`, `pauseSchedule(id, false)` and
`removeSchedule(id)` to manage a trigger without cancelling accepted runs.

The dispatcher atomically enqueues occurrences and advances a persisted cursor.
Multiple dispatchers do not duplicate occurrences. Identical upserts retain
cursor, original start anchor and revision. Defaults, date representations,
weekday order and supported aliases are normalized before comparison; changes create a new revision for future dispatch, leaving
accepted runs intact. Pause/remove also leave accepted runs intact. Removed
triggers retain a small tombstone so recreating an ID cannot reuse old occurrence
identities.

- `minute` uses elapsed minutes from startsOn, not local wall-clock rounding.
- `day/week/month/year` use calendar arithmetic in UTC by default or an IANA zone.
  Calendar time defaults to 09:00. ISO weekdays are 1 (Monday) through 7.
- Nonexistent DST wall times are skipped. A repeated wall time executes only at
  its earlier instant.
- Month/year days are 1–28 or `'last'`; months are 1–12; interval is 1–356 (default 1).
- startsOn defaults to registration time. endsOn is inclusive. maxOccurrences
  and skipFirst count calendar slots, including skipped DST gaps, not successes.
- Coalesce enqueues the latest overdue occurrence. Skip drops an accumulated
  backlog when more than one occurrence is due. Replay materializes every due
  occurrence in bounded batches (100 per schedule/pass).
- Overlap skip consumes skipped occurrences; it does not defer them.

Calendar calculations use built-in `Date` and `Intl.DateTimeFormat` APIs;
no additional date-time package is required. IANA rules come from the Node.js
runtime's ICU data. Keep runtime/tzdata versions aligned across dispatchers
so they agree on time-zone rule updates. Calculations do not depend on the
host process's `TZ` setting.

`ScheduleCalculator` previews the same rules. Supply startsOn for reproducibility;
`next()` returns `{ date, index }` with a one-based slot index (including skipped
slots), and `hasNext()` checks exhaustion. Internal persisted cursors are zero-based.

## Limits and operations

| Setting | Default |
| --- | --- |
| Worker concurrency | 1 per worker, not a cluster quota |
| Poll interval | 1 second |
| Lease / heartbeat | 30 seconds / 10 seconds |
| Attempt timeout | 5 minutes |
| Drain timeout | 30 seconds, then up to 1 second abort grace |
| Input or output size | 1 MiB each |
| Progress event size / count | 64 KiB / 10,000 per run across attempts |
| Terminal retention | 7 days |

Definition options customize limits and retry policy; each run snapshots them.
Payload nesting is limited to 100. Terminal cleanup removes the run, attempts
and events together. Active and queued runs never expire. Workers/dispatchers
perform bounded cleanup once a minute; producer-only installations should call
`jobs.cleanup()` themselves.

Idempotency keys are scoped by namespace, job name and version. Reusing a key
with different input, runAt or policy throws `SubmissionConflictError`.
Deduplication lasts only while the run is retained. It is not permanent business
uniqueness. Identical schedule registration likewise does not act as resume;
use pauseSchedule(id, false).

`jobs.health()` returns state counts, oldest ready timestamp and queued versions.
`worker.lastError`, `jobs.lastError`, dispatcher onError and worker onDiagnostic
expose infrastructure problems without swallowing them. Diagnostics contain
identifiers, not payloads; bridge them to your logger/metrics/tracing system.
No automatic OTEL dependency is introduced.

## Adapter authors and tests

`JobRepository` implements transitions over `JobStorage.atomic()`. Custom
storage must provide detached data, rollback, atomic deduplication, exclusive
claims, row ownership locks and ordered event writes as documented by
`JobStorageTransaction`. See the shared conformance tests in
`testing/repository-contract.ts`. Memory and PostgreSQL run those same tests.

From the repository root after `npm ci && npm run build`:

```sh
npx vitest run --typecheck libs/scheduler libs/scheduler-postgres/src
SCHEDULER_TEST_DATABASE_URL=postgres://... npm run test:scheduler:integration
node demos/durable-jobs/demo.ts
```
