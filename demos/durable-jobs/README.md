# Durable job contracts and separated handlers

After npm ci and npm run build, run `node demos/durable-jobs/demo.ts`
with Node 24. It prints queued, running, progress and succeeded events, then
the typed result. This small example deliberately uses process-local memory.

The core scheduler README shows PostgreSQL setup for real durability.
The sibling crash-worker.mjs and thread-handler.mjs are process-level fixtures
exercised by the scheduler integration and packaged-thread tests, respectively.
