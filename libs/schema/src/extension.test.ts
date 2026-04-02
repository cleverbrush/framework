import { describe, expect, expectTypeOf, test } from 'vitest';
import { ArraySchemaBuilder } from './builders/ArraySchemaBuilder.js';
import { BooleanSchemaBuilder } from './builders/BooleanSchemaBuilder.js';
import { DateSchemaBuilder } from './builders/DateSchemaBuilder.js';
import { FunctionSchemaBuilder } from './builders/FunctionSchemaBuilder.js';
import { NumberSchemaBuilder } from './builders/NumberSchemaBuilder.js';
import { ObjectSchemaBuilder } from './builders/ObjectSchemaBuilder.js';
import type { InferType } from './builders/SchemaBuilder.js';
import { SchemaBuilder } from './builders/SchemaBuilder.js';
import { StringSchemaBuilder } from './builders/StringSchemaBuilder.js';
import { UnionSchemaBuilder } from './builders/UnionSchemaBuilder.js';
import { string as plainString } from './core.js';
import { defineExtension, withExtensions } from './extension.js';
import { boolean, number, object, string } from './index.js';

// ===========================================================================
// Realistic extensions for ALL builder types
// ===========================================================================

// -- String extensions -------------------------------------------------------

// Keep emailExt as a complex/manual example
const emailExt = defineExtension({
    string: {
        email(this: StringSchemaBuilder, opts?: { domains?: string[] }) {
            return this.withExtension('email', opts ?? true).addValidator(
                val => {
                    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                    if (valid && opts?.domains && opts.domains.length > 0) {
                        const domain = val.split('@')[1];
                        const domainValid = opts.domains.includes(domain);
                        return {
                            valid: domainValid,
                            errors: domainValid
                                ? []
                                : [
                                      {
                                          message: `domain must be one of: ${opts.domains.join(', ')}`
                                      }
                                  ]
                        };
                    }
                    return {
                        valid,
                        errors: valid ? [] : [{ message: 'invalid email' }]
                    };
                }
            );
        }
    }
});

const urlExt = defineExtension({
    string: {
        url(this: StringSchemaBuilder, opts?: { protocols?: string[] }) {
            const protocols = opts?.protocols ?? ['http', 'https'];
            return this.addValidator(val => {
                try {
                    const parsed = new URL(val);
                    const protoOk = protocols.includes(
                        parsed.protocol.replace(':', '')
                    );
                    return {
                        valid: protoOk,
                        errors: protoOk
                            ? []
                            : [
                                  {
                                      message: `protocol must be one of: ${protocols.join(', ')}`
                                  }
                              ]
                    };
                } catch {
                    return {
                        valid: false,
                        errors: [{ message: 'invalid URL' }]
                    };
                }
            });
        }
    }
});

const trimmedExt = defineExtension({
    string: {
        trimmed(this: StringSchemaBuilder) {
            return this.addPreprocessor(val =>
                typeof val === 'string' ? val.trim() : val
            );
        }
    }
});

const slugExt = defineExtension({
    string: {
        slug(this: StringSchemaBuilder) {
            return this.addValidator(val => {
                const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val);
                return {
                    valid,
                    errors: valid
                        ? []
                        : [{ message: 'must be a valid URL slug' }]
                };
            });
        }
    }
});

const rangeExt = defineExtension({
    number: {
        range(this: NumberSchemaBuilder, min: number, max: number) {
            return this.addValidator(val => {
                const n = val;
                const valid = n >= min && n <= max;
                return {
                    valid,
                    errors: valid
                        ? []
                        : [{ message: `must be between ${min} and ${max}` }]
                };
            });
        }
    }
});

// -- Number extensions -------------------------------------------------------

const percentageExt = defineExtension({
    number: {
        percentage(this: NumberSchemaBuilder) {
            return this.min(0).max(100);
        }
    }
});

// Keep currencyExt as a complex/manual example
const currencyExt = defineExtension({
    number: {
        /**
         * Validates that a number is a valid currency amount with an optional maximum number of decimal places (default 2).
         * @param this
         * @param opts
         * @returns
         */
        currency(this: NumberSchemaBuilder, opts?: { maxDecimals?: number }) {
            const maxDec = opts?.maxDecimals ?? 2;
            return this.withExtension('currency', { maxDecimals: maxDec })
                .clearIsInteger()
                .min(0)
                .addValidator(val => {
                    const parts = String(val).split('.');
                    const decimals = parts[1]?.length ?? 0;
                    const valid = decimals <= maxDec;
                    return {
                        valid,
                        errors: valid
                            ? []
                            : [{ message: `max ${maxDec} decimal places` }]
                    };
                });
        }
    }
});

const portExt = defineExtension({
    number: {
        port(this: NumberSchemaBuilder) {
            return this.isInteger().min(1).max(65535);
        }
    }
});

// -- Boolean extensions ------------------------------------------------------

const toggleExt = defineExtension({
    boolean: {
        toggle(this: BooleanSchemaBuilder, label: string) {
            // Add a validator and set metadata as expected by tests
            return this.withExtension('toggle', { label }).addValidator(val => {
                const valid = typeof val === 'boolean';
                return {
                    valid,
                    errors: valid
                        ? []
                        : [{ message: 'must be a boolean toggle' }]
                };
            });
        }
    }
});

const consentExt = defineExtension({
    boolean: {
        consent(this: BooleanSchemaBuilder) {
            return this.equals(true, () => 'consent is required');
        }
    }
});

// -- Date extensions ---------------------------------------------------------

