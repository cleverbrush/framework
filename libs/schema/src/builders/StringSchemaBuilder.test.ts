import { InferType } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';

test('Clean', () => {
    const builder = string();
    const schema = builder.introspect();
    expect(schema.type).toEqual('string');
    expect(schema.equalsTo).toBeUndefined();
    expect(schema.isRequired).toEqual(true);
    expect(schema.maxLength).toBeUndefined();
    expect(schema.minLength).toBeUndefined();
});

test('Trivial - 1', async () => {
    const schema = string();

    {
        const {
            object: result,
            errors,
            valid
        } = await schema.validate('some str');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('some str');
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema.validate(1123 as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema.validate(null as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema.validate(undefined as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }
});

test('optional', () => {
    const builder1 = string();
    const builder2 = builder1.optional();

    expect(builder1 === (builder2 as any)).toEqual(false);

    const schema2 = builder2.introspect();

    expect(schema2.isRequired).toEqual(false);
});

test('optional - 2', () => {
    const builder1 = string().optional();
    const builder2 = builder1.required();

    expect(builder1 === (builder2 as any)).toEqual(false);

    const schema2 = builder2.introspect();
    expect(schema2.type).toEqual('string');
    expect(schema2.isRequired).toEqual(true);
});

test('optional - 3', async () => {
    const schema = string().optional();

    {
        const {
            object: result,
            errors,
            valid
        } = await schema.validate('some str');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('some str');
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema.validate(1123 as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema.validate(null as any);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(null);
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema.validate(undefined as any);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(undefined);
    }
});

test('equals - 1', async () => {
    const builder1 = string();
    const builder2 = builder1.equals('abc');

    expect(builder1 === (builder2 as any)).toEqual(false);

    const schema2 = builder2.introspect();

    expect(schema2.equalsTo).toEqual('abc');

    {
        const {
            object: result,
            errors,
            valid
        } = await builder2.validate('abc');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('abc');
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await builder2.validate('abcd' as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }
});

test('equals - 2', async () => {
    const builder1 = string().equals('abc');
    const builder2 = builder1.clearEquals();

    expect(builder1 === (builder2 as any)).toEqual(false);

    const schema2 = builder2.introspect();

    expect(schema2.equalsTo).toBeUndefined();

    {
        const {
            object: result,
            errors,
            valid
        } = await builder2.validate('abc');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('abc');
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await builder2.validate('abcd' as any);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('abcd');
    }
});

test('equals - 3', () => {
    expect(() => string().equals(2342 as any)).toThrowError();
});

test('minLength - 1', async () => {
    const builder1 = string();
    const builder2 = builder1.minLength(3);

    const schema2 = builder2.introspect();

    expect(schema2.minLength).toEqual(3);

    expect(builder1 === (builder2 as any)).toEqual(false);

    {
        const {
            valid,
            object: result,
            errors
        } = await builder2.validate('some string');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('some string');
    }

    {
        const { valid, object: result, errors } = await builder2.validate('no');
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }

    {
        const {
            valid,
            object: result,
            errors
        } = await builder2.validate('yes');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('yes');
    }
});

test('minLength - 2', async () => {
    const schema1 = string().minLength(3);
    const schema2 = schema1.clearMinLength();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate('some string');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('some string');
    }

    {
        const { valid, object: result, errors } = await schema2.validate('no');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('no');
    }

    {
        const { valid, object: result, errors } = await schema2.validate('yes');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('yes');
    }
});

test('minLength - 3', () => {
    expect(() => string().minLength('some str' as any)).toThrowError();
});

test('maxLength - 1', async () => {
    const builder1 = string();
    const builder2 = builder1.maxLength(3);

    const schema2 = builder2.introspect();

    expect(schema2.maxLength).toEqual(3);

    expect(builder1 === (builder2 as any)).toEqual(false);

    {
        const {
            valid,
            object: result,
            errors
        } = await builder2.validate('some string');
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }

    {
        const { valid, object: result, errors } = await builder2.validate('no');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('no');
    }

    {
        const {
            valid,
            object: result,
            errors
        } = await builder2.validate('yes');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('yes');
    }
});

test('maxLength - 2', async () => {
    const schema1 = string().maxLength(3);
    const schema2 = schema1.clearMaxLength();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate('some string');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('some string');
    }

    {
        const { valid, object: result, errors } = await schema2.validate('no');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('no');
    }

    {
        const { valid, object: result, errors } = await schema2.validate('yes');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual('yes');
    }
});

test('maxLength - 3', () => {
    expect(() => string().maxLength('some str' as any)).toThrowError();
});

test('hasType - 1', () => {
    const schema1 = string();
    const schema2 = schema1.hasType<Date>();
    const schema3 = schema2.clearHasType();

    const typeSchema1: InferType<typeof schema1> = null as any;
    const typeSchema2: InferType<typeof schema2> = null as any;
    const typeSchema3: InferType<typeof schema3> = null as any;

    expectTypeOf(typeSchema1).toBeString();
    expectTypeOf(typeSchema2).toEqualTypeOf<Date>();
    expectTypeOf(typeSchema3).toBeString();
});

test('startsWith - 1', async () => {
    {
        const schema1 = string();
        const schema2 = schema1.startsWith('abc');
        expect((schema1 as any) === schema2).toEqual(false);
    }

    {
        const schema1 = string();
        const schema2 = schema1.clearStartsWith();
        expect((schema1 as any) === schema2).toEqual(false);
    }

    {
        expect(() => string().startsWith(123 as any)).toThrowError();
    }

    {
        const schema = string().startsWith('abc');
        const { valid, errors, object } = await schema.validate('abc');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual('abc');
    }

    {
        const schema = string().startsWith('abc');
        const { valid, errors, object } = await schema.validate('abcdefg');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual('abcdefg');
    }

    {
        const schema = string().startsWith('abc');
        const { valid, errors, object } = await schema.validate('invalid');
        expect(valid).toEqual(false);
        expect(errors).toBeDefined();
        expect(object).toBeUndefined();
    }

    {
        const schema = string().startsWith('abc').clearStartsWith();
        const { valid, errors, object } = await schema.validate('valid');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual('valid');
    }
});

test('endsWith - 1', async () => {
    {
        const schema1 = string();
        const schema2 = schema1.endsWith('abc');
        expect((schema1 as any) === schema2).toEqual(false);
    }

    {
        const schema1 = string();
        const schema2 = schema1.clearEndsWith();
        expect((schema1 as any) === schema2).toEqual(false);
    }

    {
        expect(() => string().endsWith(123 as any)).toThrowError();
    }

    {
        const schema = string().endsWith('abc');
        const { valid, errors, object } = await schema.validate('abc');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual('abc');
    }

    {
        const schema = string().endsWith('abc');
        const { valid, errors, object } = await schema.validate('defgabc');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual('defgabc');
    }

    {
        const schema = string().endsWith('abc');
        const { valid, errors, object } = await schema.validate('invalid');
        expect(valid).toEqual(false);
        expect(errors).toBeDefined();
        expect(object).toBeUndefined();
    }

    {
        const schema = string().endsWith('abc').clearEndsWith();
        const { valid, errors, object } = await schema.validate('valid');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual('valid');
    }
});

test('matches - 1', async () => {
    {
        const schema1 = string();
        const schema2 = schema1.matches(/abc/);
        expect((schema1 as any) === schema2).toEqual(false);
    }

    {
        const schema1 = string();
        const schema2 = schema1.clearMatches();
        expect((schema1 as any) === schema2).toEqual(false);
    }

    {
        expect(() => string().matches(123 as any)).toThrowError();
    }

    {
        const schema = string().matches(/^abc\d+/);
        const { valid, errors, object } = await schema.validate('abc123');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual('abc123');
    }

    {
        const schema = string().matches(/^abc\d+/);
        const { valid, errors, object } = await schema.validate('abcdefg');
        expect(valid).toEqual(false);
        expect(errors).toBeDefined();
        expect(object).toBeUndefined();
    }

    {
        const schema = string()
            .matches(/^abc\d+/)
            .clearMatches();
        const { valid, errors, object } = await schema.validate('abcdefg');
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual('abcdefg');
    }
});
