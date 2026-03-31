import { describe, expect, test } from 'vitest';
import { defineExtension, withExtensions } from '../extension.js';
import {
    any,
    array,
    boolean,
    date,
    func,
    number,
    object,
    SchemaValidationError,
    string,
    union
} from '../index.js';
import type { StringSchemaBuilder } from './StringSchemaBuilder.js';

// ---------- Sync/Async boundary tests ----------

describe('sync validate() throws on async callbacks', () => {
    test('throws when preprocessor returns a Promise', () => {
        const schema = string().addPreprocessor(() =>
            Promise.resolve('processed')
        );
        expect(() => schema.validate('test')).toThrow(/validateAsync/);
    });

    test('throws when validator returns a Promise', () => {
        const schema = string().addValidator(() =>
            Promise.resolve({ valid: true, errors: [] })
        );
        expect(() => schema.validate('test')).toThrow(/validateAsync/);
    });

    test('throws when error message provider returns a Promise', () => {
        const schema = string().required(() =>
            Promise.resolve('async message')
        );
        expect(() => schema.validate(undefined as any)).toThrow(
            /validateAsync/
        );
    });

    test('error message mentions validateAsync()', () => {
        const schema = string().addPreprocessor(() =>
            Promise.resolve('processed')
        );
        try {
            schema.validate('test');
            expect.unreachable('should have thrown');
        } catch (e: any) {
            expect(e.message).toContain('validateAsync()');
        }
    });
});

// ---------- validateAsync() with async callbacks ----------

describe('validateAsync() supports async callbacks', () => {
    test('async preprocessor works', async () => {
        const schema = string().addPreprocessor(async (val) =>
            val.toUpperCase()
        );
        const result = await schema.validateAsync('hello');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('HELLO');
    });

    test('async validator works', async () => {
        const schema = string().addValidator(async (val) => ({
            valid: val.length > 3,
            errors: val.length > 3 ? [] : [{ message: 'too short', path: '' }]
        }));
        const result = await schema.validateAsync('hello');
        expect(result.valid).toBe(true);

        const bad = await schema.validateAsync('hi');
        expect(bad.valid).toBe(false);
    });

    test('async error message provider works', async () => {
        const schema = number().min(10, () =>
            Promise.resolve('must be at least 10')
        );
        const result = await schema.validateAsync(5);
        expect(result.valid).toBe(false);
        expect(result.errors?.[0].message).toBe('must be at least 10');
    });

    test('object with async validator via validateAsync()', async () => {
        const schema = object({
            name: string().addPreprocessor(async (v) => v.trim()),
            age: number()
        });
        const result = await schema.validateAsync({
            name: '  John  ',
            age: 30
        });
        expect(result.valid).toBe(true);
        expect(result.object?.name).toBe('John');
    });

    test('array with async element validation via validateAsync()', async () => {
        const schema = array().of(
            string().addValidator(async (val) => ({
                valid: val !== 'bad',
                errors:
                    val !== 'bad' ? [] : [{ message: 'bad value', path: '' }]
            }))
        );
        const result = await schema.validateAsync(['good', 'ok']);
        expect(result.valid).toBe(true);

        const bad = await schema.validateAsync(['good', 'bad']);
        expect(bad.valid).toBe(false);
    });

    test('union with async validators via validateAsync()', async () => {
        const schema = union(
            string().addValidator(async () => ({
                valid: false,
                errors: [{ message: 'nope', path: '' }]
            }))
        ).or(number());

        const result = await schema.validateAsync(42);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(42);
    });
});

// ---------- parse() / parseAsync() tests ----------