const ageExt = defineExtension({
    date: {
        minAge(this: DateSchemaBuilder, years: number) {
            return this.addValidator(val => {
                const d = val;
                const now = new Date();
                const age = now.getFullYear() - d.getFullYear();
                const valid = age >= years;
                return {
                    valid,
                    errors: valid
                        ? []
                        : [
                              {
                                  message: `must be at least ${years} years old`
                              }
                          ]
                };
            });
        }
    }
});

const businessDayExt = defineExtension({
    date: {
        businessDay(this: DateSchemaBuilder) {
            return this.addValidator(val => {
                const d = val;
                const day = d.getDay();
                const valid = day !== 0 && day !== 6;
                return {
                    valid,
                    errors: valid
                        ? []
                        : [{ message: 'must be a business day (Mon-Fri)' }]
                };
            });
        }
    }
});

// -- Object extensions -------------------------------------------------------

const timestampsExt = defineExtension({
    object: {
        timestamps(this: ObjectSchemaBuilder) {
            return this;
        }
    }
});

const softDeleteExt = defineExtension({
    object: {
        softDelete(this: ObjectSchemaBuilder) {
            return this;
        }
    }
});

// -- Array extensions --------------------------------------------------------

const uniqueExt = defineExtension({
    array: {
        unique(this: ArraySchemaBuilder<any, any, any, any, any>) {
            return this.addValidator(val => {
                const arr = val;
                const unique = new Set(arr).size === arr.length;
                return {
                    valid: unique,
                    errors: unique
                        ? []
                        : [{ message: 'elements must be unique' }]
                };
            });
        }
    }
});

const nonEmptyExt = defineExtension({
    array: {
        nonEmpty(this: ArraySchemaBuilder<any, any, any, any, any>) {
            return this.minLength(1);
        }
    }
});

// -- Union extensions --------------------------------------------------------

const labeledExt = defineExtension({
    union: {
        labeled(this: UnionSchemaBuilder<any, any, any, any>, label: string) {
            // Attach label metadata and add a dummy validator
            return this.withExtension('label', label).addValidator(_val => {
                // No-op validator, just for demonstration
                return { valid: true, errors: [] };
            });
        }
    }
});

// -- Function extensions -----------------------------------------------------

const debouncedExt = defineExtension({
    func: {
        debounced(this: FunctionSchemaBuilder, ms: number) {
            // Add a preprocessor and set metadata as expected by tests
            function debounce(fn: Function, wait: number) {
                let timeout: any;
                return function (this: any, ...args: any[]) {
                    clearTimeout(timeout);
                    return new Promise(resolve => {
                        timeout = setTimeout(
                            () => resolve(fn.apply(this, args)),
                            wait
                        );
                    });
                };
            }
            return this.withExtension('debounced', { ms }).addPreprocessor(
                fn => {
                    if (typeof fn !== 'function') return fn;
                    return debounce(fn, ms);
                }
            );
        }
    }
});

// ===========================================================================
// Tests
// ===========================================================================

// ---------------------------------------------------------------------------
// defineExtension() tests
// ---------------------------------------------------------------------------

describe('defineExtension', () => {
    test('creates a valid extension descriptor', () => {
        const ext = defineExtension({
            string: {
                myMethod(this: StringSchemaBuilder) {
                    return this;
                }
            }
        });
        expect(ext.config).toBeDefined();
        expect(ext.config.string).toBeDefined();
        expect(typeof ext.config.string!.myMethod).toBe('function');
    });

    test('rejects unknown builder type', () => {
        expect(() =>
            defineExtension({
                unknownType: {
                    foo() {
                        return this;
                    }
                }
            } as any)
        ).toThrow('Unknown builder type');
    });

    test('rejects reserved method names', () => {
        expect(() =>
            defineExtension({
                string: {
                    validate(this: StringSchemaBuilder) {
                        return this;
                    }
                } as any
            })
        ).toThrow('Cannot override reserved method "validate"');
    });

    test('rejects non-function method values', () => {
        expect(() =>
            defineExtension({
                string: {
                    notAFunction: 42
                } as any
            })
        ).toThrow('must be a function');
    });
});

// ---------------------------------------------------------------------------
// withExtensions() core tests
// ---------------------------------------------------------------------------

