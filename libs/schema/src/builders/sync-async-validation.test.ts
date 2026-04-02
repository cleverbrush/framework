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
        const schema = string().addPreprocessor(async val => val.toUpperCase());
        const result = await schema.validateAsync('hello');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('HELLO');
    });

    test('async validator works', async () => {
        const schema = string().addValidator(async val => ({
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
            name: string().addPreprocessor(async v => v.trim()),
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
            string().addValidator(async val => ({
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
        const schema = string().addPreprocessor(async val => val.toUpperCase());
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
        const schema = string().addPreprocessor(async val => val.toUpperCase());
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
                return this.addValidator(async val => {
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

// ---------- validateAsync() works for all builder types ----------

describe('validateAsync() works for all builder types', () => {
    test('string', async () => {
        const result = await string().validateAsync('hello');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('hello');
    });

    test('number', async () => {
        const result = await number().validateAsync(42);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(42);
    });

    test('boolean', async () => {
        const result = await boolean().validateAsync(true);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(true);
    });

    test('date', async () => {
        const d = new Date();
        const result = await date().validateAsync(d);
        expect(result.valid).toBe(true);
    });

    test('func', async () => {
        const fn = () => {};
        const result = await func().validateAsync(fn);
        expect(result.valid).toBe(true);
    });

    test('any', async () => {
        const result = await any().validateAsync('anything');
        expect(result.valid).toBe(true);
    });

    test('object', async () => {
        const schema = object({ name: string(), age: number() });
        const result = await schema.validateAsync({ name: 'John', age: 30 });
        expect(result.valid).toBe(true);
        expect(result.object?.name).toBe('John');
    });

    test('array', async () => {
        const schema = array().of(number());
        const result = await schema.validateAsync([1, 2, 3]);
        expect(result.valid).toBe(true);
    });

    test('union', async () => {
        const schema = union(string()).or(number());
        const result = await schema.validateAsync('hello');
        expect(result.valid).toBe(true);

        const result2 = await schema.validateAsync(42);
        expect(result2.valid).toBe(true);
    });

    test('nested object', async () => {
        const schema = object({
            user: object({
                name: string(),
                tags: array().of(string())
            })
        });
        const result = await schema.validateAsync({
            user: { name: 'John', tags: ['dev', 'admin'] }
        });
        expect(result.valid).toBe(true);
    });
});

// ---------- validateAsync() returns errors for invalid values ----------

describe('validateAsync() returns errors for invalid values', () => {
    test('required string rejects undefined', async () => {
        const result = await string().validateAsync(undefined as any);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
    });

    test('number.min() rejects below minimum', async () => {
        const result = await number().min(10).validateAsync(5);
        expect(result.valid).toBe(false);
        expect(result.errors!.length).toBeGreaterThan(0);
    });

    test('string.minLength() rejects short strings', async () => {
        const result = await string().minLength(5).validateAsync('hi');
        expect(result.valid).toBe(false);
    });

    test('object rejects missing required properties', async () => {
        const schema = object({ name: string(), email: string() });
        const result = await schema.validateAsync({} as any);
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
    });

    test('object rejects unknown properties when configured', async () => {
        const schema = object({ name: string() }).notAcceptUnknownProps();
        const result = await schema.validateAsync({
            name: 'John',
            extra: 'nope'
        } as any);
        expect(result.valid).toBe(false);
    });
});

// ---------- validateAsync() with doNotStopOnFirstError ----------

describe('validateAsync() with doNotStopOnFirstError', () => {
    test('collects all errors from object properties', async () => {
        const schema = object({
            name: string(),
            email: string(),
            age: number()
        });
        const result = await schema.validateAsync({} as any, {
            doNotStopOnFirstError: true
        });
        expect(result.valid).toBe(false);
        expect(result.errors!.length).toBeGreaterThanOrEqual(3);
    });

    test('collects multiple validator errors on a single field', async () => {
        const schema = string()
            .addValidator(async () => ({
                valid: false,
                errors: [{ message: 'error one', path: '' }]
            }))
            .addValidator(async () => ({
                valid: false,
                errors: [{ message: 'error two', path: '' }]
            }));
        const result = await schema.validateAsync('test', {
            doNotStopOnFirstError: true
        });
        expect(result.valid).toBe(false);
        expect(result.errors!.length).toBe(2);
    });

    test('stops on first error without doNotStopOnFirstError', async () => {
        const schema = string()
            .addValidator(async () => ({
                valid: false,
                errors: [{ message: 'first', path: '' }]
            }))
            .addValidator(async () => ({
                valid: false,
                errors: [{ message: 'second', path: '' }]
            }));
        const result = await schema.validateAsync('test');
        expect(result.valid).toBe(false);
        expect(result.errors!.length).toBe(1);
        expect(result.errors![0].message).toBe('first');
    });
});

// ---------- validateAsync() with async preprocessors ----------

describe('validateAsync() with async preprocessors', () => {
    test('transforms value before validation', async () => {
        const schema = number()
            .addPreprocessor(async val => val * 2)
            .min(10);
        const result = await schema.validateAsync(6);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(12);
    });

    test('chained async preprocessors run in order', async () => {
        const schema = string()
            .addPreprocessor(async val => val.trim())
            .addPreprocessor(async val => val.toUpperCase())
            .minLength(3);
        const result = await schema.validateAsync('  hello  ');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('HELLO');
    });

    test('failing preprocessor produces error', async () => {
        const schema = string().addPreprocessor(async () => {
            throw new Error('preprocessor failed');
        });
        const result = await schema.validateAsync('test');
        expect(result.valid).toBe(false);
        expect(result.errors![0].message).toContain('preprocessor failed');
    });

    test('object with async preprocessors on nested properties', async () => {
        const schema = object({
            name: string().addPreprocessor(async val => val.trim()),
            score: number().addPreprocessor(async val => Math.round(val))
        });
        const result = await schema.validateAsync({
            name: '  Alice  ',
            score: 9.7
        });
        expect(result.valid).toBe(true);
        expect(result.object?.name).toBe('Alice');
        expect(result.object?.score).toBe(10);
    });
});

// ---------- validateAsync() with deeply nested objects ----------

describe('validateAsync() with deeply nested objects', () => {
    test('validates deeply nested schema', async () => {
        const schema = object({
            level1: object({
                level2: object({
                    value: string()
                })
            })
        });
        const result = await schema.validateAsync({
            level1: { level2: { value: 'deep' } }
        });
        expect(result.valid).toBe(true);
        expect(result.object?.level1.level2.value).toBe('deep');
    });

    test('error paths include full nesting', async () => {
        const schema = object({
            user: object({
                profile: object({
                    email: string()
                })
            })
        });
        const result = await schema.validateAsync(
            {
                user: { profile: {} }
            } as any,
            { doNotStopOnFirstError: true }
        );
        expect(result.valid).toBe(false);
        const emailError = result.errors!.find(e => e.path?.includes('email'));
        expect(emailError).toBeDefined();
        expect(emailError!.path).toBe('$.user.profile.email');
    });

    test('async validators on nested properties', async () => {
        const schema = object({
            user: object({
                username: string().addValidator(async val => {
                    await new Promise(r => setTimeout(r, 5));
                    return {
                        valid: val !== 'admin',
                        errors:
                            val !== 'admin'
                                ? []
                                : [{ message: 'reserved username', path: '' }]
                    };
                })
            })
        });

        const good = await schema.validateAsync({
            user: { username: 'alice' }
        });
        expect(good.valid).toBe(true);

        const bad = await schema.validateAsync({
            user: { username: 'admin' }
        });
        expect(bad.valid).toBe(false);
    });
});

// ---------- validateAsync() error path correctness ----------

describe('validateAsync() error path correctness', () => {
    test('root-level field error has correct path', async () => {
        const result = await string().validateAsync(undefined as any);
        expect(result.errors![0].path).toBe('$');
    });

    test('object property error has correct path', async () => {
        const schema = object({ name: string() });
        const result = await schema.validateAsync({} as any);
        expect(result.errors![0].path).toBe('$.name');
    });

    test('async validator error has correct path', async () => {
        const schema = object({
            email: string().addValidator(async () => ({
                valid: false,
                errors: [{ message: 'invalid email', path: '' }]
            }))
        });
        const result = await schema.validateAsync({ email: 'bad' });
        expect(result.valid).toBe(false);
        expect(result.errors![0].path).toContain('email');
    });

    test('array element error has correct path', async () => {
        const schema = array().of(number());
        const result = await schema.validateAsync([1, 'not a number'] as any, {
            doNotStopOnFirstError: true
        });
        expect(result.valid).toBe(false);
        const errPath = result.errors![0].path;
        expect(errPath).toContain('[');
    });
});

// ---------- validateAsync() with mixed sync+async validators ----------

describe('validateAsync() with mixed sync and async validators', () => {
    test('sync validators work when called via validateAsync', async () => {
        const schema = string().minLength(3).maxLength(10);
        const result = await schema.validateAsync('hello');
        expect(result.valid).toBe(true);
    });

    test('mixed sync preprocessor + async validator', async () => {
        const schema = string()
            .addPreprocessor(val => val.trim())
            .addValidator(async val => ({
                valid: val.length >= 3,
                errors:
                    val.length >= 3
                        ? []
                        : [{ message: 'too short after trim', path: '' }]
            }));

        const good = await schema.validateAsync('   hello   ');
        expect(good.valid).toBe(true);
        expect(good.object).toBe('hello');

        const bad = await schema.validateAsync('   ab   ');
        expect(bad.valid).toBe(false);
    });

    test('async preprocessor + sync built-in constraint', async () => {
        const schema = number()
            .addPreprocessor(async val => val + 10)
            .min(15);
        const result = await schema.validateAsync(6);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(16);

        const bad = await schema.validateAsync(2);
        expect(bad.valid).toBe(false);
    });
});

// ---------- validateAsync() with async required error messages ----------

describe('validateAsync() with async error message providers', () => {
    test('async required error message', async () => {
        const schema = string().required(async () => 'name is mandatory');
        const result = await schema.validateAsync(undefined as any);
        expect(result.valid).toBe(false);
        expect(result.errors![0].message).toBe('name is mandatory');
    });

    test('async min error message on number', async () => {
        const schema = number().min(10, async () => 'must be at least ten');
        const result = await schema.validateAsync(5);
        expect(result.valid).toBe(false);
        expect(result.errors![0].message).toBe('must be at least ten');
    });
});

// ---------- validateAsync() with optional fields ----------

describe('validateAsync() with optional fields', () => {
    test('optional string accepts undefined', async () => {
        const result = await string()
            .optional()
            .validateAsync(undefined as any);
        expect(result.valid).toBe(true);
    });

    test('optional number accepts undefined', async () => {
        const result = await number()
            .optional()
            .validateAsync(undefined as any);
        expect(result.valid).toBe(true);
    });

    test('object with all optional fields accepts empty object', async () => {
        const schema = object({
            name: string().optional(),
            age: number().optional()
        });
        const result = await schema.validateAsync({});
        expect(result.valid).toBe(true);
    });

    test('object with mix of required and optional fields', async () => {
        const schema = object({
            name: string(),
            nickname: string().optional(),
            age: number().optional()
        });
        const result = await schema.validateAsync({ name: 'Alice' });
        expect(result.valid).toBe(true);

        const bad = await schema.validateAsync({} as any);
        expect(bad.valid).toBe(false);
    });
});

// ---------- validateAsync() getErrorsFor on object results ----------

describe('validateAsync() getErrorsFor on object results', () => {
    test('getErrorsFor returns per-field errors', async () => {
        const schema = object({ name: string(), email: string() });
        const result = await schema.validateAsync({} as any, {
            doNotStopOnFirstError: true
        });
        expect(result.valid).toBe(false);
        expect(typeof result.getErrorsFor).toBe('function');

        const nameErrors = result.getErrorsFor(t => t.name);
        expect(nameErrors.errors.length).toBeGreaterThan(0);

        const emailErrors = result.getErrorsFor(t => t.email);
        expect(emailErrors.errors.length).toBeGreaterThan(0);
    });

    test('getErrorsFor returns valid for present fields', async () => {
        const schema = object({ name: string(), email: string() });
        const result = await schema.validateAsync({ name: 'John' } as any, {
            doNotStopOnFirstError: true
        });

        const nameErrors = result.getErrorsFor(t => t.name);
        expect(nameErrors.errors.length).toBe(0);
    });
});
