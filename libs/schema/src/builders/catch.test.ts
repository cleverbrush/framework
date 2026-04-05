import { describe, expect, expectTypeOf, test } from 'vitest';
import { any } from './AnySchemaBuilder.js';
import { array } from './ArraySchemaBuilder.js';
import { boolean } from './BooleanSchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import { func } from './FunctionSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { tuple } from './TupleSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

// ─── string ──────────────────────────────────────────────────────────────────

describe('.catch() — string', () => {
    test('returns fallback when input is wrong type', () => {
        const schema = string().catch('fallback');
        const result = schema.validate(42 as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('fallback');
    });

    test('returns fallback on null', () => {
        const schema = string().catch('fallback');
        const result = schema.validate(null as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('fallback');
    });

    test('returns fallback on undefined', () => {
        const schema = string().catch('fallback');
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('fallback');
    });

    test('returns valid object when input passes validation', () => {
        const schema = string().catch('fallback');
        const result = schema.validate('hello');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('hello');
    });

    test('returns fallback on constraint violation', () => {
        const schema = string().minLength(10).catch('short');
        const result = schema.validate('hi');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('short');
    });

    test('works with factory function fallback', () => {
        let callCount = 0;
        const schema = string().catch(() => {
            callCount++;
            return 'lazy';
        });
        const r1 = schema.validate(42 as any);
        expect(r1.valid).toBe(true);
        expect(r1.object).toBe('lazy');
        expect(callCount).toBe(1);

        // factory called each time
        schema.validate(99 as any);
        expect(callCount).toBe(2);
    });

    test('works with validateAsync', async () => {
        const schema = string().catch('async-fallback');
        const result = await schema.validateAsync(42 as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('async-fallback');
    });

    test('parse() returns fallback instead of throwing', () => {
        const schema = string().catch('safe');
        expect(() => schema.parse(42 as any)).not.toThrow();
        expect(schema.parse(42 as any)).toBe('safe');
    });

    test('parseAsync() returns fallback instead of throwing', async () => {
        const schema = string().catch('safe');
        await expect(schema.parseAsync(42 as any)).resolves.toBe('safe');
    });

    test('safeParse() returns fallback result', () => {
        const schema = string().catch('safe');
        const result = schema.safeParse(42 as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('safe');
    });

    test('is immutable — original schema unchanged', () => {
        const base = string();
        const withCatch = base.catch('fallback');
        expect(base.validate(42 as any).valid).toBe(false);
        expect(withCatch.validate(42 as any).valid).toBe(true);
    });

    test('introspect() exposes hasCatch and catchValue', () => {
        const schema = string().catch('x');
        const info = schema.introspect();
        expect(info.hasCatch).toBe(true);
        expect(info.catchValue).toBe('x');
    });

    test('introspect() hasCatch is false when not set', () => {
        const schema = string();
        expect(schema.introspect().hasCatch).toBe(false);
    });

    test('hasCatch survives fluent chaining', () => {
        const schema = string().catch('x').minLength(0);
        expect(schema.introspect().hasCatch).toBe(true);
        expect(schema.introspect().catchValue).toBe('x');
    });
});

// ─── number ──────────────────────────────────────────────────────────────────

describe('.catch() — number', () => {
    test('returns fallback when input is wrong type', () => {
        const schema = number().catch(0);
        const result = schema.validate('not-a-number' as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(0);
    });

    test('returns fallback on constraint violation', () => {
        const schema = number().min(10).catch(-1);
        const result = schema.validate(5);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(-1);
    });

    test('passes valid input through', () => {
        const schema = number().catch(0);
        expect(schema.validate(42).object).toBe(42);
    });
});

// ─── boolean ─────────────────────────────────────────────────────────────────

describe('.catch() — boolean', () => {
    test('returns fallback on invalid input', () => {
        const schema = boolean().catch(false);
        const result = schema.validate('yes' as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(false);
    });

    test('passes valid input through', () => {
        const schema = boolean().catch(false);
        expect(schema.validate(true).object).toBe(true);
    });
});

// ─── date ────────────────────────────────────────────────────────────────────

describe('.catch() — date', () => {
    const fallback = new Date(0);

    test('returns fallback when input is not a Date', () => {
        const schema = date().catch(fallback);
        const result = schema.validate('not-a-date' as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual(fallback);
    });
});

// ─── object ──────────────────────────────────────────────────────────────────

describe('.catch() — object', () => {
    const fallback = { name: 'unknown', age: 0 };

    test('returns fallback when input is wrong type', () => {
        const schema = object({ name: string(), age: number() }).catch(
            fallback
        );
        const result = schema.validate(42 as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual(fallback);
    });

    test('passes valid object through', () => {
        const schema = object({ name: string(), age: number() }).catch(
            fallback
        );
        const input = { name: 'Alice', age: 30 };
        const result = schema.validate(input);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual(input);
    });

    test('factory function fallback produces a fresh object each time', () => {
        const schema = object({ name: string() }).catch(() => ({
            name: 'none'
        }));
        const r1 = schema.validate(99 as any);
        const r2 = schema.validate(99 as any);
        expect(r1.object).toEqual({ name: 'none' });
        expect(r1.object).not.toBe(r2.object); // different instances
    });
});

// ─── array ───────────────────────────────────────────────────────────────────

describe('.catch() — array', () => {
    test('returns fallback when input is not an array', () => {
        const schema = array(string()).catch([]);
        const result = schema.validate(42 as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual([]);
    });

    test('factory function fallback for mutable arrays', () => {
        const schema = array(number()).catch(() => [0]);
        const r1 = schema.validate('bad' as any);
        const r2 = schema.validate('bad' as any);
        expect(r1.object).toEqual([0]);
        expect(r1.object).not.toBe(r2.object);
    });
});

// ─── union ───────────────────────────────────────────────────────────────────

describe('.catch() — union', () => {
    test('returns fallback when no branch matches', () => {
        const schema = union(string())
            .or(number())
            .catch('fallback' as any);
        const result = schema.validate(true as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('fallback');
    });
});

// ─── func ────────────────────────────────────────────────────────────────────

describe('.catch() — func', () => {
    const fallback = () => 'noop';

    test('returns fallback when input is not a function', () => {
        // Since catch values that are functions are treated as factory functions,
        // wrap the function fallback in another factory to pass it through as-is.
        const schema = func().catch(() => fallback);
        const result = schema.validate(42 as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(fallback);
    });
});

// ─── any ─────────────────────────────────────────────────────────────────────

describe('.catch() — any', () => {
    test('any() always passes so fallback is never used', () => {
        const schema = any().catch('fallback');
        // any() accepts everything including null/undefined
        const result = schema.validate(null);
        expect(result.valid).toBe(true);
        // null passes through normally since any accepts it
    });
});

// ─── chaining ────────────────────────────────────────────────────────────────

describe('.catch() — chaining with .optional(), .default(), .brand()', () => {
    test('.optional().catch() — catch fires on type mismatch, not on undefined', () => {
        // .optional() makes undefined valid, so catch should not fire for undefined
        const schema = string().optional().catch('fallback');
        expect(schema.validate(undefined as any).object).toBeUndefined();
        expect(schema.validate(42 as any).object).toBe('fallback');
    });

    test('.default().catch() — default fires on undefined, catch fires on type mismatch', () => {
        const schema = string().default('default-val').catch('catch-val');
        // undefined → default fires, result is valid 'default-val', no catch needed
        expect(schema.validate(undefined as any).object).toBe('default-val');
        // type mismatch → validation fails → catch fires
        expect(schema.validate(42 as any).object).toBe('catch-val');
    });

    test('.catch().brand() preserves catch state', () => {
        const schema = string().catch('x').brand<'Tag'>();
        expect(schema.introspect().hasCatch).toBe(true);
        expect(schema.validate(99 as any).object).toBe('x');
    });
});

// ─── async validation ────────────────────────────────────────────────────────

describe('.catch() — async validation', () => {
    test('validateAsync returns fallback on failure', async () => {
        const schema = number().catch(0);
        const result = await schema.validateAsync('bad' as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(0);
    });

    test('parseAsync returns fallback without throwing', async () => {
        const schema = object({ x: number() }).catch({ x: -1 });
        await expect(schema.parseAsync('bad' as any)).resolves.toEqual({
            x: -1
        });
    });
});

// ─── type inference ──────────────────────────────────────────────────────────

describe('.catch() — type inference (no InferType change)', () => {
    test('string InferType unchanged by .catch()', () => {
        const schema = string().catch('x');
        expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<string>();
    });

    test('optional string InferType unchanged by .catch()', () => {
        const schema = string().optional().catch('x');
        expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<
            string | undefined
        >();
    });

    test('number InferType unchanged by .catch()', () => {
        const schema = number().catch(0);
        expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<number>();
    });

    test('object InferType unchanged by .catch()', () => {
        const schema = object({ a: string() }).catch({ a: '' });
        expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<{ a: string }>();
    });

    test('array InferType unchanged by .catch()', () => {
        const schema = array(string()).catch([]);
        expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<string[]>();
    });
});

// ─── specialized result methods preserved after catch ────────────────────────

describe('.catch() — object preserves getErrorsFor() after catch fires', () => {
    test('getErrorsFor is a function on the result when catch fires', () => {
        const schema = object({ name: string(), age: number() }).catch({
            name: 'unknown',
            age: 0
        });
        const result = schema.validate(42 as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ name: 'unknown', age: 0 });
        expect(typeof result.getErrorsFor).toBe('function');
    });

    test('getErrorsFor() returns no errors when catch fires', () => {
        const schema = object({ name: string(), age: number() }).catch({
            name: 'fallback',
            age: -1
        });
        const result = schema.validate('bad-input' as any);
        expect(result.valid).toBe(true);
        const nameErrors = result.getErrorsFor(t => t.name);
        expect(nameErrors.isValid).toBe(true);
        expect(nameErrors.errors.length).toBe(0);
    });

    test('getErrorsFor() works correctly after catch fires with factory fallback', () => {
        const schema = object({ x: number() }).catch(() => ({ x: 0 }));
        const result = schema.validate(null as any);
        expect(result.valid).toBe(true);
        expect(typeof result.getErrorsFor).toBe('function');
        const xErrors = result.getErrorsFor(t => t.x);
        expect(xErrors.isValid).toBe(true);
    });

    test('getErrorsFor() not affected: valid inputs still return valid result', () => {
        const schema = object({ name: string() }).catch({ name: 'fallback' });
        const result = schema.validate({ name: 'Alice' });
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ name: 'Alice' });
        expect(typeof result.getErrorsFor).toBe('function');
        expect(result.getErrorsFor(t => t.name).isValid).toBe(true);
    });

    test('async: getErrorsFor is a function on the result when catch fires', async () => {
        const schema = object({ name: string() }).catch({ name: 'fallback' });
        const result = await schema.validateAsync(99 as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ name: 'fallback' });
        expect(typeof result.getErrorsFor).toBe('function');
        expect(result.getErrorsFor(t => t.name).isValid).toBe(true);
    });
});

describe('.catch() — tuple preserves getNestedErrors() after catch fires', () => {
    test('getNestedErrors is a function on the result when catch fires', () => {
        const schema = tuple([string(), number()]).catch([
            'fallback',
            0
        ] as [string, number]);
        const result = schema.validate('bad-input' as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual(['fallback', 0]);
        expect(typeof result.getNestedErrors).toBe('function');
    });

    test('getNestedErrors() returns no errors when catch fires', () => {
        const schema = tuple([string(), number()]).catch(['x', 1] as [
            string,
            number
        ]);
        const result = schema.validate(42 as any);
        expect(result.valid).toBe(true);
        const nested = result.getNestedErrors();
        expect(nested.isValid).toBe(true);
        expect(nested.errors.length).toBe(0);
    });

    test('async: getNestedErrors is a function on the result when catch fires', async () => {
        const schema = tuple([number(), boolean()]).catch([0, false] as [
            number,
            boolean
        ]);
        const result = await schema.validateAsync('bad' as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual([0, false]);
        expect(typeof result.getNestedErrors).toBe('function');
        const nested = result.getNestedErrors();
        expect(nested.isValid).toBe(true);
    });
});
