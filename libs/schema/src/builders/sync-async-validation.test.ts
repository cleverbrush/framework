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
import type { ValidationContext, ValidationResult } from './SchemaBuilder.js';
import { StringSchemaBuilder } from './StringSchemaBuilder.js';

// A schema that returns { valid: false } with NO errors property — used to
// test the `result.errors || []` fallback in parse() and parseAsync().
class NoErrorsStringSchema extends StringSchemaBuilder {
    constructor() {
        super({ type: 'string' } as any);
    }
    public override validate(
        _object: any,
        _context?: ValidationContext
    ): ValidationResult<any> {
        return { valid: false } as any;
    }
    public override validateAsync(
        _object: any,
        _context?: ValidationContext
    ): Promise<ValidationResult<any>> {
        return Promise.resolve({ valid: false } as any);
    }
}

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
            errors: val.length > 3 ? [] : [{ message: 'too short' }]
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
                errors: val !== 'bad' ? [] : [{ message: 'bad value' }]
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
                errors: [{ message: 'nope' }]
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
                                      message: `"${val}" not found in lookup`
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
                errors: [{ message: 'error one' }]
            }))
            .addValidator(async () => ({
                valid: false,
                errors: [{ message: 'error two' }]
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
                errors: [{ message: 'first' }]
            }))
            .addValidator(async () => ({
                valid: false,
                errors: [{ message: 'second' }]
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
        const emailError = result.errors!.find(e =>
            e.message?.includes('is required')
        );
        expect(emailError).toBeDefined();
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
                                : [{ message: 'reserved username' }]
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
    test('root-level field error has correct message', async () => {
        const result = await string().validateAsync(undefined as any);
        expect(result.errors![0].message).toBeDefined();
    });

    test('object property error has correct message', async () => {
        const schema = object({ name: string() });
        const result = await schema.validateAsync({} as any);
        expect(result.errors![0].message).toBeDefined();
    });

    test('async validator error has correct message', async () => {
        const schema = object({
            email: string().addValidator(async () => ({
                valid: false,
                errors: [{ message: 'invalid email' }]
            }))
        });
        const result = await schema.validateAsync({ email: 'bad' });
        expect(result.valid).toBe(false);
        expect(result.errors![0].message).toBeDefined();
    });

    test('array element error has correct message', async () => {
        const schema = array().of(number());
        const result = await schema.validateAsync([1, 'not a number'] as any, {
            doNotStopOnFirstError: true
        });
        expect(result.valid).toBe(false);
        expect(result.errors![0].message).toBeDefined();
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
                    val.length >= 3 ? [] : [{ message: 'too short after trim' }]
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

// ---------- optional schema: validators skipped for null/undefined ----------

describe('optional schema: validators skipped for null/undefined (sync)', () => {
    test('optional any() with addValidator skips validator for null', () => {
        let called = false;
        const schema = any()
            .optional()
            .addValidator(() => {
                called = true;
                return {
                    valid: false,
                    errors: [{ message: 'should not run' }]
                };
            });
        const result = schema.validate(null as any);
        expect(result.valid).toBe(true);
        expect(called).toBe(false);
    });

    test('optional any() with addValidator skips validator for undefined', () => {
        let called = false;
        const schema = any()
            .optional()
            .addValidator(() => {
                called = true;
                return {
                    valid: false,
                    errors: [{ message: 'should not run' }]
                };
            });
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(called).toBe(false);
    });

    test('optional any() with addValidator still runs validator for non-null values', () => {
        let called = false;
        const schema = any()
            .optional()
            .addValidator(() => {
                called = true;
                return { valid: false, errors: [{ message: 'always fail' }] };
            });
        const result = schema.validate('hello' as any);
        expect(result.valid).toBe(false);
        expect(called).toBe(true);
    });
});

describe('optional schema: validators skipped for null/undefined (async)', () => {
    test('optional any() with async addValidator skips validator for null', async () => {
        let called = false;
        const schema = any()
            .optional()
            .addValidator(async () => {
                called = true;
                return {
                    valid: false,
                    errors: [{ message: 'should not run' }]
                };
            });
        const result = await schema.validateAsync(null as any);
        expect(result.valid).toBe(true);
        expect(called).toBe(false);
    });

    test('optional any() with async addValidator skips validator for undefined', async () => {
        let called = false;
        const schema = any()
            .optional()
            .addValidator(async () => {
                called = true;
                return {
                    valid: false,
                    errors: [{ message: 'should not run' }]
                };
            });
        const result = await schema.validateAsync(undefined as any);
        expect(result.valid).toBe(true);
        expect(called).toBe(false);
    });

    test('optional any() with async addValidator still runs validator for non-null values', async () => {
        let called = false;
        const schema = any()
            .optional()
            .addValidator(async () => {
                called = true;
                return { valid: false, errors: [{ message: 'always fail' }] };
            });
        const result = await schema.validateAsync('hello' as any);
        expect(result.valid).toBe(false);
        expect(called).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// SchemaBuilder internals — lines 775, 814, 1200-1206, 1248, 1689, 1721, 1746
// ---------------------------------------------------------------------------

describe('SchemaBuilder internal edge cases', () => {
    test('type setter throws on empty string (line 775)', () => {
        expect(() => (StringSchemaBuilder as any).create({ type: '' })).toThrow(
            'value should be non empty string'
        );
    });

    test('type setter throws on non-string (line 775)', () => {
        expect(() =>
            (StringSchemaBuilder as any).create({ type: null })
        ).toThrow('value should be non empty string');
    });

    test('isRequired setter throws on non-boolean (line 814)', () => {
        const schema = string();
        expect(() => {
            (schema as any).isRequired = 'not-a-boolean';
        }).toThrow('should be a boolean value');
    });

    test('preValidateAsync: validator throws → error message includes "thrown an error" (lines 1200-1206)', async () => {
        const schema = string().addValidator(() => {
            throw new Error('validator exploded');
        });
        const { valid, errors } = await schema.validateAsync('hello');
        expect(valid).toBe(false);
        expect(errors?.[0].message).toMatch(/thrown an error/);
        expect(errors?.[0].message).toContain('validator exploded');
    });

    test('preValidateAsync: validator throws + doNotStopOnFirstError continues (lines 1200-1206)', async () => {
        const schema = string()
            .addValidator(() => {
                throw new Error('first blow up');
            })
            .addValidator(() => ({
                valid: false,
                errors: [{ message: 'second fails' }]
            }));
        const { valid, errors } = await schema.validateAsync('hello', {
            doNotStopOnFirstError: true
        });
        expect(valid).toBe(false);
        expect(errors?.length).toBeGreaterThanOrEqual(2);
    });

    test('preValidate deprecated alias calls preValidateAsync (line 1248)', async () => {
        const schema = string();
        const result = await (schema as any).preValidate('hello');
        expect(result).toBeDefined();
        expect(result.valid).toBe(true);
    });

    test('async catch: catch value does not pass its own schema → plain valid result (line 1689)', async () => {
        // number().catch('not-a-number') — catch value fails number validation
        const schema = number().catch('not-a-number' as any);
        const result = await schema.validateAsync('oops' as any);
        // Validation fails for 'oops', catch fires with 'not-a-number'
        // Re-validating 'not-a-number' as number also fails → plain { valid: true, object: 'not-a-number' }
        expect(result.valid).toBe(true);
        expect(result.object).toBe('not-a-number');
    });

    test('getValidationErrorMessageSync: invalid provider throws (line 1721)', () => {
        const schema = string();
        expect(() =>
            (schema as any).getValidationErrorMessageSync(null, 'test')
        ).toThrow('Invalid error message provider');
    });

    test('getValidationErrorMessage: invalid provider rejects (line 1746)', async () => {
        const schema = string();
        await expect(
            (schema as any).getValidationErrorMessage(null, 'test')
        ).rejects.toThrow('Invalid error message provider');
    });
});

// ---------------------------------------------------------------------------
// SchemaBuilder protected getters: hasCatch (line 838) and isReadonly (line 856)
// ---------------------------------------------------------------------------

test('hasCatch getter returns true for schema with catch, false otherwise (line 838)', () => {
    const schema = string().catch('fallback');
    expect((schema as any).hasCatch).toBe(true);
    expect((string() as any).hasCatch).toBe(false);
});

test('isReadonly getter returns true for readonly schema, false otherwise (line 856)', () => {
    const schema = string().readonly();
    expect((schema as any).isReadonly).toBe(true);
    expect((string() as any).isReadonly).toBe(false);
});

// ---------------------------------------------------------------------------
// SchemaBuilder line 1202: named validator function throwing includes the fn name
// ---------------------------------------------------------------------------

test('async validator with named function — error includes function name (line 1202)', async () => {
    async function myNamedValidator(_val: string) {
        throw new Error('boom from named');
    }
    const schema = string().addValidator(myNamedValidator as any);
    const { valid, errors } = await schema.validateAsync('hello');
    expect(valid).toBe(false);
    // fn.name = 'myNamedValidator' — the TRUE branch of line 1202
    expect(errors?.[0].message).toContain('myNamedValidator');
    expect(errors?.[0].message).toMatch(/thrown an error/);
});

// ---------------------------------------------------------------------------
// SchemaBuilder line 1177: nullable schema with validator and null input →
// validator block is SKIPPED (null && isNullable short-circuit)
// ---------------------------------------------------------------------------

test('preValidateAsync: nullable schema with validator skips validators for null (line 1177)', async () => {
    // string().nullable() + addValidator that returns invalid
    // When null is passed to a nullable schema, validators are skipped
    const schema = string()
        .nullable()
        .addValidator(async () => ({
            valid: false,
            errors: [{ message: 'should not appear' }]
        }));
    const { valid } = await schema.validateAsync(null as any);
    // null is valid for nullable schema — validators are skipped (line 1177 covers the branch)
    expect(valid).toBe(true);
});

// ---------------------------------------------------------------------------
// SchemaBuilder line 1169: preValidate (sync) — nullable schema with validator
// skips validators for null input (the FALSE branch of the validators if block)
// ---------------------------------------------------------------------------

test('preValidate sync: nullable schema with validator skips validators for null (line 1169)', () => {
    const schema = string()
        .nullable()
        .addValidator(() => ({
            valid: false,
            errors: [{ message: 'should not appear' }]
        }));
    const { valid } = schema.validate(null as any);
    // null is valid for nullable schema — sync validator block is skipped
    expect(valid).toBe(true);
});

// ---------------------------------------------------------------------------
// SchemaBuilder lines 1814, 1834: parse() and parseAsync() `result.errors || []`
// fallback when schema returns { valid: false } with no errors property
// ---------------------------------------------------------------------------

test('parse(): result.errors is undefined → fallback to [] in SchemaValidationError (line 1814)', () => {
    const schema = new NoErrorsStringSchema() as any;
    try {
        schema.parse('anything');
        expect.unreachable('should have thrown');
    } catch (e) {
        expect(e).toBeInstanceOf(SchemaValidationError);
        // errors falls back to []
        expect((e as SchemaValidationError).errors).toEqual([]);
    }
});

test('parseAsync(): result.errors is undefined → fallback to [] in SchemaValidationError (line 1834)', async () => {
    const schema = new NoErrorsStringSchema() as any;
    try {
        await schema.parseAsync('anything');
        expect.unreachable('should have thrown');
    } catch (e) {
        expect(e).toBeInstanceOf(SchemaValidationError);
        expect((e as SchemaValidationError).errors).toEqual([]);
    }
});
