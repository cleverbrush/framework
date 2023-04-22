# Async utilities

This package contains the set of simple utilities to work with Async abstractions.

## Installation

```bash
    npm install @cleverbrush/async
```

## Usage

```typescript
import { Collector } from '@cleverbrush/async';
```

## Classes

### `Collector`

Takes the list of parameters to collect and waits until all items are collected. Extends `EventEmitter`.
Constructor supports a second optional parameter to define a timeout (`'timeout'` event will be emited).

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
    // timeout happened
});

// .........

collector.collect('firstName', 'John');
collector.collect('lastName', 'Smith');
```

Another way to use it with `Promise` approach:

```typescript
const collector = new Collector<Person>(['firstName', 'lastName'], 10000);
const promise = c.toPromise();

c.collect('firstName', 'John').collect('lastName', 'Smith');

try {
    const person: Person = await promise;
} catch (e) {
    // timeout or error occured
}
```
