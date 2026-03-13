# @cleverbrush/async

A set of simple utilities for working with asynchronous operations.

## Installation

```bash
npm install @cleverbrush/async
```

## Usage

```typescript
import { Collector, debounce, throttle, retry } from '@cleverbrush/async';
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

## License

BSD-3-Clause
