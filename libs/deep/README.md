# Deep operations on objects

This is yet another library which provides operations over JavaScript objects, like deep compare and deep merge.

## Installation

    npm install @cleverbrush/deep

## Usage

```typescript
import deep from '@cleverbrush/deep';
// or import functions individually
import { deepEqual, deepExtend } from '@cleverbrush/deep';
```

## Functions

### deepEqual

Takes two objects as parameters, compares it recursively and returns `true` if they are equal or `false` in other case.

```typescript
import { deepEqual } from '@cleverbrush/deep';

const equal1 = deepEqual({ a: { b: 1 } }, { a: { b: 1 } });
// equal1 === true

const equal2 = deepEqual({ a: { b: 1 } }, { a: { b: 20 } });
// equal2 === false

const equal3 = deepEqual({ a: { b: 1, c: 2 } }, { a: { b: 20 } });
// equal3 === false
```

### deepExtend

Works similary to `Object.extend`, but respects the deep structure of objects.

```typescript
import { deepExtend } from '@cleverbrush/deep';

deepExtend(
    {},
    {
        a: 'something',
        name: {
            first: 'Ivan'
        }
    },
    {
        name: {
            last: 'Ivanov'
        }
    }
);
```

will return the following object:

```typescript
    {
        a: 'something',
        name: {
            first: 'Ivan',
            last: 'Ivanov'
        }
    }
```

### deepFlatten

Flattens an object to a single level. Accepts an optional separator as a second parameter.
If no separator is provided, the default separator is `.`.
Supports only objects with string keys. Supports nested objects of any depth.
Throws an error if the object contains circular references.

```typescript
import { deepFlatten } from '@cleverbrush/deep';

deepFlatten({
    a: {
        b: 1,
        c: 2
    },
    d: 3
});

// => { 'a.b': 1, 'a.c': 2, d: 3 }

deepFlatten(
    {
        a: {
            b: 1,
            c: 2
        },
        d: {
            e: {
                f: 3
            }
        }
    },
    '-'
);

// => { 'a-b': 1, 'a-c': 2, 'd-e-f': 3 }
```
