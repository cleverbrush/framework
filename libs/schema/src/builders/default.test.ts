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
        expect(withDefault.introspect().hasDefault).toBe(true);

        const withoutDefault = string();
        expect(withoutDefault.introspect().hasDefault).toBe(false);
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
    test('property with default is optional in input, required in output', () => {
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

// ---------------------------------------------------------------------------
// Comprehensive validate / validateAsync type tests
// ---------------------------------------------------------------------------

describe('.default() — validate() input & output types', () => {
    test('object with multiple defaults: input makes defaulted props optional', () => {
        const schema = object({
            name: string(),
            role: string().default('user'),
            active: boolean().default(true)
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            name: string;
            role?: string;
            active?: boolean;
        }>();

        type Output = InferType<typeof schema>;
        expectTypeOf<Output>().toEqualTypeOf<{
            name: string;
            role: string;
            active: boolean;
        }>();

        const result = schema.validate({ name: 'Alice' });
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({
            name: 'Alice',
            role: 'user',
            active: true
        });

        const result2 = schema.validate({
            name: 'Bob',
            role: 'admin',
            active: false
        });
        expect(result2.valid).toBe(true);
        expect(result2.object).toEqual({
            name: 'Bob',
            role: 'admin',
            active: false
        });
    });

    test('validate() result.object matches output type', () => {
        const schema = object({
            title: string(),
            count: number().default(0)
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            title: string;
            count?: number;
        }>();

        const result = schema.validate({ title: 'test' });
        if (result.valid) {
            expectTypeOf(result.object).toEqualTypeOf<
                | {
                      title: string;
                      count: number;
                  }
                | undefined
            >();
        }
    });

    test('validateAsync() input & output types match validate()', async () => {
        const schema = object({
            email: string(),
            verified: boolean().default(false)
        });

        type SyncInput = Parameters<typeof schema.validate>[0];
        type AsyncInput = Parameters<typeof schema.validateAsync>[0];
        expectTypeOf<AsyncInput>().toEqualTypeOf<SyncInput>();

        const result = await schema.validateAsync({ email: 'a@b.com' });
        if (result.valid) {
            expectTypeOf(result.object).toEqualTypeOf<
                | {
                      email: string;
                      verified: boolean;
                  }
                | undefined
            >();
        }
    });

    test('all properties optional when all have defaults', () => {
        const schema = object({
            host: string().default('localhost'),
            port: number().default(3000)
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            host?: string;
            port?: number;
        }>();

        type Output = InferType<typeof schema>;
        expectTypeOf<Output>().toEqualTypeOf<{
            host: string;
            port: number;
        }>();

        const result = schema.validate({});
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ host: 'localhost', port: 3000 });

        const result2 = schema.validate({ host: '0.0.0.0' });
        expect(result2.valid).toBe(true);
        expect(result2.object).toEqual({ host: '0.0.0.0', port: 3000 });
    });

    test('no properties optional when none have defaults', () => {
        const schema = object({
            a: string(),
            b: number()
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            a: string;
            b: number;
        }>();

        type Output = InferType<typeof schema>;
        expectTypeOf<Output>().toEqualTypeOf<{
            a: string;
            b: number;
        }>();

        const result = schema.validate({ a: 'x', b: 1 });
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ a: 'x', b: 1 });
    });

    test('optional() without default keeps property optional in both input and output', () => {
        const schema = object({
            required: string(),
            optional: string().optional()
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            required: string;
            optional?: string | undefined;
        }>();

        type Output = InferType<typeof schema>;
        expectTypeOf<Output>().toEqualTypeOf<{
            required: string;
            optional?: string | undefined;
        }>();

        const result = schema.validate({ required: 'yes' });
        expect(result.valid).toBe(true);

        const result2 = schema.validate({ required: 'yes', optional: 'also' });
        expect(result2.valid).toBe(true);
        expect(result2.object).toEqual({ required: 'yes', optional: 'also' });
    });

    test('optional().default() makes input optional but output required', () => {
        const schema = object({
            required: string(),
            withDefault: string().optional().default('hi')
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            required: string;
            withDefault?: string;
        }>();

        type Output = InferType<typeof schema>;
        expectTypeOf<Output>().toEqualTypeOf<{
            required: string;
            withDefault: string;
        }>();

        const result = schema.validate({ required: 'yes' });
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ required: 'yes', withDefault: 'hi' });

        const result2 = schema.validate({
            required: 'yes',
            withDefault: 'custom'
        });
        expect(result2.valid).toBe(true);
        expect(result2.object).toEqual({
            required: 'yes',
            withDefault: 'custom'
        });
    });

    test('mixed: required, optional, default, optional+default', () => {
        const schema = object({
            id: number(),
            name: string().optional(),
            role: string().default('viewer'),
            nickname: string().optional().default('anon')
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            id: number;
            name?: string | undefined;
            role?: string;
            nickname?: string;
        }>();

        type Output = InferType<typeof schema>;
        expectTypeOf<Output>().toEqualTypeOf<{
            id: number;
            name?: string | undefined;
            role: string;
            nickname: string;
        }>();

        const result = schema.validate({ id: 1 });
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({
            id: 1,
            role: 'viewer',
            nickname: 'anon'
        });

        const result2 = schema.validate({
            id: 2,
            name: 'Jo',
            role: 'admin',
            nickname: 'jojo'
        });
        expect(result2.valid).toBe(true);
        expect(result2.object).toEqual({
            id: 2,
            name: 'Jo',
            role: 'admin',
            nickname: 'jojo'
        });
    });
});

describe('.default() — nested object types', () => {
    test('nested object with defaults at inner level — output collapses defaults', () => {
        const schema = object({
            user: object({
                name: string(),
                age: number().optional().default(0)
            })
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            user: {
                name: string;
                age: number;
            };
        }>();

        type Output = InferType<typeof schema>;
        expectTypeOf<Output>().toEqualTypeOf<{
            user: {
                name: string;
                age: number;
            };
        }>();

        const result = schema.validate({ user: { name: 'Alice' } } as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ user: { name: 'Alice', age: 0 } });

        const result2 = schema.validate({ user: { name: 'Bob', age: 25 } });
        expect(result2.valid).toBe(true);
        expect(result2.object).toEqual({ user: { name: 'Bob', age: 25 } });
    });

    test('nested object with defaults at outer level', () => {
        const schema = object({
            config: object({
                debug: boolean()
            }).default({ debug: false })
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            config?: { debug: boolean };
        }>();

        type Output = InferType<typeof schema>;
        expectTypeOf<Output>().toEqualTypeOf<{
            config: { debug: boolean };
        }>();

        const result = schema.validate({});
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ config: { debug: false } });

        const result2 = schema.validate({ config: { debug: true } });
        expect(result2.valid).toBe(true);
        expect(result2.object).toEqual({ config: { debug: true } });
    });
});

describe('.default() — non-object schema validate types unchanged', () => {
    test('string().default() — validate still accepts string', () => {
        const schema = string().default('x');
        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<string>();

        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe('x');

        const result2 = schema.validate('y');
        expect(result2.valid).toBe(true);
        expect(result2.object).toBe('y');
    });

    test('number().default() — validate still accepts number', () => {
        const schema = number().default(0);
        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<number>();

        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(0);

        const result2 = schema.validate(99);
        expect(result2.valid).toBe(true);
        expect(result2.object).toBe(99);
    });

    test('boolean().default() — validate still accepts boolean', () => {
        const schema = boolean().default(false);
        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<boolean>();

        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(false);

        const result2 = schema.validate(true);
        expect(result2.valid).toBe(true);
        expect(result2.object).toBe(true);
    });

    test('date().default() — validate still accepts Date', () => {
        const fallback = new Date('2025-01-01');
        const schema = date().default(fallback);
        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<Date>();

        const result = schema.validate(undefined as any);
        expect(result.valid).toBe(true);
        expect(result.object).toEqual(fallback);

        const other = new Date('2026-06-01');
        const result2 = schema.validate(other);
        expect(result2.valid).toBe(true);
        expect(result2.object).toEqual(other);
    });

    test('string without default — validate accepts string', () => {
        const schema = string();
        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<string>();

        const result = schema.validate('hello');
        expect(result.valid).toBe(true);
        expect(result.object).toBe('hello');
    });

    test('number without default — validate accepts number', () => {
        const schema = number();
        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<number>();

        const result = schema.validate(42);
        expect(result.valid).toBe(true);
        expect(result.object).toBe(42);
    });
});

describe('.default() — validate runtime with correct types', () => {
    test('object validate accepts partial input when defaults exist', () => {
        const schema = object({
            greeting: string().default('hello'),
            name: string()
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            greeting?: string;
            name: string;
        }>();

        // Should compile without error — greeting is optional in input
        const result = schema.validate({ name: 'world' });
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ greeting: 'hello', name: 'world' });
    });

    test('object validateAsync accepts partial input when defaults exist', async () => {
        const schema = object({
            greeting: string().default('hello'),
            name: string()
        });

        type Input = Parameters<typeof schema.validateAsync>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            greeting?: string;
            name: string;
        }>();

        const result = await schema.validateAsync({ name: 'world' });
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ greeting: 'hello', name: 'world' });
    });

    test('object with all defaults validates empty-ish input', () => {
        const schema = object({
            x: number().default(1),
            y: number().default(2)
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            x?: number;
            y?: number;
        }>();

        const result = schema.validate({});
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ x: 1, y: 2 });
    });

    test('chaining after default preserves types', () => {
        const schema = object({
            tag: string().default('latest').minLength(1),
            count: number().default(10).min(0)
        });

        type Input = Parameters<typeof schema.validate>[0];
        expectTypeOf<Input>().toEqualTypeOf<{
            tag?: string;
            count?: number;
        }>();

        const result = schema.validate({});
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ tag: 'latest', count: 10 });
    });
});
