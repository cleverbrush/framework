import { describe, expect, expectTypeOf, test } from 'vitest';
import { any } from './AnySchemaBuilder.js';
import { array } from './ArraySchemaBuilder.js';
import { boolean } from './BooleanSchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import { func } from './FunctionSchemaBuilder.js';
import { nul } from './NullSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

describe('.default() — string', () => {
    test('substitutes default when input is undefined', () => {
        const schema = string().default('hello');
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('hello');
    });

    test('does NOT substitute default when input is null', () => {
        const schema = string().default('hello');
        const result = schema.validate(null as any);
        expect(result.valid).toBe(false);
    });

    test('passes through non-undefined values unchanged', () => {
        const schema = string().default('hello');
        const result = schema.validate('world');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('world');
    });

    test('validates default value against constraints', () => {
        const schema = string().minLength(10).default('short');
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(false);
    });

    test('works with factory function', () => {
        let callCount = 0;
        const schema = string().default(() => {
            callCount++;
            return 'lazy';
        });
        const r1 = schema.validate(undefined as any);
        expect(r1.valid).toBe(true);
        expect(r1.object).toBe('lazy');
        expect(callCount).toBe(1);

        // factory is called each time
        schema.validate(undefined as any);
        expect(callCount).toBe(2);
    });

    test('survives chaining', () => {
        const schema = string().default('x').minLength(1);
        const introspected = schema.introspect();
        expect(introspected.defaultValue).toBe('x');

        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('x');
    });

    test('works with optional()', () => {
        const schema = string().optional().default('fallback');
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('fallback');
    });

    test('works with async validation', async () => {
        const schema = string().default('async-default');
        const result = await schema.validateAsync(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('async-default');
    });

    test('works on slow path (with preprocessor)', () => {
        const schema = string()
            .addPreprocessor(v => (v ? v.trim() : v), { mutates: false })
            .default('preprocessed');
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('preprocessed');
    });
});

describe('.default() — number', () => {
    test('substitutes default when input is undefined', () => {
        const schema = number().default(42);
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(42);
    });

    test('passes through non-undefined values', () => {
        const schema = number().default(42);
        const result = schema.validate(7);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(7);
    });

    test('validates default against constraints', () => {
        const schema = number().min(100).default(5);
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(false);
    });
});

describe('.default() — boolean', () => {
    test('substitutes default when input is undefined', () => {
        const schema = boolean().default(false);
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(false);
    });
});

describe('.default() — date', () => {
    test('substitutes default when input is undefined', () => {
        const defaultDate = new Date('2025-01-01');
        const schema = date().default(defaultDate);
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual(defaultDate);
    });

    test('factory function for mutable default', () => {
        const schema = date().default(() => new Date('2025-06-15'));
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual(new Date('2025-06-15'));
    });
});

describe('.default() — array', () => {
    test('substitutes default when input is undefined', () => {
        const schema = array(string()).default(() => ['a', 'b']);
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual(['a', 'b']);
    });

    test('passes through non-undefined values', () => {
        const schema = array(string()).default(() => []);
        const result = schema.validate(['hello']);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual(['hello']);
    });
});

describe('.default() — object', () => {
    test('substitutes default when input is undefined', () => {
        const schema = object({ name: string() }).default({
            name: 'default'
        });
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ name: 'default' });
    });
});

describe('.default() — union', () => {
    test('substitutes default when input is undefined', () => {
        const schema = union(string()).or(number()).default('fallback');
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('fallback');
    });
});

describe('.default() — null', () => {
    test('substitutes null default when input is undefined', () => {
        const schema = nul().default(null);
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(null);
    });
});

describe('.default() — any', () => {
    test('substitutes default when input is undefined', () => {
        const schema = any().default('anything');
        const result = schema.validate(undefined);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('anything');
    });
});

describe('.default() — func', () => {
    test('substitutes default when input is undefined', () => {
        const defaultFn = () => 42;
        const schema = func().default(() => defaultFn);
        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(defaultFn);
    });
});

describe('.default() — type inference', () => {
    test('InferType removes | undefined for .default()', () => {
        const schema = string().default('x');
        expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<string>();
    });

    test('InferType removes | undefined for .optional().default()', () => {
        const schema = string().optional().default('x');
        expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<string>();
    });

    test('InferType of number with default is number', () => {
        const schema = number().default(0);
        expectTypeOf<InferType<typeof schema>>().toEqualTypeOf<number>();
    });
});

describe('.default() — introspect', () => {
    test('introspect includes defaultValue', () => {
        const schema = string().default('test');
        const intro = schema.introspect();
        expect(intro.defaultValue).toBe('test');
    });

    test('introspect shows no default by default', () => {
        const schema = string();
        const intro = schema.introspect();
        expect(intro.defaultValue).toBeUndefined();
    });

    test('hasDefault getter reflects default state', () => {
        const withDefault = string().default('test');
        expect(withDefault.introspect().defaultValue !== undefined).toBe(true);

        const withoutDefault = string();
        expect(withoutDefault.introspect().defaultValue !== undefined).toBe(
            false
        );
    });
});

describe('.default() — parse and safeParse', () => {
    test('parse returns default value for undefined input', () => {
        const schema = string().default('parsed');
        expect(schema.parse(undefined as any)).toBe('parsed');
    });

    test('safeParse returns default value for undefined input', () => {
        const schema = string().default('safe');
        const result = schema.safeParse(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('safe');
    });
});

describe('.default() — not required in input, present in output', () => {
    test('property is not required in input, but default is applied in output', () => {
        const schema = object({
            firstName: string().optional().default('John'),
            lastName: string()
        });
        type SchemaType = InferType<typeof schema>;
        expectTypeOf<SchemaType>().toEqualTypeOf<{
            firstName: string;
            lastName: string;
        }>();

        type ParameterType = Parameters<typeof schema.validate>[0];
        expectTypeOf<ParameterType>().toEqualTypeOf<{
            firstName?: string;
            lastName: string;
        }>();
    });
});
