# Deep operations on objects

This is yet another library which provides operations over JavaScript objects, like deep compare and deep merge.

## Installation

    npm install @cleverbrush/deep

## Usage

    const deep = require('@cleverbrush/deep');

or for ES Module

    import deep from '@cleverbrush/deep';
    // or import functions individually
    import { deepEqual, deepExtend } from '@cleverbrush/deep';

## Functions

### deepEqual

Takes two objects as parameters, compares it recursively and returns `true` if they are equal or `false` in other case.

    import { deepEqual } from '@cleverbrush/deep';

    const equal1 = deepEqual({ a: {b : 1} }, { a: {b: 1} });
    // equal1 === true

    const equal2 = deepEqual({ a: {b : 1} }, { a: {b: 20} });
    // equal2 === false

    const equal3 = deepEqual({ a: {b : 1, c: 2} }, { a: {b: 20} });
    // equal3 === false

### deepExtend

Works similary to `Object.extend`, but respects the deep structure of objects.

    import { deepExtend } from '@cleverbrush/deep';

    deepExtend({}, {
            a: 'something,
            name: {
                first: 'Ivan'
            }
        }, {
            name: {
                last: 'Ivanov'
            }
        });

will return the following object:

    {
        a: 'something',
        name: {
            first: 'Ivan',
            last: 'Ivanov'
        }
    }
