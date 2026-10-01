# Scheduler migration: v4.x to v5

This is a breaking scheduler redesign in the Framework v5 release train.
Do not run v4 and v5 workers against the same work queue.

## API replacements

| v4.x | v5 |
| --- | --- |
| Implicit in-memory JobScheduler persistence | Explicit repository option; PostgreSQL adapter for durability |
| rootFolder and file-oriented task registration | Versioned defineJob contract + handle(fn) or thread(fileURL) |
| IJobRepository task CRUD contract | JobRepository transition engine over transactional JobStorage |
| Auto-execution around scheduler registration | Producer enqueue, dispatcher start and worker start are separate |
| Process event listeners for progress | Durable events(definition, runId, { after, signal }) stream |
| ScheduleCalculator(schedule, startDate) | ScheduleCalculator({ ...schedule, startsOn }) |
| Date-only calculator result | next() returns { date, index } |
| maxOccurences | maxOccurrences |

Definitions require input, progress and output schemas. A no-progress or no-output
job can use null schemas and return null. Typed handlers can live in separate
modules using JobHandler<typeof Definition>. Thread modules default-export a
handler and must be built to executable ESM.

## Retry and calendar semantics

Retries require an explicit maxAttempts greater than one, including crash recovery.
Audit application-side idempotency before enabling them. The first attempt counts
toward the limit. Jobs rerun from the beginning, not from a progress checkpoint.

All calendar calculations default to UTC. Set an IANA zone explicitly for local
wall time. DST gaps are skipped and folds use the earlier instant only. Recurring
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
