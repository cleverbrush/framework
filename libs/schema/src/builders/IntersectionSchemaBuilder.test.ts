import { expect, expectTypeOf, test } from 'vitest';
import { intersection } from './IntersectionSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import type { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';

test('Intersection of two objects', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    );

    type T = InferType<typeof schema>;
    expectTypeOf<T>().toEqualTypeOf<{ name: string } & { age: number }>();

    const { valid, object: result } = await schema.validate({
        name: 'Alice',
        age: 30
    });
    expect(valid).toEqual(true);
    expect(result).toEqual({ name: 'Alice', age: 30 });
});

test('Intersection fails when left schema fails', async () => {
    const schema = intersection(
        object({ name: string().minLength(1) }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    );

    const { valid, errors } = await schema.validate({
        name: '',
        age: 30
    } as any);
    expect(valid).toEqual(false);
    expect(errors?.length).toBeGreaterThan(0);
});

test('Intersection fails when right schema fails', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number().min(0) }).acceptUnknownProps()
    );

    const { valid, errors } = await schema.validate({
        name: 'Alice',
        age: -1
    } as any);
    expect(valid).toEqual(false);
    expect(errors?.length).toBeGreaterThan(0);
});

test('Intersection of primitives', async () => {
    const schema = intersection(string().minLength(3), string().maxLength(10));

    type T = InferType<typeof schema>;
    expectTypeOf<T>().toEqualTypeOf<string>();

    {
        const { valid, object: result } = await schema.validate('hello');
        expect(valid).toEqual(true);
        expect(result).toEqual('hello');
    }

    {
        const { valid } = await schema.validate('ab');
        expect(valid).toEqual(false);
    }

    {
        const { valid } = await schema.validate('a'.repeat(11));
        expect(valid).toEqual(false);
    }
});

test('Intersection with optional', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number().optional() }).acceptUnknownProps()
    ).optional();

    type T = InferType<typeof schema>;
    expectTypeOf<T>().toEqualTypeOf<
        ({ name: string } & { age?: number }) | undefined
    >();

    {
        const { valid, object: result } = await schema.validate(undefined);
        expect(valid).toEqual(true);
        expect(result).toBeUndefined();
    }

    {
        const { valid, object: result } = await schema.validate({
            name: 'Alice'
        });
        expect(valid).toEqual(true);
        expect(result).toEqual({ name: 'Alice' });
    }
});

test('Intersection with nullable', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    ).nullable();

    type T = InferType<typeof schema>;
    expectTypeOf<T>().toEqualTypeOf<
        ({ name: string } & { age: number }) | null
    >();

    {
        const { valid, object: result } = await schema.validate(null);
        expect(valid).toEqual(true);
        expect(result).toBeNull();
    }
});

test('Intersection with default value', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    ).default({ name: 'Default', age: 0 } as any);

    {
        const { valid, object: result } = await schema.validate(undefined);
        expect(valid).toEqual(true);
        expect(result).toEqual({ name: 'Default', age: 0 });
    }
});

test('Intersection returns merged object', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    );

    const { valid, object: result } = await schema.validate({
        name: 'Bob',
        age: 25
    });
    expect(valid).toEqual(true);
    expect(result).toEqual({ name: 'Bob', age: 25 });
});

test('Intersection with nullable', async () => {
    const schema = intersection(
        object({ name: string() }),
        object({ age: number() })
    ).nullable();

    type T = InferType<typeof schema>;
    expectTypeOf<T>().toEqualTypeOf<
        ({ name: string } & { age: number }) | null
    >();

    {
        const { valid, object: result } = await schema.validate(null);
        expect(valid).toEqual(true);
        expect(result).toBeNull();
    }
});

test('Intersection with default value', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    ).default({ name: 'Default', age: 0 } as any);

    {
        const { valid, object: result } = await schema.validate(undefined);
        expect(valid).toEqual(true);
        expect(result).toEqual({ name: 'Default', age: 0 });
    }
});

test('Intersection with catch value', async () => {
    const schema = intersection(
        object({ name: string() }),
        object({ age: number() })
    ).catch({ name: 'Fallback', age: 99 } as any);

    {
        const { valid, object: result } = await schema.validate(null as any);
        expect(valid).toEqual(true);
        expect(result).toEqual({ name: 'Fallback', age: 99 });
    }
});

test('Intersection returns merged object', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    );

    const { valid, object: result } = await schema.validate({
        name: 'Bob',
        age: 25
    });
    expect(valid).toEqual(true);
    expect(result).toEqual({ name: 'Bob', age: 25 });
});

test('Intersection handles overlapping properties', async () => {
    const schema = intersection(
        object({ value: string().minLength(1) }),
        object({ value: string().maxLength(10) })
    );

    const { valid, object: result } = await schema.validate({
        value: 'test'
    });
    expect(valid).toEqual(true);
    expect(result).toEqual({ value: 'test' });
});

test('Intersection with readonly', async () => {
    const schema = intersection(
        object({ name: string() }),
        object({ age: number() })
    ).readonly();

    type T = InferType<typeof schema>;
    expectTypeOf<T>().toEqualTypeOf<
        Readonly<{ name: string } & { age: number }>
    >();
});

test('Intersection with brand', async () => {
    const schema = intersection(
        object({ name: string() }),
        object({ age: number() })
    ).brand<'Person'>();

    type T = InferType<typeof schema>;
    expectTypeOf<T>().toEqualTypeOf<
        ({ name: string } & { age: number }) & { readonly __brand: 'Person' }
    >();
});

test('Intersection with describe', async () => {
    const schema = intersection(
        object({ name: string() }),
        object({ age: number() })
    ).describe('A person');

    expect(schema.introspect().description).toEqual('A person');
});

