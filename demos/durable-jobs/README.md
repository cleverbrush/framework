# Durable job contracts and separated handlers

After npm ci and npm run build, run `node demos/durable-jobs/demo.ts`
with Node 24. It prints queued, running, progress and succeeded events, then
the typed result. This small example deliberately uses process-local memory.

The core scheduler README shows PostgreSQL setup for real durability.
The sibling crash-worker.mjs and thread-handler.mjs are process-level fixtures
exercised by the scheduler integration and packaged-thread tests, respectively.

## Periodic execution

Run `node demos/durable-jobs/periodic.ts` to execute two reports one minute
apart. The example validates a minute schedule, registers it with
`upsertSchedule`, starts both the dispatcher and worker, waits for both
completed runs, and stops dispatch before draining the worker.

For a fast smoke test, run `node demos/durable-jobs/periodic.ts --fast`.
Only this example's in-memory repository clock advances by one minute after
the first completion; the periodic dispatcher and worker still execute normally.
CI runs this mode. This is a test/demo clock, not a production scheduling option.
Choose PostgreSQL via `storageRepository` for restart-safe recurring jobs.
