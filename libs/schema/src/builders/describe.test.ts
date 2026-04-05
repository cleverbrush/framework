import { describe, expect, expectTypeOf, test } from 'vitest';
import type { AnySchemaBuilder } from './AnySchemaBuilder.js';
import { any } from './AnySchemaBuilder.js';
import type { ArraySchemaBuilder } from './ArraySchemaBuilder.js';
import { array } from './ArraySchemaBuilder.js';
import type { BooleanSchemaBuilder } from './BooleanSchemaBuilder.js';
import { boolean } from './BooleanSchemaBuilder.js';
import type { DateSchemaBuilder } from './DateSchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import { func } from './FunctionSchemaBuilder.js';
import { lazy } from './LazySchemaBuilder.js';
import { nul } from './NullSchemaBuilder.js';
import type { NumberSchemaBuilder } from './NumberSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import type { ObjectSchemaBuilder } from './ObjectSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { StringSchemaBuilder } from './StringSchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { tuple } from './TupleSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

// ==========================================================================
// Type-level tests — describe() returns the same concrete builder type
// ==========================================================================

describe('describe - type inference', () => {
    test('string().describe() returns StringSchemaBuilder', () => {
        const schema = string().describe('A string');
        expectTypeOf(schema).toMatchTypeOf<StringSchemaBuilder<string, true>>();
    });

    test('number().describe() returns NumberSchemaBuilder', () => {
        const schema = number().describe('A number');
        expectTypeOf(schema).toMatchTypeOf<NumberSchemaBuilder<number, true>>();
    });

    test('boolean().describe() returns BooleanSchemaBuilder', () => {
        const schema = boolean().describe('A flag');
        expectTypeOf(schema).toMatchTypeOf<
            BooleanSchemaBuilder<boolean, true>
        >();
    });

    test('date().describe() returns DateSchemaBuilder', () => {
        const schema = date().describe('A date');
        expectTypeOf(schema).toMatchTypeOf<DateSchemaBuilder<Date, true>>();
    });

    test('object().describe() returns ObjectSchemaBuilder', () => {
        const schema = object({ name: string() }).describe('An object');
        expectTypeOf(schema).toMatchTypeOf<
            ObjectSchemaBuilder<
                { name: StringSchemaBuilder<string, true> },
                true
            >
        >();
    });

    test('array().describe() returns ArraySchemaBuilder', () => {
        const schema = array(string()).describe('An array');
        expectTypeOf(schema).toMatchTypeOf<
            ArraySchemaBuilder<StringSchemaBuilder<string, true>, true>
        >();
    });

    test('any().describe() returns AnySchemaBuilder', () => {
        const schema = any().describe('Anything');
        expectTypeOf(schema).toMatchTypeOf<
            AnySchemaBuilder<true, undefined, false, {}, any>
        >();
    });

    test('describe() + optional() preserves optional type', () => {
        const schema = string().describe('A string').optional();
        type Result = ReturnType<typeof schema.introspect>;
        expectTypeOf<Result['isRequired']>().toEqualTypeOf<boolean>();
    });

    test('optional() + describe() preserves optional type', () => {
        const schema = string().optional().describe('A string');
        expect(schema.introspect().isRequired).toBe(false);
    });
});

// ==========================================================================
// Runtime tests — introspect().description
// ==========================================================================

describe('describe - introspect', () => {
    test('description is undefined by default (string)', () => {
        expect(string().introspect().description).toBeUndefined();
    });

    test('description is undefined by default (number)', () => {
        expect(number().introspect().description).toBeUndefined();
    });

    test('description is undefined by default (object)', () => {
        expect(
            object({ x: number() }).introspect().description
        ).toBeUndefined();
    });

    test('string().describe() stores the text', () => {
        expect(string().describe('hello').introspect().description).toBe(
            'hello'
        );
    });

    test('number().describe() stores the text', () => {
        expect(number().describe('A count').introspect().description).toBe(
            'A count'
        );
    });

    test('boolean().describe() stores the text', () => {
        expect(boolean().describe('A flag').introspect().description).toBe(
            'A flag'
        );
    });

    test('date().describe() stores the text', () => {
        expect(date().describe('Created at').introspect().description).toBe(
            'Created at'
        );
    });

    test('object().describe() stores the text', () => {
        expect(
            object({ name: string() }).describe('A user').introspect()
                .description
        ).toBe('A user');
    });

    test('array().describe() stores the text', () => {
        expect(array(string()).describe('Tags').introspect().description).toBe(
            'Tags'
        );
    });

    test('union().describe() stores the text', () => {
        expect(
            union(string()).or(number()).describe('A value').introspect()
                .description
        ).toBe('A value');
    });

    test('any().describe() stores the text', () => {
        expect(any().describe('Anything').introspect().description).toBe(
            'Anything'
        );
    });

    test('func().describe() stores the text', () => {
        expect(func().describe('A callback').introspect().description).toBe(
            'A callback'
        );
    });

    test('nul().describe() stores the text', () => {
        expect(nul().describe('Null sentinel').introspect().description).toBe(
            'Null sentinel'
        );
    });

    test('tuple().describe() stores the text', () => {
        expect(
            tuple([string(), number()]).describe('A pair').introspect()
                .description
        ).toBe('A pair');
    });

    test('lazy().describe() stores the text', () => {
        const schema = lazy(() => string()).describe('Lazy string');
        expect((schema.introspect() as any).description).toBe('Lazy string');
    });
});