test('Intersection with schemaName', async () => {
    const schema = intersection(
        object({ name: string() }),
        object({ age: number() })
    ).schemaName('Person');

    expect(schema.introspect().schemaName).toEqual('Person');
});

test('Intersection with example', async () => {
    const example = { name: 'Alice', age: 30 };
    const schema = intersection(
        object({ name: string() }),
        object({ age: number() })
    ).example(example);

    expect(schema.introspect().example).toEqual(example);
});

test('Intersection with addPreprocessor', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    ).addPreprocessor((obj: any) => ({
        ...obj,
        name: (obj.name || '').toString().trim()
    }));

    const { valid, object: result } = await schema.validate({
        name: '  Alice  ',
        age: 30
    } as any);
    expect(valid).toEqual(true);
    expect(result).toEqual({ name: 'Alice', age: 30 });
});

test('Intersection with addValidator', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number().min(0) }).acceptUnknownProps()
    ).addValidator((obj: any) => {
        if (obj.name === 'Admin' && obj.age < 18) {
            return {
                valid: false,
                errors: [{ message: 'Admin must be at least 18' }]
            };
        }
        return { valid: true, errors: [] };
    });

    {
        const { valid } = await schema.validate({
            name: 'Admin',
            age: 15
        } as any);
        expect(valid).toEqual(false);
    }

    {
        const { valid } = await schema.validate({
            name: 'Admin',
            age: 25
        } as any);
        expect(valid).toEqual(true);
    }
});

test('Intersection is immutable', () => {
    const schema1 = intersection(
        object({ name: string() }),
        object({ age: number() })
    );
    const schema2 = intersection(
        object({ name: string() }),
        object({ age: number() })
    ).optional();

    expect(schema1).not.toBe(schema2);
    expect((schema1.introspect() as any).isRequired).toEqual(true);
    expect((schema2.introspect() as any).isRequired).toEqual(false);
});

test('Intersection introspection', () => {
    const leftSchema = object({ name: string() });
    const rightSchema = object({ age: number() });
    const schema = intersection(leftSchema, rightSchema);

    const info = schema.introspect();
    expect(info.type).toEqual('intersection');
    expect(info.left).toBe(leftSchema);
    expect(info.right).toBe(rightSchema);
});

test('Intersection with hasType', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    ).hasType<{ name: string; age: number }>();

    type T = InferType<typeof schema>;
    expectTypeOf<T>().toEqualTypeOf<{ name: string; age: number }>();

    const { valid, object: result } = await schema.validate({
        name: 'Alice',
        age: 30
    });
    expect(valid).toEqual(true);
    expect(result).toEqual({ name: 'Alice', age: 30 });
});

test('Intersection validateAsync', async () => {
    const schema = intersection(
        object({ name: string().minLength(1) }).acceptUnknownProps(),
        object({ age: number().min(0) }).acceptUnknownProps()
    );

    {
        const { valid, object: result } = await schema.validateAsync({
            name: 'Alice',
            age: 30
        });
        expect(valid).toEqual(true);
        expect(result).toEqual({ name: 'Alice', age: 30 });
    }

    {
        const { valid } = await schema.validateAsync({
            name: '',
            age: 30
        } as any);
        expect(valid).toEqual(false);
    }

    {
        const { valid } = await schema.validateAsync({
            name: 'Alice',
            age: -1
        } as any);
        expect(valid).toEqual(false);
    }
});

test('Intersection parse throws on invalid', () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    );

    expect(() =>
        schema.parse({ name: 'Alice', age: 'not-a-number' } as any)
    ).toThrow();
});

test('Intersection parse returns value on valid', () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    );

    const result = schema.parse({ name: 'Alice', age: 30 });
    expect(result).toEqual({ name: 'Alice', age: 30 });
});

test('Intersection safeParse', () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    );

    {
        const result = schema.safeParse({ name: 'Alice', age: 30 });
        expect(result.valid).toEqual(true);
        expect(result.object).toEqual({ name: 'Alice', age: 30 });
    }

    {
        const result = schema.safeParse({ name: 'Alice' } as any);
        expect(result.valid).toEqual(false);
    }
});

test('Intersection safeParseAsync', async () => {
    const schema = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    );

    const result = await schema.safeParseAsync({ name: 'Alice', age: 30 });
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({ name: 'Alice', age: 30 });
});

test('Intersection of intersection', async () => {
    const base = intersection(
        object({ name: string() }).acceptUnknownProps(),
        object({ age: number() }).acceptUnknownProps()
    );
    const extended = intersection(
        base,
        object({ email: string() }).acceptUnknownProps()
    );

    type T = InferType<typeof extended>;
    expectTypeOf<T>().toEqualTypeOf<
        ({ name: string } & { age: number }) & { email: string }
    >();

    const { valid, object: result } = await extended.validate({
        name: 'Alice',
        age: 30,
        email: 'alice@example.com'
    });
    expect(valid).toEqual(true);
    expect(result).toEqual({
        name: 'Alice',
        age: 30,
        email: 'alice@example.com'
    });
});

test('Intersection required method', async () => {
    const schema = intersection(
        object({ name: string() }),
        object({ age: number() })
    )
        .optional()
        .required();

    type T = InferType<typeof schema>;
    expectTypeOf<T>().toEqualTypeOf<{ name: string } & { age: number }>();

    {
        const { valid } = await schema.validate(undefined as any);
        expect(valid).toEqual(false);
    }
});

test('Intersection clearDefault', async () => {
    const withDefault = intersection(
        object({ name: string() }),
        object({ age: number() })
    ).default({ name: 'X', age: 0 } as any);

    expect((withDefault.introspect() as any).defaultValue).toBeDefined();

    const withoutDefault = withDefault.clearDefault();
    expect((withoutDefault.introspect() as any).defaultValue).toBeUndefined();
});