describe('withExtensions', () => {
    test('returns factory functions for all builder types', () => {
        const s = withExtensions(emailExt);
        expect(typeof s.string).toBe('function');
        expect(typeof s.number).toBe('function');
        expect(typeof s.boolean).toBe('function');
        expect(typeof s.date).toBe('function');
        expect(typeof s.object).toBe('function');
        expect(typeof s.array).toBe('function');
        expect(typeof s.union).toBe('function');
        expect(typeof s.func).toBe('function');
        expect(typeof s.any).toBe('function');
    });

    test('extended builder has extension methods', () => {
        const s = withExtensions(emailExt);
        const schema = s.string();
        expect(typeof schema.email).toBe('function');
    });

    test('basic extension method works', async () => {
        const s = withExtensions(emailExt);
        const schema = s.string().email();

        const validResult = await schema.validate('test@example.com');
        expect(validResult.valid).toBe(true);

        const invalidResult = await schema.validate('not-an-email');
        expect(invalidResult.valid).toBe(false);
    });

    test('extension with options works', async () => {
        const s = withExtensions(emailExt);
        const schema = s.string().email({ domains: ['example.com'] });

        const validResult = await schema.validate('test@example.com');
        expect(validResult.valid).toBe(true);

        const invalidResult = await schema.validate('test@other.com');
        expect(invalidResult.valid).toBe(false);
        expect(invalidResult.errors?.[0]?.message).toContain('domain must be');
    });

    test('extension state survives fluent chaining', () => {
        const s = withExtensions(emailExt);
        const schema = s
            .string()
            .email({ domains: ['x.com'] })
            .minLength(5);

        const introspected = schema.introspect();
        expect(introspected.extensions.email).toEqual({ domains: ['x.com'] });
        expect(introspected.minLength).toBe(5);
    });

    test('extension methods survive optional()/required()', () => {
        const s = withExtensions(emailExt);
        const schema = s.string().email().optional();

        // Extension state should still be present
        expect(schema.introspect().extensions.email).toBe(true);
        // Extension method should still be accessible
        expect(typeof schema.email).toBe('function');
    });

    test('multiple extensions stack', () => {
        const s = withExtensions(emailExt, slugExt);
        const schema = s.string();

        expect(typeof schema.email).toBe('function');
        expect(typeof schema.slug).toBe('function');
    });

    test('multiple extensions target different builders', async () => {
        const s = withExtensions(emailExt, rangeExt);

        const emailSchema = s.string().email();
        const rangeSchema = s.number().range(0, 100);

        const emailResult = await emailSchema.validate('test@test.com');
        expect(emailResult.valid).toBe(true);

        const rangeValidResult = await rangeSchema.validate(50);
        expect(rangeValidResult.valid).toBe(true);

        const rangeInvalidResult = await rangeSchema.validate(150);
        expect(rangeInvalidResult.valid).toBe(false);
    });

    test('stacked extension methods both work', async () => {
        const s = withExtensions(emailExt, slugExt);

        const emailSchema = s.string().email();
        const slugSchema = s.string().slug();

        const emailResult = await emailSchema.validate('test@test.com');
        expect(emailResult.valid).toBe(true);

        const slugResult = await slugSchema.validate('my-cool-slug');
        expect(slugResult.valid).toBe(true);

        const invalidSlugResult = await slugSchema.validate('Not A Slug!');
        expect(invalidSlugResult.valid).toBe(false);
    });

    test('name collision between extensions throws', () => {
        const ext1 = defineExtension({
            string: {
                duplicate(this: StringSchemaBuilder) {
                    return this;
                }
            }
        });
        const ext2 = defineExtension({
            string: {
                duplicate(this: StringSchemaBuilder) {
                    return this;
                }
            }
        });

        expect(() => (withExtensions as Function)(ext1, ext2)).toThrow(
            'Extension method collision: "duplicate"'
        );
    });

    test('non-extended builders work as normal', async () => {
        const s = withExtensions(emailExt);

        // number() has no extensions from emailExt
        const numSchema = s.number();
        const result = await numSchema.validate(42);
        expect(result.valid).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// withExtension / getExtension
// ---------------------------------------------------------------------------

describe('extension metadata', () => {
    test('withExtension stores data that survives chaining', () => {
        const schema = plainString()
            .withExtension('customKey', { data: 42 })
            .minLength(3);

        expect(schema.getExtension('customKey')).toEqual({ data: 42 });
        expect(schema.introspect().extensions.customKey).toEqual({ data: 42 });
    });

    test('getExtension returns undefined for missing keys', () => {
        const schema = plainString();
        expect(schema.getExtension('nonexistent')).toBeUndefined();
    });

    test('multiple extension keys coexist', () => {
        const schema = plainString()
            .withExtension('key1', 'value1')
            .withExtension('key2', 'value2');

        expect(schema.getExtension('key1')).toBe('value1');
        expect(schema.getExtension('key2')).toBe('value2');
    });
});

// ---------------------------------------------------------------------------
// Back-compat: plain builders
// ---------------------------------------------------------------------------

describe('backward compatibility', () => {
    test('plain string() still works', async () => {
        const result = await string().validate('hello');
        expect(result.valid).toBe(true);
    });

    test('plain number() still works', async () => {
        const result = await number().validate(42);
        expect(result.valid).toBe(true);
    });

    test('introspect() includes extensions field', () => {
        const schema = string();
        expect(schema.introspect().extensions).toEqual({});
    });

    test('fluent chaining preserves empty extensions', () => {
        const schema = string().minLength(3).maxLength(10).optional();
        expect(schema.introspect().extensions).toEqual({});
    });
});

// ---------------------------------------------------------------------------
// 1. Per-builder extension tests
// ---------------------------------------------------------------------------

describe('string extensions', () => {
    test('email validates correct format', async () => {
        const s = withExtensions(emailExt);
        const schema = s.string().email();
        expect((await schema.validate('user@test.com')).valid).toBe(true);
        expect((await schema.validate('bad')).valid).toBe(false);
    });

    test('url validates with default protocols', async () => {
        const s = withExtensions(urlExt);
        const schema = s.string().url();
        expect((await schema.validate('https://example.com')).valid).toBe(true);
        expect((await schema.validate('ftp://example.com')).valid).toBe(false);
    });

    test('url validates with custom protocols', async () => {
        const s = withExtensions(urlExt);
        const schema = s.string().url({ protocols: ['ftp', 'https'] });
        expect((await schema.validate('ftp://files.example.com')).valid).toBe(
            true
        );
        expect((await schema.validate('http://example.com')).valid).toBe(false);
    });

    test('trimmed preprocessor strips whitespace', async () => {
        const s = withExtensions(trimmedExt);
        const schema = s.string().trimmed().minLength(3);
        // "  ab  " trims to "ab" which is < 3
        expect((await schema.validate('  ab  ')).valid).toBe(false);
        // "  abc  " trims to "abc" which is 3
        expect((await schema.validate('  abc  ')).valid).toBe(true);
    });

    test('slug validates hyphenated lowercase strings', async () => {
        const s = withExtensions(slugExt);
        const schema = s.string().slug();
        expect((await schema.validate('my-cool-post')).valid).toBe(true);
        expect((await schema.validate('My Cool Post')).valid).toBe(false);
        expect((await schema.validate('trailing-')).valid).toBe(false);
    });
});

describe('number extensions', () => {
    test('percentage constrains to 0-100', async () => {
        const s = withExtensions(percentageExt);
        const schema = s.number().percentage();
        expect((await schema.validate(50)).valid).toBe(true);
        expect((await schema.validate(0)).valid).toBe(true);
        expect((await schema.validate(100)).valid).toBe(true);
        expect((await schema.validate(-1)).valid).toBe(false);
        expect((await schema.validate(101)).valid).toBe(false);
    });

    test('currency validates decimal places', async () => {
        const s = withExtensions(currencyExt);
        const schema = s.number().currency({ maxDecimals: 2 });

        expect((await schema.validate(19.99)).valid).toBe(true);
        expect((await schema.validate(19.999)).valid).toBe(false);
        expect((await schema.validate(-5)).valid).toBe(false);
    });

    test('port validates port range and integer', async () => {
        const s = withExtensions(portExt);
        const schema = s.number().port();
        expect((await schema.validate(8080)).valid).toBe(true);
        expect((await schema.validate(0)).valid).toBe(false);
        expect((await schema.validate(70000)).valid).toBe(false);
    });
});

describe('boolean extensions', () => {
    test('toggle stores label metadata', () => {
        const s = withExtensions(toggleExt);
        const schema = s.boolean().toggle('Dark Mode');
        expect(schema.introspect().extensions.toggle).toEqual({
            label: 'Dark Mode'
        });
    });

    test('consent requires true', async () => {
        const s = withExtensions(consentExt);
        const schema = s.boolean().consent();
        expect((await schema.validate(true)).valid).toBe(true);
        expect((await schema.validate(false)).valid).toBe(false);
    });
});

describe('date extensions', () => {
    test('minAge validates minimum age in years', async () => {
        const s = withExtensions(ageExt);
        const schema = s.date().minAge(18);
        const old = new Date(1990, 0, 1);
        const young = new Date(new Date().getFullYear() - 5, 0, 1);
        expect((await schema.validate(old)).valid).toBe(true);
        expect((await schema.validate(young)).valid).toBe(false);
    });

    test('businessDay rejects weekends', async () => {
        const s = withExtensions(businessDayExt);
        const schema = s.date().businessDay();
        // Find next Monday
        const monday = new Date(2024, 0, 1); // Jan 1, 2024 is a Monday
        const sunday = new Date(2024, 0, 7); // Jan 7, 2024 is a Sunday
        expect((await schema.validate(monday)).valid).toBe(true);
        expect((await schema.validate(sunday)).valid).toBe(false);
    });
});

describe('object extensions', () => {
    test('timestamps extension stores metadata', () => {
        const s = withExtensions(timestampsExt);
        const schema = s.object({ name: string() }).timestamps();
        expect(schema.introspect().extensions.timestamps).toBe(true);
    });

    test('softDelete extension stores metadata', () => {
        const s = withExtensions(softDeleteExt);
        const schema = s.object({ id: number() }).softDelete();
        expect(schema.introspect().extensions.softDelete).toBe(true);
    });
});

describe('array extensions', () => {
    test('unique rejects duplicate elements', async () => {
        const s = withExtensions(uniqueExt);
        const schema = s.array(number()).unique();
        expect((await schema.validate([1, 2, 3])).valid).toBe(true);
        expect((await schema.validate([1, 2, 2])).valid).toBe(false);
    });

    test('nonEmpty rejects empty arrays', async () => {
        const s = withExtensions(nonEmptyExt);
        const schema = s.array(string()).nonEmpty();
        expect((await schema.validate(['a'])).valid).toBe(true);
        expect((await schema.validate([])).valid).toBe(false);
    });
});

describe('union extensions', () => {
    test('labeled stores discriminator label', () => {
        const s = withExtensions(labeledExt);
        const schema = s.union(string()).or(number()).labeled('StringOrNumber');
        expect(schema.introspect().extensions.label).toBe('StringOrNumber');
    });
});

describe('function extensions', () => {
    test('debounced stores debounce ms', () => {
        const s = withExtensions(debouncedExt);
        const schema = s.func().debounced(300);
        expect(schema.introspect().extensions.debounced).toEqual({ ms: 300 });
    });
});

// ---------------------------------------------------------------------------
// 2. Multi-builder combination tests
// ---------------------------------------------------------------------------

describe('cross-builder extension combinations', () => {
    test('email + percentage target different builders', async () => {
        const s = withExtensions(emailExt, percentageExt);

        const emailSchema = s.string().email();
        const pctSchema = s.number().percentage();

        expect((await emailSchema.validate('a@b.co')).valid).toBe(true);
        expect((await pctSchema.validate(50)).valid).toBe(true);
        expect((await pctSchema.validate(200)).valid).toBe(false);
    });

    test('all builder types in one withExtensions call', () => {
        const s = withExtensions(
            emailExt,
            percentageExt,
            toggleExt,
            ageExt,
            timestampsExt,
            uniqueExt,
            labeledExt,
            debouncedExt
        );

        // Every factory type is accessible
        expect(typeof s.string).toBe('function');
        expect(typeof s.number).toBe('function');
        expect(typeof s.boolean).toBe('function');
        expect(typeof s.date).toBe('function');
        expect(typeof s.object).toBe('function');
        expect(typeof s.array).toBe('function');
        expect(typeof s.union).toBe('function');
        expect(typeof s.func).toBe('function');
        expect(typeof s.any).toBe('function');

        // Extension methods exist on each builder
        expect(typeof s.string().email).toBe('function');
        expect(typeof s.number().percentage).toBe('function');
        expect(typeof s.boolean().toggle).toBe('function');
        expect(typeof s.date().minAge).toBe('function');
        expect(typeof s.object({}).timestamps).toBe('function');
        expect(typeof s.array().unique).toBe('function');
        expect(typeof s.union(string()).labeled).toBe('function');
        expect(typeof s.func().debounced).toBe('function');
    });
});

// ---------------------------------------------------------------------------
// 3. Same-builder stacking tests
// ---------------------------------------------------------------------------

describe('stacking multiple extensions on the same builder', () => {
    test('email + slug + url + trimmed all exist on string', () => {
        const s = withExtensions(emailExt, slugExt, urlExt, trimmedExt);
        const schema = s.string();

        expect(typeof schema.email).toBe('function');
        expect(typeof schema.slug).toBe('function');
        expect(typeof schema.url).toBe('function');
        expect(typeof schema.trimmed).toBe('function');
    });

    test('percentage + currency + port all exist on number', () => {
        const s = withExtensions(percentageExt, currencyExt, portExt);
        const schema = s.number();

        expect(typeof schema.percentage).toBe('function');
        expect(typeof schema.currency).toBe('function');
        expect(typeof schema.port).toBe('function');
    });

    test('toggle + consent both exist on boolean', () => {
        const s = withExtensions(toggleExt, consentExt);
        const schema = s.boolean();

        expect(typeof schema.toggle).toBe('function');
        expect(typeof schema.consent).toBe('function');
    });

    test('unique + nonEmpty both exist on array', () => {
        const s = withExtensions(uniqueExt, nonEmptyExt);
        const schema = s.array(number());

        expect(typeof schema.unique).toBe('function');
        expect(typeof schema.nonEmpty).toBe('function');
    });

    test('stacked string extensions validate independently', async () => {
        const s = withExtensions(emailExt, slugExt);

        const emailSchema = s.string().email();
        const slugSchema = s.string().slug();

        expect((await emailSchema.validate('a@b.com')).valid).toBe(true);
        expect((await emailSchema.validate('not-a-slug')).valid).toBe(false);

        expect((await slugSchema.validate('valid-slug')).valid).toBe(true);
        expect((await slugSchema.validate('a@b.com')).valid).toBe(false);
    });

    test('stacked number extensions validate independently', async () => {
        const s = withExtensions(percentageExt, portExt);

        const pctSchema = s.number().percentage();
        const portSchema = s.number().port();

        // 50 is a valid percentage but a valid port too
        expect((await pctSchema.validate(50)).valid).toBe(true);
        expect((await portSchema.validate(50)).valid).toBe(true);

        // 200 fails percentage but passes port
        expect((await pctSchema.validate(200)).valid).toBe(false);
        expect((await portSchema.validate(200)).valid).toBe(true);

        // 70000 fails both
        expect((await pctSchema.validate(70000)).valid).toBe(false);
        expect((await portSchema.validate(70000)).valid).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 4. Extension chaining with built-in methods
// ---------------------------------------------------------------------------

describe('extension methods interleaved with built-in methods', () => {
    test('email → minLength → required', async () => {
        const s = withExtensions(emailExt);
        const schema = s.string().email().minLength(10).required();

        // Short but valid email format
        expect((await schema.validate('a@b.co')).valid).toBe(false); // too short
        expect((await schema.validate('user@example.com')).valid).toBe(true);
    });

    test('required → email → maxLength', async () => {
        const s = withExtensions(emailExt);
        const schema = s.string().required().email().maxLength(20);

        expect((await schema.validate('user@example.com')).valid).toBe(true);
        expect(
            (
                await schema.validate(
                    'very.long.user.name@very.long.domain.example.com'
                )
            ).valid
        ).toBe(false);
    });

    test('percentage → notNaN → isFinite interleaved', async () => {
        const s = withExtensions(percentageExt);
        const schema = s.number().percentage().notNaN().isFinite();

        expect((await schema.validate(50)).valid).toBe(true);
        expect((await schema.validate(NaN)).valid).toBe(false);
        expect((await schema.validate(Infinity)).valid).toBe(false);
    });

    test('trimmed → slug validates correctly end-to-end', async () => {
        const s = withExtensions(trimmedExt, slugExt);
        const schema = s.string().trimmed().slug();

        // Trimming " my-slug " → "my-slug" which is a valid slug
        expect((await schema.validate(' my-slug ')).valid).toBe(true);
        // Trimming " My Slug " → "My Slug" which is NOT a valid slug
        expect((await schema.validate(' My Slug ')).valid).toBe(false);
    });

    test('unique → minLength → maxLength on array', async () => {
        const s = withExtensions(uniqueExt);
        const schema = s.array(number()).unique().minLength(2).maxLength(5);

        expect((await schema.validate([1, 2, 3])).valid).toBe(true);
        expect((await schema.validate([1])).valid).toBe(false); // too short
        expect((await schema.validate([1, 1, 2])).valid).toBe(false); // not unique
        expect((await schema.validate([1, 2, 3, 4, 5, 6])).valid).toBe(false); // too long
    });

    test('minAge → isInPast on date', async () => {
        const s = withExtensions(ageExt);
        const schema = s.date().minAge(18).isInPast();

        const adult = new Date(1990, 0, 1);
        expect((await schema.validate(adult)).valid).toBe(true);

        const future = new Date(3000, 0, 1);
        expect((await schema.validate(future)).valid).toBe(false);
    });

    test('businessDay → min → max on date', async () => {
        const s = withExtensions(businessDayExt);
        const minDate = new Date(2024, 0, 1); // Jan 1 2024 (Monday)
        const maxDate = new Date(2024, 11, 31); // Dec 31 2024
        const schema = s.date().businessDay().min(minDate).max(maxDate);

        const wednesday = new Date(2024, 5, 12); // Jun 12, 2024 (Wednesday)
        expect((await schema.validate(wednesday)).valid).toBe(true);

        const outOfRange = new Date(2025, 0, 6); // Jan 6, 2025 (Monday but out of range)
        expect((await schema.validate(outOfRange)).valid).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 5. Extension order independence
// ---------------------------------------------------------------------------

describe('extension application order independence', () => {
    test('email+slug vs slug+email produce same methods', () => {
        const s1 = withExtensions(emailExt, slugExt);
        const s2 = withExtensions(slugExt, emailExt);

        const b1 = s1.string();
        const b2 = s2.string();

        expect(typeof b1.email).toBe('function');
        expect(typeof b1.slug).toBe('function');
        expect(typeof b2.email).toBe('function');
        expect(typeof b2.slug).toBe('function');
    });

    test('email+slug vs slug+email yield same validation', async () => {
        const s1 = withExtensions(emailExt, slugExt);
        const s2 = withExtensions(slugExt, emailExt);

        // Both should validate email the same way
        const v1 = await s1.string().email().validate('a@b.co');
        const v2 = await s2.string().email().validate('a@b.co');
        expect(v1.valid).toBe(v2.valid);

        // Both should validate slug the same way
        const v3 = await s1.string().slug().validate('ok-slug');
        const v4 = await s2.string().slug().validate('ok-slug');
        expect(v3.valid).toBe(v4.valid);
    });

    test('percentage+port vs port+percentage produce same validation', async () => {
        const s1 = withExtensions(percentageExt, portExt);
        const s2 = withExtensions(portExt, percentageExt);

        const v1 = await s1.number().port().validate(80);
        const v2 = await s2.number().port().validate(80);
        expect(v1.valid).toBe(v2.valid);
    });
});

// ---------------------------------------------------------------------------
// 6. Complex object schemas with extended fields
// ---------------------------------------------------------------------------

describe('realistic object schemas with extensions', () => {
    test('user registration form schema', async () => {
        const s = withExtensions(
            emailExt,
            trimmedExt,
            percentageExt,
            consentExt,
            ageExt
        );

        const userSchema = object({
            email: s
                .string()
                .email({ domains: ['company.com'] })
                .required(),
            displayName: s.string().trimmed().minLength(2).maxLength(50),
            age: s.number().percentage(), // using 0-100 as age range
            birthDate: s.date().minAge(18),
            tosAccepted: s.boolean().consent()
        });

        const validUser = {
            email: 'john@company.com',
            displayName: 'John Doe',
            age: 30,
            birthDate: new Date(1990, 5, 15),
            tosAccepted: true
        };

        const result = await userSchema.validate(validUser);
        expect(result.valid).toBe(true);
    });

    test('API config schema', () => {
        const s = withExtensions(urlExt, portExt, toggleExt);

        const configSchema = object({
            baseUrl: s
                .string()
                .url({ protocols: ['https'] })
                .required(),
            port: s.number().port(),
            debug: s.boolean().toggle('Debug Mode'),
            timeout: number().min(100).max(30000)
        });

        const introspected = configSchema.introspect();
        expect(introspected.properties).toBeDefined();
    });

    test('blog post schema with slug and tags', async () => {
        const s = withExtensions(
            slugExt,
            trimmedExt,
            uniqueExt,
            nonEmptyExt,
            timestampsExt
        );

        const postSchema = s
            .object({
                title: s.string().trimmed().minLength(5).maxLength(200),
                slug: s.string().slug().minLength(3).maxLength(100),
                tags: s.array(string()).unique().nonEmpty().maxLength(10)
            })
            .timestamps();

        expect(postSchema.introspect().extensions.timestamps).toBe(true);

        const validPost = {
            title: 'My First Post',
            slug: 'my-first-post',
            tags: ['javascript', 'typescript']
        };
        const result = await postSchema.validate(validPost);
        expect(result.valid).toBe(true);

        const invalidPost = {
            title: 'My First Post',
            slug: 'my-first-post',
            tags: ['js', 'js'] // duplicate
        };
        const result2 = await postSchema.validate(invalidPost);
        expect(result2.valid).toBe(false);
    });

    test('e-commerce product schema', async () => {
        const s = withExtensions(currencyExt, trimmedExt, urlExt, nonEmptyExt);

        const productSchema = object({
            name: s.string().trimmed().minLength(1).maxLength(255),
            price: s.number().currency({ maxDecimals: 2 }),
            imageUrl: s.string().url(),
            categories: s.array(string()).nonEmpty()
        });

        const valid = {
            name: 'Widget',
            price: 9.99,
            imageUrl: 'https://cdn.example.com/img.png',
            categories: ['gadgets']
        };
        expect((await productSchema.validate(valid)).valid).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 7. Type inference tests
// ---------------------------------------------------------------------------

describe('type inference with extensions', () => {
    test('InferType works with standard builders', () => {
        const schema = string();
        type T = InferType<typeof schema>;
        expectTypeOf<T>().toEqualTypeOf<string>();
    });

    test('InferType works with multiple extensions on same builder', () => {
        const s = withExtensions(emailExt, slugExt);
        const schema = s.string();
        type T = InferType<typeof schema>;
        expectTypeOf<T>().toEqualTypeOf<string>();

        // Verify extension methods exist on the type
        expectTypeOf(schema.email).toBeFunction();
        expectTypeOf(schema.slug).toBeFunction();

        // Verify chaining preserves methods
        const chained = s.string().email();
        expectTypeOf(chained.slug).toBeFunction();
        expectTypeOf(chained.email).toBeFunction();
    });

    test('InferType on extended string builder', () => {
        const s = withExtensions(emailExt);
        const schema = s.string().email();
        type T = InferType<typeof schema>;
        expectTypeOf<T>().toEqualTypeOf<string>();
    });

    test('InferType on extended number builder', () => {
        const s = withExtensions(percentageExt);
        const schema = s.number().percentage();
        type T = InferType<typeof schema>;
        expectTypeOf<T>().toEqualTypeOf<number>();
    });

    test('InferType on extended boolean builder', () => {
        const s = withExtensions(consentExt);
        const schema = s.boolean().consent();
        type T = InferType<typeof schema>;
        expectTypeOf<T>().toEqualTypeOf<boolean>();
    });

    test('InferType on extended date builder', () => {
        const s = withExtensions(ageExt);
        const schema = s.date().minAge(18);
        type T = InferType<typeof schema>;
        expectTypeOf<T>().toEqualTypeOf<Date>();
    });

    test('InferType on optional extended builder', () => {
        const s = withExtensions(emailExt);
        const schema = s.string().email().optional();
        type T = InferType<typeof schema>;
        expectTypeOf<T>().toEqualTypeOf<string | undefined>();
    });

    test('InferType on object with mixed extended and plain fields', () => {
        const s = withExtensions(emailExt, percentageExt);
        const schema = object({
            email: s.string().email(),
            score: s.number().percentage(),
            name: string(),
            count: number()
        });
        type T = InferType<typeof schema>;
        expectTypeOf<T>().toEqualTypeOf<{
            email: string;
            score: number;
            name: string;
            count: number;
        }>();
    });

    test('extension methods are visible on type after chaining', () => {
        const s = withExtensions(emailExt, slugExt, urlExt, trimmedExt);
        const schema = s.string();

        expectTypeOf(schema.email).toBeFunction();
        expectTypeOf(schema.slug).toBeFunction();
        expectTypeOf(schema.url).toBeFunction();
        expectTypeOf(schema.trimmed).toBeFunction();
    });

    test('extension methods survive optional() in types', () => {
        const s = withExtensions(emailExt, slugExt);
        const schema = s.string().email().optional();

        expectTypeOf(schema.slug).toBeFunction();
        expectTypeOf(schema.email).toBeFunction();
    });

    test('extension methods survive minLength() in types', () => {
        const s = withExtensions(emailExt, slugExt);
        const schema = s.string().minLength(5);

        expectTypeOf(schema.email).toBeFunction();
        expectTypeOf(schema.slug).toBeFunction();
    });
});

// ---------------------------------------------------------------------------
// 8. instanceof checks with all builder types
// ---------------------------------------------------------------------------

describe('instanceof checks for all builder types', () => {
    test('extended string instanceof StringSchemaBuilder', () => {
        const s = withExtensions(emailExt);
        expect(s.string().email()).toBeInstanceOf(StringSchemaBuilder);
        expect(s.string().email()).toBeInstanceOf(SchemaBuilder);
    });

    test('extended builder after chaining is still instanceof', () => {
        const s = withExtensions(emailExt);
        const schema = s.string().email().minLength(3).optional();
        expect(schema).toBeInstanceOf(StringSchemaBuilder);
        expect(schema).toBeInstanceOf(SchemaBuilder);
    });

    test('extended number instanceof NumberSchemaBuilder', () => {
        const s = withExtensions(percentageExt);
        expect(s.number().percentage()).toBeInstanceOf(NumberSchemaBuilder);
        expect(s.number().percentage()).toBeInstanceOf(SchemaBuilder);
    });

    test('extended boolean instanceof BooleanSchemaBuilder', () => {
        const s = withExtensions(toggleExt);
        expect(s.boolean().toggle('x')).toBeInstanceOf(BooleanSchemaBuilder);
    });

    test('extended date instanceof DateSchemaBuilder', () => {
        const s = withExtensions(ageExt);
        expect(s.date().minAge(18)).toBeInstanceOf(DateSchemaBuilder);
    });

    test('extended object instanceof ObjectSchemaBuilder', () => {
        const s = withExtensions(timestampsExt);
        expect(s.object({}).timestamps()).toBeInstanceOf(ObjectSchemaBuilder);
    });

    test('extended array instanceof ArraySchemaBuilder', () => {
        const s = withExtensions(uniqueExt);
        expect(s.array(string()).unique()).toBeInstanceOf(ArraySchemaBuilder);
    });

    test('extended union instanceof UnionSchemaBuilder', () => {
        const s = withExtensions(labeledExt);
        expect(s.union(string()).labeled('test')).toBeInstanceOf(
            UnionSchemaBuilder
        );
    });

    test('extended func instanceof FunctionSchemaBuilder', () => {
        const s = withExtensions(debouncedExt);
        expect(s.func().debounced(300)).toBeInstanceOf(FunctionSchemaBuilder);
    });
});

// ---------------------------------------------------------------------------
// 9. Extension state via introspect()
// ---------------------------------------------------------------------------

describe('extension state via introspect()', () => {
    test('multiple extension keys visible in introspect', () => {
        const s = withExtensions(emailExt, slugExt);
        const schema = s.string().email({ domains: ['x.com'] });

        const intro = schema.introspect();
        expect(intro.extensions.email).toEqual({ domains: ['x.com'] });
    });

    test('extension state survives long chain', () => {
        const s = withExtensions(emailExt, trimmedExt);
        const schema = s
            .string()
            .email()
            .trimmed()
            .minLength(5)
            .maxLength(100)
            .required();

        const intro = schema.introspect();
        expect(intro.extensions.email).toBe(true);
        expect(intro.extensions.trimmed).toBe(true);
        expect(intro.minLength).toBe(5);
        expect(intro.maxLength).toBe(100);
        expect(intro.isRequired).toBe(true);
    });

    test('number extension state includes built-in constraints', () => {
        const s = withExtensions(currencyExt);
        const schema = s.number().currency({ maxDecimals: 3 }).isInteger();

        const intro = schema.introspect();
        expect(intro.extensions.currency).toEqual({ maxDecimals: 3 });
        expect(intro.isInteger).toBe(true);
    });

    test('array extension state includes minLength', () => {
        const s = withExtensions(nonEmptyExt);
        const schema = s.array(string()).nonEmpty();

        const intro = schema.introspect();
        expect(intro.extensions.nonEmpty).toBe(true);
        expect(intro.minLength).toBe(1);
    });

    test('date extension state includes custom metadata', () => {
        const s = withExtensions(ageExt, businessDayExt);
        const schema = s.date().minAge(21).businessDay();

        const intro = schema.introspect();
        expect(intro.extensions.minAge).toBe(21);
        expect(intro.extensions.businessDay).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 10. Edge cases and error scenarios
// ---------------------------------------------------------------------------

describe('edge cases', () => {
    test('non-extended builders from withExtensions work normally', async () => {
        const s = withExtensions(emailExt);
        // number has no email extension
        const schema = s.number().min(0).max(10);
        expect((await schema.validate(5)).valid).toBe(true);
        expect((await schema.validate(15)).valid).toBe(false);
    });

    test('withExtensions with single extension', () => {
        const s = withExtensions(emailExt);
        const schema = s.string().email();
        expect(schema.introspect().extensions.email).toBe(true);
    });

    test('extended builder can be used as object property', async () => {
        const s = withExtensions(emailExt, percentageExt);
        const schema = object({
            notification: s.string().email(),
            progress: s.number().percentage().optional()
        });

        const result = await schema.validate({
            notification: 'a@b.com',
            progress: 50
        });
        expect(result.valid).toBe(true);
    });

    test('extension method called multiple times overwrites state', () => {
        const s = withExtensions(emailExt);
        const schema = s
            .string()
            .email({ domains: ['a.com'] })
            .email({ domains: ['b.com'] });

        // Last call wins for the extension state
        expect(schema.introspect().extensions.email).toEqual({
            domains: ['b.com']
        });
    });

    test('extension on optional required toggle', () => {
        const s = withExtensions(portExt);
        const schema = s.number().port().optional().required();

        const intro = schema.introspect();
        expect(intro.extensions.port).toBe(true);
        expect(intro.isRequired).toBe(true);
    });

    test('object with addProp preserves extensions', () => {
        const s = withExtensions(timestampsExt);
        const base = s.object({ id: number() }).timestamps();
        const extended = base.addProp('name', string());

        expect(extended.introspect().extensions.timestamps).toBe(true);
    });

    test('object with partial preserves extensions', () => {
        const s = withExtensions(softDeleteExt);
        const schema = s
            .object({
                name: string(),
                age: number()
            })
            .softDelete()
            .partial();

        expect(schema.introspect().extensions.softDelete).toBe(true);
    });

    test('array with of() preserves extensions', async () => {
        const s = withExtensions(uniqueExt);
        const schema = s.array(string()).unique().of(number());

        expect(schema.introspect().extensions.unique).toBe(true);
        expect((await schema.validate([1, 2, 3])).valid).toBe(true);
        expect((await schema.validate([1, 1, 2])).valid).toBe(false);
    });

    test('union with or() preserves extensions', () => {
        const s = withExtensions(labeledExt);
        const schema = s
            .union(string())
            .labeled('PrimitiveOrArray')
            .or(number())
            .or(boolean());

        expect(schema.introspect().extensions.label).toBe('PrimitiveOrArray');
    });
});

// ---------------------------------------------------------------------------
// 11. Realistic validation pipelines
// ---------------------------------------------------------------------------

describe('realistic validation pipelines', () => {
    test('email domain restriction + minLength works together', async () => {
        const s = withExtensions(emailExt);
        const schema = s
            .string()
            .email({ domains: ['corp.io'] })
            .minLength(10);

        // Valid email with correct domain and length
        expect((await schema.validate('admin@corp.io')).valid).toBe(true);
        // Valid format but wrong domain
        expect((await schema.validate('admin@gmail.com')).valid).toBe(false);
        // Correct domain but too short
        expect((await schema.validate('a@corp.io')).valid).toBe(false);
    });

    test('currency amount in range', async () => {
        const s = withExtensions(currencyExt);
        const schema = s.number().currency().max(999.99);

        expect((await schema.validate(19.99)).valid).toBe(true);
        expect((await schema.validate(1000)).valid).toBe(false);
        expect((await schema.validate(9.999)).valid).toBe(false);
    });

    test('unique tags with individual string validation', async () => {
        const s = withExtensions(uniqueExt, slugExt);

        // Each tag must be a slug, and the list must be unique
        const tagsSchema = s.array(s.string().slug()).unique();

        expect((await tagsSchema.validate(['web-dev', 'node-js'])).valid).toBe(
            true
        );
        expect((await tagsSchema.validate(['web-dev', 'web-dev'])).valid).toBe(
            false
        );
        expect((await tagsSchema.validate(['web-dev', 'Bad Tag!'])).valid).toBe(
            false
        );
    });

    test('contact form with trimmed fields', async () => {
        const s = withExtensions(emailExt, trimmedExt);

        const contactSchema = object({
            name: s.string().trimmed().minLength(2).maxLength(100),
            email: s.string().trimmed().email(),
            message: s.string().trimmed().minLength(10).maxLength(1000)
        });

        const validForm = {
            name: '  John Doe  ',
            email: '  john@example.com  ',
            message: '  Hello, this is my message to you!  '
        };

        const result = await contactSchema.validate(validForm);
        expect(result.valid).toBe(true);
    });
});
