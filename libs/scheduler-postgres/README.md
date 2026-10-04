# @cleverbrush/scheduler-postgres
<!-- coverage-badge-start -->
![Unit coverage](https://img.shields.io/badge/unit_coverage-11.2%25-red)
<!-- coverage-badge-end -->

PostgreSQL persistence for [@cleverbrush/scheduler](../scheduler/README.md).
Uses @cleverbrush/orm and @cleverbrush/knex-schema for schemas, migrations and
routine queries. Isolated native queries provide database-time leases,
SKIP LOCKED row claims and aggregate health checks.

## Install and migrate

```sh
npm install @cleverbrush/scheduler @cleverbrush/scheduler-postgres knex pg
```

```ts
// An explicit migration, invoked once by your existing migration runner.
import { createSchedulerTables, dropSchedulerTables } from '@cleverbrush/scheduler-postgres';
import type { Knex } from 'knex';

export const up = (knex: Knex) => createSchedulerTables(knex);
export const down = (knex: Knex) => dropSchedulerTables(knex);
```

Down is destructive: it deletes runs, schedules, progress and attempts.
No migration runs implicitly when constructing a repository or starting workers.
A tablePrefix option (default cb_jobs) supports separate storage ownership.
Use exactly the same prefix for migrations and repositories.

```ts
import knex from 'knex';
import { JobScheduler } from '@cleverbrush/scheduler';
import { PostgresJobRepository } from '@cleverbrush/scheduler-postgres';

const database = knex({
    client: 'pg', connection: process.env.DATABASE_URL,
    pool: { min: 0, max: 10 }, acquireConnectionTimeout: 5000
});
const jobs = new JobScheduler({
    storageRepository: new PostgresJobRepository(database),
    namespace: 'reporting'
});
```

The adapter does not close the caller's pool. Stop workers and dispatchers first,
then database.destroy(). Use PostgreSQL's default READ COMMITTED isolation.
Transitions set local lock and statement timeouts (5 and 15 seconds). Configure
connection acquisition and network timeouts for your deployment as well.

## Transactional enqueue

```ts
await database.transaction(async transaction => {
    // Write application data using this same transaction.
    const producer = new JobScheduler({
        storageRepository: new PostgresJobRepository(transaction),
        namespace: 'reporting'
    });
    await producer.enqueue(Report, { reportId }, { idempotencyKey: reportId });
});
```

The enqueue resolves within a savepoint; durable acceptance occurs only when the
outer transaction commits. Rollback removes both the application write and job.
Do not create/start workers on a transaction-bound repository. Local timeout
settings also apply to the enclosing transaction after savepoint release.

## Storage and guarantees

Four library-owned tables store runs, attempts, events and recurring triggers.
Indexed scalar columns support claims, expiry, overlap and health queries.
Opaque strict-JSON record snapshots are stored as text so arbitrary validated
payloads do not need application-specific database schemas or lossy driver
decoding. Large artifacts belong in object storage, referenced by payload keys.

Unique namespace/dedupe keys protect concurrent producers. Locked schedule
cursors and occurrence keys protect competing dispatchers. State transitions,
attempt history and ordered events commit together. Cleanup cascades dependent
events and attempts, but never removes active jobs or triggers.

The repository uses PostgreSQL clock_timestamp for lease decisions, not worker
wall clocks. Expired owners cannot resurrect a lease. Physical job side effects
remain at-least-once: see the core guide's retry/idempotency rules.

Integration tests require a disposable PostgreSQL database. They create unique
table prefixes and drop only those tables:

```sh
SCHEDULER_TEST_DATABASE_URL=postgres://... npm run test:scheduler:integration
```

Tests exercise competing producers/workers/dispatchers, rollback, SKIP LOCKED,
lease expiry, retention and SIGKILL/restart recovery. CI runs them on PostgreSQL 16.
