# @cleverbrush/async

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)
<!-- coverage-badge-start -->
![Coverage](https://img.shields.io/badge/coverage-93.6%25-brightgreen)
<!-- coverage-badge-end -->

A set of simple utilities for working with asynchronous operations.

## Installation

```bash
npm install @cleverbrush/async
```

## Usage

```typescript
import { Collector, debounce, throttle, retry, withTimeout, dedupe } from '@cleverbrush/async';
```

## API

### `Collector<T>`

Collects a set of named values and emits an event when all items have been collected. Extends `EventEmitter`. The constructor accepts a list of keys to collect and an optional timeout in milliseconds.

```typescript
type Person = {
    firstName: string;
    lastName: string;
};

const collector = new Collector<Person>(['firstName', 'lastName'], 10000);

collector.on('end', (collectedObject: Person) => {
    console.log(collectedObject);
});

collector.on('timeout', (collectedData: Partial<Person>) => {
    // timeout reached before all items were collected
});

collector.collect('firstName', 'John');
collector.collect('lastName', 'Smith');
```

The `Collector` can also be used with a `Promise`-based approach:

```typescript
const collector = new Collector<Person>(['firstName', 'lastName'], 10000);
const promise = collector.toPromise();

collector.collect('firstName', 'John').collect('lastName', 'Smith');

try {
    const person: Person = await promise;
} catch (e) {
    // timeout or error occurred
}
```

### `debounce(func, wait, opts?)`

Ensures a function is only called after a specified delay since the last invocation. Useful for handling rapid user input such as search fields or window resizing.

**Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `func` | `(...args) => void` | The function to debounce |
| `wait` | `number` | Delay in milliseconds |
| `opts.immediate` | `boolean` | If `true`, calls the function immediately on the first invocation, then debounces subsequent calls. Default: `false` |

```typescript
import { debounce } from '@cleverbrush/async';

const debouncedSearch = debounce((query: string) => {
    // perform search
}, 300);

// called rapidly, but only the last call executes after 300ms of inactivity
debouncedSearch('h');
debouncedSearch('he');
debouncedSearch('hello');
```

### `throttle(func, limit)`

Ensures a function is called at most once per specified interval. Unlike `debounce`, it guarantees regular execution during sustained activity.

**Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `func` | `(...args) => void` | The function to throttle |
| `limit` | `number` | Minimum interval in milliseconds between calls |

```typescript
import { throttle } from '@cleverbrush/async';

const throttledResize = throttle(() => {
    // handle resize
}, 200);

window.addEventListener('resize', throttledResize);
```

### `retry(fn, options?)`

Retries an async function with exponential backoff on failure. Returns the result of the first successful attempt.

**Parameters:**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `fn` | `() => Promise<T>` | — | The async function to retry |
| `options.maxRetries` | `number` | `3` | Maximum number of retry attempts |
| `options.minDelay` | `number` | `100` | Minimum delay in milliseconds before the first retry |
| `options.delayFactor` | `number` | `2` | Multiplier applied to the delay after each retry |
| `options.delayRandomizationPercent` | `number` | `0` | Randomization factor (`0`–`1`) added to each delay |
| `options.shouldRetry` | `(error) => boolean` | — | Optional predicate to decide whether to retry a given error |

```typescript
import { retry } from '@cleverbrush/async';

const data = await retry(
    () => fetch('https://api.example.com/data').then((r) => r.json()),
    {
        maxRetries: 5,
        minDelay: 200,
        delayFactor: 2,
        shouldRetry: (err) => err.status !== 404
    }
);
```

### `withTimeout(fn, ms)`

Wraps a promise-returning function with a timeout. If the function does not resolve within `ms` milliseconds, the returned promise rejects with a `TimeoutError` and the internal `AbortSignal` is triggered.

**Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `fn` | `(signal: AbortSignal) => Promise<T>` | The async function to wrap. Receives an `AbortSignal` that fires on timeout. |
| `ms` | `number` | Timeout in milliseconds |

```typescript
import { withTimeout } from '@cleverbrush/async';

const data = await withTimeout(
    (signal) => fetch('/api/slow', { signal }).then(r => r.json()),
    5000
);
```

### `dedupe(keyFn, fn)`

Deduplicates concurrent calls to the same async function. If a call with the same key is already in-flight, returns the existing promise instead of starting a new one.

**Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `keyFn` | `(...args) => string` | Computes a cache key from the arguments |
| `fn` | `(...args) => Promise<T>` | The async function to wrap |

```typescript
import { dedupe } from '@cleverbrush/async';

const fetchUser = dedupe(
    (id: number) => `user-${id}`,
    (id: number) => fetch(`/api/users/${id}`).then(r => r.json())
);

// These two concurrent calls share a single fetch:
const [a, b] = await Promise.all([fetchUser(1), fetchUser(1)]);
```

## Code Quality

- **Linting:** [Biome](https://biomejs.dev/) — enforced on every PR via CI
- **Type checking:** TypeScript strict mode
- **Unit tests:** [Vitest](https://vitest.dev/) — covering `Collector` event/promise modes, debounce/throttle timing, and retry back-off logic
- **CI:** Every pull request must pass lint + build + test before merge — see [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

## License

BSD-3-Clause
