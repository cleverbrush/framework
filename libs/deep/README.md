# @cleverbrush/deep

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)
<!-- coverage-badge-start -->
![Coverage](https://img.shields.io/badge/coverage-97.8%25-brightgreen)
<!-- coverage-badge-end -->

A library for deep operations on JavaScript objects — cloning, equality, merging, and flattening.

## Installation

```bash
npm install @cleverbrush/deep
```

## Usage

```typescript
import { deepClone, deepEqual, deepExtend, deepFlatten } from '@cleverbrush/deep';
```

## API

### `deepClone<T>(value: T): T`

Creates an isolated copy of plain data while preserving its TypeScript type.

```typescript
import { deepClone } from '@cleverbrush/deep';

const input = { tags: ['a'], savedAt: new Date(1) };
const snapshot = deepClone(input);
input.tags.push('b');
input.savedAt.setTime(2);
// snapshot is still { tags: ['a'], savedAt: new Date(1) }
```

| Value | `deepClone` | `deepEqual` |
| --- | --- | --- |
| Primitives, functions | Returned unchanged | `Object.is` |
| Plain objects (including null prototypes) | Recursively cloned; prototype preserved | Enumerable own properties compared structurally; null and ordinary prototypes may compare equal |
| Arrays | Recursively cloned; length and holes preserved | Length, holes, elements and enumerable extra properties compared |
| Dates | Cloned by timestamp, including invalid dates | Timestamps compared with `Object.is`; two invalid dates compare equal |
| Files, Maps, Sets, typed arrays, custom instances and other objects | Returned by reference | Identity only |

Cloning preserves cycles and repeated references, including shared Dates. Own
enumerable string and symbol properties are copied as writable data properties.
Getters are read once per copied property; accessor descriptors, non-enumerable
properties and frozen/sealed state are not preserved. Date timestamps and array
length are copied explicitly. Special keys such as `__proto__` are defined as own
properties without invoking inherited setters. This is a data snapshot utility,
not a clone of arbitrary object internals or a replacement for serialization.

### `deepEqual(a, b, options?)`

Recursively compares supported data values according to the table above. It handles
nulls and cycles, and does not require identical reference-sharing topology: one
shared child can compare equal to two separate, structurally equal children. Object
key order does not matter; symbol keys participate by identity. Dates compare only
their timestamps, not extra properties. Other opaque objects are never traversed.

Primitives follow `Object.is`: `NaN` equals `NaN`, but `0` differs from `-0`.
Array holes differ from explicit `undefined`. With `disregardArrayOrder`, each
element must match one unused element on the other side, preserving duplicate and
hole counts. Named/symbol array properties still compare by key. Inputs are not
sorted or mutated, and hash collisions cannot decide equality. Unordered matching
can require quadratic comparisons; prefer ordered equality for large arrays.

**Parameters:**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `a` | `any` | — | First value |
| `b` | `any` | — | Second value |
| `options.disregardArrayOrder` | `boolean` | `false` | When `true`, arrays are treated as equal regardless of element order |

```typescript
import { deepEqual } from '@cleverbrush/deep';

deepEqual({ a: { b: 1 } }, { a: { b: 1 } });
// => true

deepEqual({ a: { b: 1 } }, { a: { b: 20 } });
// => false

deepEqual({ a: { b: 1, c: 2 } }, { a: { b: 1 } });
// => false

// Array order can be ignored
deepEqual([1, 2, 3], [3, 1, 2], { disregardArrayOrder: true });
// => true

deepEqual([1, 1, 2], [1, 2, 2], { disregardArrayOrder: true });
// => false (duplicate counts differ)

deepEqual(new Map(), new Map());
// => false (opaque objects compare by identity)
```

**Breaking comparison corrections:** previous versions could throw for object/null
pairs, consider Dates equal to unrelated objects, compare distinct opaque objects
by enumerable shape, and reject equivalent cycles or repeated references. Signed
zero, invalid Dates, symbol keys and sparse arrays now follow the rules above.
Audit consumers relying on those outcomes. To compare Maps/Sets/custom instances
by content, explicitly project their relevant state into plain data first.

### `deepExtend(...objects)`

Deeply merges multiple objects. Works like `Object.assign`, but recursively merges nested objects instead of overwriting them. All arguments must be non-null objects.

Returns a new object that is the deep merge of all provided objects.
Keys that can mutate the prototype chain (`__proto__`, `constructor`, and `prototype`) are ignored.

```typescript
import { deepExtend } from '@cleverbrush/deep';

const result = deepExtend(
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

// result:
// {
//     a: 'something',
//     name: {
//         first: 'Ivan',
//         last: 'Ivanov'
//     }
// }
```

The result type is inferred from the input types using the `Merge<T>` utility type, which is also exported from the library.

### `deepFlatten(obj, delimiter?)`

Flattens a nested object to a single level, concatenating keys with the specified delimiter.

**Parameters:**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `obj` | `Record<string, any>` | — | Object to flatten |
| `delimiter` | `string` | `'.'` | Separator used to join nested keys |

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

### `HashObject(obj, exclude?)`

Generates a hash representation for an object. Useful for comparing objects by value.

**Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `obj` | `any` | The value to hash |
| `exclude` | `any[]` | Optional list of values to exclude from hashing |

```typescript
import { HashObject } from '@cleverbrush/deep';

const hash = HashObject({ name: 'John', age: 30 });
```

## Code Quality

- **Linting:** [Biome](https://biomejs.dev/) — enforced on every PR via CI
- **Type checking:** TypeScript strict mode
- **Unit tests:** [Vitest](https://vitest.dev/) — covering deep equality edge cases (circular references, `Date` instances, array order), deep merge, flattening, and hashing
- **CI:** Every pull request must pass lint + build + test before merge — see [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

## License

BSD-3-Clause
