# @cleverbrush/deep

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)

A library for deep operations on JavaScript objects — deep equality, deep merge, and flattening.

## Installation

```bash
npm install @cleverbrush/deep
```

## Usage

```typescript
import { deepEqual, deepExtend, deepFlatten } from '@cleverbrush/deep';
```

## API

### `deepEqual(a, b, options?)`

Recursively compares two values and returns `true` if they are deeply equal. Supports nested objects, arrays, `Date` instances, and handles circular references.

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
```

### `deepExtend(...objects)`

Deeply merges multiple objects. Works like `Object.assign`, but recursively merges nested objects instead of overwriting them. All arguments must be non-null objects.

Returns a new object that is the deep merge of all provided objects.

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

