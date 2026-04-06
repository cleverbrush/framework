# @cleverbrush/scheduler
<!-- coverage-badge-start -->![Coverage](https://img.shields.io/badge/coverage-88.2%25-green)<!-- coverage-badge-end -->

A job scheduler for Node.js that runs tasks in worker threads on configurable schedules.

## Installation

```bash
npm install @cleverbrush/scheduler
```

This library uses the Node.js `worker_threads` module. It is tested on Node.js v16+.

## Quick Start

```typescript
import { JobScheduler } from '@cleverbrush/scheduler';

const scheduler = new JobScheduler({
    rootFolder: '/path/to/your/jobs'
});

scheduler.addJob({
    id: 'my-job-1',
    path: 'job1.js',
    schedule: {
        every: 'minute',
        interval: 5
    }
});

scheduler.addJob({
    id: 'my-job-2',
    path: 'job2.js',
    schedule: {
        every: 'week',
        interval: 2,
        dayOfWeek: [1, 3, 5],
        hour: 9,
        minute: 30
    },
    timeout: 1000 * 60 * 4,
    maxRetries: 3
});

scheduler.start();
```

## API

### `JobScheduler`

The main class for scheduling and running jobs. Extends `EventEmitter`.

#### Constructor

```typescript
const scheduler = new JobScheduler(props: JobSchedulerProps);
```

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `rootFolder` | `string` | — | Path to the folder containing job files |
| `defaultTimeZone` | `string` | `'UTC'` | Timezone used for scheduling |

#### Methods

| Method | Description |
| --- | --- |
| `start()` | Starts the scheduler |
| `stop()` | Stops the scheduler |
| `addJob(job)` | Adds a job to the scheduler |
| `removeJob(jobId)` | Removes a job by ID |
| `jobExists(jobId)` | Returns `true` if a job with the given ID exists |
| `status` | Current scheduler status: `'started'` or `'stopped'` |

#### Events

```typescript
scheduler.on('job:start', ({ jobId, instanceId, startDate }) => {
    console.log(`Job ${jobId} started`);
});

scheduler.on('job:end', ({ jobId, instanceId, startDate, endDate, stdout, stderr }) => {
    console.log(`Job ${jobId} finished`);
});

scheduler.on('job:error', ({ jobId, instanceId, startDate, endDate, stdout, stderr }) => {
    console.error(`Job ${jobId} failed`);
});

scheduler.on('job:timeout', ({ jobId, instanceId, startDate, endDate }) => {
    console.warn(`Job ${jobId} timed out`);
});

scheduler.on('job:message', ({ jobId, instanceId, message }) => {
    console.log(`Message from ${jobId}:`, message);
});
```

### Job Configuration

```typescript
scheduler.addJob({
    id: 'unique-job-id',
    path: 'relative/path/to/job.js',
    schedule: { /* see Schedule Types */ },
    timeout: 60000,                // timeout in milliseconds
    maxRetries: 3,                 // retry on failure
    maxConsequentFails: 10,        // disable after N consecutive failures
    noConcurrentRuns: true,        // prevent overlapping executions
    props: { key: 'value' }        // data passed to the worker
});
```

### Schedule Types

All schedules share these optional properties:

| Property | Type | Description |
| --- | --- | --- |
| `interval` | `number` | Number of periods between repeats (1–356) |
| `startsOn` | `Date` | Do not start before this date |
| `endsOn` | `Date` | Do not repeat after this date |
| `maxOccurences` | `number` | Maximum number of executions |
| `skipFirst` | `number` | Skip this many initial executions |

#### Minute

```typescript
{ every: 'minute', interval: 5 }
```

Runs every N minutes.

#### Day

```typescript
{ every: 'day', interval: 1, hour: 9, minute: 30 }
```

Runs every N days at the specified time.

#### Week

```typescript
{ every: 'week', interval: 2, dayOfWeek: [1, 3, 5], hour: 9, minute: 30 }
```

Runs every N weeks on the specified days (1 = Monday, 7 = Sunday).

#### Month

```typescript
{ every: 'month', interval: 1, day: 15, hour: 0, minute: 0 }
// or on the last day of the month:
{ every: 'month', interval: 1, day: 'last', hour: 0, minute: 0 }
```

Runs every N months on the specified day (1–28 or `'last'`).

#### Year

```typescript
{ every: 'year', interval: 1, month: 6, day: 1, hour: 12, minute: 0 }
```

Runs every N years on the specified month (1–12) and day (1–28 or `'last'`).

## License

BSD-3-Clause