describe('parse() and parseAsync()', () => {
    test('parse() returns value on success', () => {
        const schema = string();
        const result = schema.parse('hello');
        expect(result).toBe('hello');
    });

    test('parse() throws SchemaValidationError on failure', () => {
        const schema = number().min(10);
        try {
            schema.parse(5);
            expect.unreachable('should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(SchemaValidationError);
            expect((e as SchemaValidationError).errors.length).toBeGreaterThan(
                0
            );
        }
    });

    test('parse() throws on schema with async validators', () => {
        const schema = string().addPreprocessor(() => Promise.resolve('async'));
        expect(() => schema.parse('test')).toThrow(/validateAsync/);
    });

    test('parseAsync() resolves with value on success', async () => {
        const schema = string();
        const result = await schema.parseAsync('hello');
        expect(result).toBe('hello');
    });

    test('parseAsync() rejects with SchemaValidationError on failure', async () => {
        const schema = number().min(10);
        try {
            await schema.parseAsync(5);
            expect.unreachable('should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(SchemaValidationError);
        }
    });

    test('parseAsync() works with async validators', async () => {
        const schema = string().addPreprocessor(async (val) =>
            val.toUpperCase()
        );
        const result = await schema.parseAsync('hello');
        expect(result).toBe('HELLO');
    });
});

// ---------- safeParse() / safeParseAsync() tests ----------

describe('safeParse() and safeParseAsync()', () => {
    test('safeParse() is an alias for validate()', () => {
        const schema = string();
        const result = schema.safeParse('hello');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('hello');
    });

    test('safeParse() returns errors on failure', () => {
        const schema = number().min(10);
        const result = schema.safeParse(5);
        expect(result.valid).toBe(false);
        expect(result.errors?.length).toBeGreaterThan(0);
    });

    test('safeParseAsync() is an alias for validateAsync()', async () => {
        const schema = string().addPreprocessor(async (val) =>
            val.toUpperCase()
        );
        const result = await schema.safeParseAsync('hello');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('HELLO');
    });
});

// ---------- Async extension example ----------

describe('async extension', () => {
    // Define an extension with an async validator (e.g., simulated remote lookup)
    const asyncLookupExt = defineExtension({
        string: {
            asyncLookup(this: StringSchemaBuilder, allowedValues: string[]) {
                return this.addValidator(async (val) => {
                    // Simulate async lookup (e.g., database or API check)
                    const found = await Promise.resolve(
                        allowedValues.includes(val)
                    );
                    return {
                        valid: found,
                        errors: found
                            ? []
                            : [
                                  {
                                      message: `"${val}" not found in lookup`,
                                      path: ''
                                  }
                              ]
                    };
                });
            }
        }
    });

    const { string: extString } = withExtensions(asyncLookupExt);

    test('validateAsync() with async extension succeeds', async () => {
        const schema = extString().asyncLookup(['foo', 'bar', 'baz']);
        const result = await schema.validateAsync('foo');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('foo');
    });

    test('validateAsync() with async extension returns errors', async () => {
        const schema = extString().asyncLookup(['foo', 'bar', 'baz']);
        const result = await schema.validateAsync('qux');
        expect(result.valid).toBe(false);
        expect(result.errors?.[0].message).toContain('not found in lookup');
    });

    test('validate() with async extension throws', () => {
        const schema = extString().asyncLookup(['foo', 'bar', 'baz']);
        expect(() => schema.validate('foo')).toThrow(/validateAsync/);
    });

    test('async extension combined with sync extensions via validateAsync()', async () => {
        const schema = extString()
            .minLength(2)
            .asyncLookup(['foo', 'bar', 'baz']);

        const result = await schema.validateAsync('foo');
        expect(result.valid).toBe(true);

        const tooShort = await schema.validateAsync('f');
        expect(tooShort.valid).toBe(false);
    });
});

// ---------- sync validate() works for all builder types ----------

describe('sync validate() works for all builder types', () => {
    test('string', () => {
        const result = string().validate('hello');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('hello');
    });

    test('number', () => {
        const result = number().validate(42);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(42);
    });

    test('boolean', () => {
        const result = boolean().validate(true);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(true);
    });

    test('date', () => {
        const d = new Date();
        const result = date().validate(d);
        expect(result.valid).toBe(true);
    });

    test('func', () => {
        const fn = () => {};
        const result = func().validate(fn);
        expect(result.valid).toBe(true);
    });

    test('any', () => {
        const result = any().validate('anything');
        expect(result.valid).toBe(true);
    });

    test('object', () => {
        const schema = object({ name: string(), age: number() });
        const result = schema.validate({ name: 'John', age: 30 });
        expect(result.valid).toBe(true);
        expect(result.object?.name).toBe('John');
    });

    test('array', () => {
        const schema = array().of(number());
        const result = schema.validate([1, 2, 3]);
        expect(result.valid).toBe(true);
    });

    test('union', () => {
        const schema = union(string()).or(number());
        const result = schema.validate('hello');
        expect(result.valid).toBe(true);

        const result2 = schema.validate(42);
        expect(result2.valid).toBe(true);
    });

    test('nested object', () => {
        const schema = object({
            user: object({
                name: string(),
                tags: array().of(string())
            })
        });
        const result = schema.validate({
            user: { name: 'John', tags: ['dev', 'admin'] }
        });
        expect(result.valid).toBe(true);
    });
});
