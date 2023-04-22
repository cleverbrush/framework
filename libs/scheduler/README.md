# Task scheduler for NodeJS

To install the scheduler, run:

```bash
    npm install @cleverbrush/scheduler
```

This library makes use of Node.js `worker_threads` module to run tasks in parallel. It's tested
on Node.js v16, but should work on older versions as well.

### An example:

```typescript
    import { JobScheduler } from '@cleverbrush/scheduler';

    const scheduler = new JobScheduler({
        rootFolder: '/some/path/to/your/tasks/root/folder'
    });

    scheduler.addJob({
        id: 'my-job-1',
        path: 'path/to/file/under/rootFolder/job1.js',
        schedule: {
            every: 'minute',
            // every 5 minutes
            interval: 5,
            timeout: 1000 * 60 * 4,
            maxRetries: 3
        }
    });

    scheduler.addJob({
        id: 'my-job-2',
        path: 'another/path/to/file/under/rootFolder/job2.js',
        schedule: {
            every: 'week',
            // every second week
            interval: 2,
            // at Monday, Wednesday and Friday
            dayOfWeek: [1, 3, 5],
            // at 9:30 AM (UTC)
            hour: 9,
            minute 30,
            timeout: 1000 * 60 * 4,
            maxRetries: 3
        }
    });

    scheduler.start();
```

This will run `job1.js` and `job2.js` according to the schedules defined in the code above.
You can subscribe to several events to get notified about the job status:

```typescript
scheduler.on(
    'job:start',
    ({ jobId, instanceId, stdout, stderr, startDate, endDate }) => {
        console.log(`Job ${jobId} started`);
    }
);

// other possible events are 'job:end', 'job:error', 'job:timeout', 'job:message'
// passing the same parameters to callback as above
```
