import { describe, expect, expectTypeOf, test } from 'vitest';
import type { ArraySchemaBuilder } from './ArraySchemaBuilder.js';
import { array } from './ArraySchemaBuilder.js';
import type { BooleanSchemaBuilder } from './BooleanSchemaBuilder.js';
import { boolean } from './BooleanSchemaBuilder.js';
import type { DateSchemaBuilder } from './DateSchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import type { NumberSchemaBuilder } from './NumberSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import type { ObjectSchemaBuilder } from './ObjectSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { StringSchemaBuilder } from './StringSchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

// ==========================================================================
// Type-level tests — schemaName() returns the same concrete builder type
// ==========================================================================

describe('schemaName - type inference', () => {
    test('string().schemaName() returns StringSchemaBuilder', () => {
        const schema = string().schemaName('Str');
        expectTypeOf(schema).toMatchTypeOf<StringSchemaBuilder<string, true>>();
    });

    test('number().schemaName() returns NumberSchemaBuilder', () => {
        const schema = number().schemaName('Num');
        expectTypeOf(schema).toMatchTypeOf<NumberSchemaBuilder<number, true>>();
    });

    test('boolean().schemaName() returns BooleanSchemaBuilder', () => {
        const schema = boolean().schemaName('Flag');
        expectTypeOf(schema).toMatchTypeOf<
            BooleanSchemaBuilder<boolean, true>
        >();
    });

    test('date().schemaName() returns DateSchemaBuilder', () => {
        const schema = date().schemaName('When');
        expectTypeOf(schema).toMatchTypeOf<DateSchemaBuilder<Date, true>>();
    });

    test('object().schemaName() returns ObjectSchemaBuilder', () => {
        const schema = object({ name: string() }).schemaName('User');
        expectTypeOf(schema).toMatchTypeOf<
            ObjectSchemaBuilder<
                { name: StringSchemaBuilder<string, true> },
                true
            >
        >();
    });

    test('array().schemaName() returns ArraySchemaBuilder', () => {
        const schema = array(string()).schemaName('Names');
        expectTypeOf(schema).toMatchTypeOf<
            ArraySchemaBuilder<string[], true>
        >();
    });
});

// ==========================================================================
// Runtime tests
// ==========================================================================

describe('schemaName - runtime behaviour', () => {
    test('stores the name in introspect().schemaName', () => {
        expect(string().schemaName('Str').introspect().schemaName).toBe('Str');
    });

    test('overwrites a previous name', () => {
        const s = string().schemaName('First').schemaName('Second');
        expect(s.introspect().schemaName).toBe('Second');
    });

    test('schemaName is undefined when not set', () => {
        expect(string().introspect().schemaName).toBeUndefined();
    });

    // --- Chaining survives other modifiers ---

    test('schemaName() + optional() — name survives', () => {
        const schema = object({ id: number() }).schemaName('User').optional();
        expect(schema.introspect().schemaName).toBe('User');
        expect(schema.introspect().isRequired).toBe(false);
    });

    test('optional() + schemaName() — name set after optional', () => {
        const schema = object({ id: number() }).optional().schemaName('User');
        expect(schema.introspect().schemaName).toBe('User');
        expect(schema.introspect().isRequired).toBe(false);
    });

    test('schemaName() + describe() — both survive', () => {
        const schema = object({ id: number() })
            .schemaName('User')
            .describe('A user object');
        expect(schema.introspect().schemaName).toBe('User');
        expect(schema.introspect().description).toBe('A user object');
    });

    test('describe() + schemaName() — both survive regardless of order', () => {
        const schema = object({ id: number() })
            .describe('A user object')
            .schemaName('User');
        expect(schema.introspect().schemaName).toBe('User');
        expect(schema.introspect().description).toBe('A user object');
    });

    test('schemaName() does not affect validation', async () => {
        const schema = object({ id: number() }).schemaName('User');
        const result = await schema.validate({ id: 42 });
        expect(result.valid).toBe(true);
    });

    test('schemaName() on union', () => {
        const schema = union(string()).or(number()).schemaName('StrOrNum');
        expect(schema.introspect().schemaName).toBe('StrOrNum');
    });

    test('schemaName() on array', () => {
        const schema = array(string()).schemaName('Names');
        expect(schema.introspect().schemaName).toBe('Names');
    });

    test('schema without schemaName returns undefined from introspect', () => {
        const schema = string().describe('hello');
        expect(schema.introspect().schemaName).toBeUndefined();
    });
});
