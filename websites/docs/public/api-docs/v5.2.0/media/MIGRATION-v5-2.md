# Scheduler migration: v4.x to v5

This is a breaking scheduler redesign in the Framework v5 release train.
Do not run v4 and v5 workers against the same work queue.

## API replacements

| v4.x | v5 |
| --- | --- |
| Implicit in-memory JobScheduler persistence | Explicit storageRepository option; PostgreSQL adapter for durability |
| rootFolder and file-oriented task registration | Versioned defineJob contract + handle(fn) or thread(fileURL) |
| IJobRepository task CRUD contract | JobRepository transition engine over transactional JobStorage |
| Auto-execution around scheduler registration | Producer enqueue, dispatcher start and worker start are separate |
| Process event listeners for progress | Durable events(definition, runId, { after, signal }) stream |
| maxOccurences | maxOccurrences (deprecated spelling still accepted; do not supply both) |

Definitions require input, progress and output schemas. A no-progress or no-output
job can use null schemas and return null. Typed handlers can live in separate
modules using JobHandler<typeof Definition>. Thread modules default-export a
handler and must be built to executable ESM.

## Schedule definitions are retained

The minute/day/week/month/year objects, `Schedule` type and schedule members
of `Schemas` remain supported. Schemas are now also direct exports, and
`TaskSchedule` aliases the inferred `Schedule` union. Pass the schedule to
`upsertSchedule(id, Definition, input, { schedule })`; do not restore
`addJob`, `rootFolder` or the old file-based worker registration.

```ts
const schedule = {
    every: 'week' as const, interval: 2, dayOfWeek: [1, 5],
    hour: 9, startsOn: new Date('2026-10-01T00:00:00Z'),
    maxOccurences: 10 // accepted for migration; prefer maxOccurrences
};
await jobs.upsertSchedule('weekly-report', Report, { reportId: 'weekly' }, {
    schedule, missed: 'coalesce', overlap: 'skip'
});
// Register Report.handle(handleReport), start the worker and jobs.start().
```

`ScheduleCalculator(schedule)` still accepts one schedule and `next()` still
returns `{ date, index }` with a one-based index. Dates may be validated from
JSON strings through `ScheduleSchema.parse`. The deprecated `maxOccurences`
alias normalizes to `maxOccurrences`; supplying both throws, even if equal.
`interval` now defaults to 1 and `skipFirst` can be 0. Fractional calendar
components, duplicate weekdays, irrelevant variant fields and invalid dates
are rejected. Weekly, monthly and yearly identifying fields remain required.

## Retry and calendar semantics

Retries require an explicit maxAttempts greater than one, including crash recovery.
Audit application-side idempotency before enabling them. The first attempt counts
toward the limit. Jobs rerun from the beginning, not from a progress checkpoint.

All calendar calculations default to UTC. Set an IANA zone explicitly for local
wall time. DST gaps are skipped and folds use the earlier instant only. Weekly intervals are anchored consistently to the week containing startsOn,
including when all selected weekdays in that first week have passed. Recurring
triggers persist schedule-slot cursors; occurrence limits count slots, not
successful executions. Missed triggers coalesce by default.

## Rollout

1. Stop/drain v4 workers. Inventory pending jobs and recurring registrations.
   There is no universal migration from custom v4 repository data.
2. Install scheduler and scheduler-postgres from the same v5 release.
3. Run createSchedulerTables through your database migration runner.
   Existing v4 tables are neither read nor modified.
4. Define versioned contracts and register handlers. Import pending jobs with
   stable application idempotency keys; do not blindly rerun completed work.
5. Register schedules with explicit time zones and missed/overlap policies.
6. Start workers and dispatchers separately. Verify health and progress replay.
7. Keep needed old definition versions deployed until those v5 runs drain.

Only install the PostgreSQL adapter in server processes. The application owns
the database pool, authorization, progress transport and shutdown hooks.
See the [current guide](./README.md) and [PostgreSQL setup](../scheduler-postgres).