// ==========================================================================
// Chaining — describe() survives fluent chains
// ==========================================================================

describe('describe - chaining', () => {
    test('describe() + optional() — description survives', () => {
        const schema = string().describe('x').optional();
        expect(schema.introspect().description).toBe('x');
        expect(schema.introspect().isRequired).toBe(false);
    });

    test('optional() + describe() — description is set after optional()', () => {
        const schema = string().optional().describe('x');
        expect(schema.introspect().description).toBe('x');
        expect(schema.introspect().isRequired).toBe(false);
    });

    test('describe() + required() — description survives', () => {
        const schema = string().optional().describe('x').required();
        expect(schema.introspect().description).toBe('x');
        expect(schema.introspect().isRequired).toBe(true);
    });

    test('describe() + readonly() — description survives', () => {
        const schema = string().describe('x').readonly();
        expect(schema.introspect().description).toBe('x');
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('readonly() + describe() — description set after readonly()', () => {
        const schema = string().readonly().describe('x');
        expect(schema.introspect().description).toBe('x');
        expect(schema.introspect().isReadonly).toBe(true);
    });

    test('describe() + default() — description survives', () => {
        const schema = string().describe('x').default('fallback');
        expect(schema.introspect().description).toBe('x');
        expect(schema.introspect().hasDefault).toBe(true);
    });

    test('default() + describe() — description set after default()', () => {
        const schema = string().default('fallback').describe('x');
        expect(schema.introspect().description).toBe('x');
        expect(schema.introspect().hasDefault).toBe(true);
    });

    test('calling describe() twice overwrites with the latest text', () => {
        const schema = string().describe('first').describe('second');
        expect(schema.introspect().description).toBe('second');
    });

    test('object nested properties preserve their own descriptions', () => {
        const schema = object({
            name: string().describe('Full name'),
            age: number().optional().describe('Age in years')
        }).describe('A person');

        expect(schema.introspect().description).toBe('A person');
        const { properties } = schema.introspect();
        expect((properties.name.introspect() as any).description).toBe(
            'Full name'
        );
        expect((properties.age.introspect() as any).description).toBe(
            'Age in years'
        );
    });
});

// ==========================================================================
// Immutability
// ==========================================================================

describe('describe - immutability', () => {
    test('describe() returns a new instance', () => {
        const original = string();
        const described = original.describe('x');
        expect(original).not.toBe(described);
    });

    test('original is unaffected after describe()', () => {
        const original = string();
        original.describe('x');
        expect(original.introspect().description).toBeUndefined();
    });
});

// ==========================================================================
// Validation — describe() does not affect validation behaviour
// ==========================================================================

describe('describe - validation unchanged', () => {
    test('valid string still passes', () => {
        const schema = string().minLength(3).describe('A name');
        const result = schema.validate('hello' as any);
        expect(result.valid).toBe(true);
    });

    test('invalid string still fails', () => {
        const schema = string().minLength(3).describe('A name');
        const result = schema.validate('hi' as any);
        expect(result.valid).toBe(false);
    });

    test('valid object still passes', () => {
        const schema = object({ name: string() }).describe('A user');
        const result = schema.validate({ name: 'Alice' } as any);
        expect(result.valid).toBe(true);
    });

    test('invalid object still fails', () => {
        const schema = object({ name: string() }).describe('A user');
        const result = schema.validate({ name: 42 } as any);
        expect(result.valid).toBe(false);
    });
});
