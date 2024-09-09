import { array } from './ArraySchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';
import { InferType } from './SchemaBuilder.js';

test('Types - 1', async () => {
    const schema1 = array();
    const schema2 = schema1.of(number());
    const schema3 = schema2.of(string());
    const schema4 = schema3.clearOf();
    const schema5 = schema4.hasType<Date>();
    const schema6 = schema5.clearHasType();

    const val1: InferType<typeof schema1> = [];
    const val2: InferType<typeof schema2> = [];
    const val3: InferType<typeof schema3> = [];
    const val4: InferType<typeof schema4> = [];
    const val5: InferType<typeof schema5> = new Date();
    const val6: InferType<typeof schema6> = [];

    expectTypeOf(val1).toMatchTypeOf<Array<any>>();
    expectTypeOf(val2).toMatchTypeOf<Array<number>>();
    expectTypeOf(val3).toMatchTypeOf<Array<string>>();
    expectTypeOf(val4).toMatchTypeOf<Array<any>>();
    expectTypeOf(val5).toMatchTypeOf<Date>();
    expectTypeOf(val6).toMatchTypeOf<Array<any>>();

    {
        const { object: res } = await schema1.validate([]);
        if (res) {
            expectTypeOf(res).toMatchTypeOf<Array<any>>();
        }
    }
    {
        const { object: res } = await schema2.validate([]);
        if (res) {
            expectTypeOf(res).toMatchTypeOf<Array<number>>();
        }
    }
    {
        const { object: res } = await schema3.validate([]);
        if (res) {
            expectTypeOf(res).toMatchTypeOf<Array<string>>();
        }
    }
    {
        const { object: res } = await schema4.validate([]);
        if (res) {
            expectTypeOf(res).toMatchTypeOf<Array<any>>();
        }
    }

    const optionalSchema1 = schema1.optional();
    const optionalSchema2 = optionalSchema1.of(number());
    const optionalSchema3 = optionalSchema2.of(string());
    const optionalSchema4 = optionalSchema3.clearOf();

    const requiredSchema = optionalSchema4.required();

    expect(requiredSchema === (optionalSchema4 as any)).toEqual(false);

    const optionalVal1: InferType<typeof optionalSchema1> = [];
    const optionalVal2: InferType<typeof optionalSchema2> = [];
    const optionalVal3: InferType<typeof optionalSchema3> = [];
    const optionalVal4: InferType<typeof optionalSchema4> = [];

    expectTypeOf(optionalVal1).toMatchTypeOf<Array<any> | undefined>();
    expectTypeOf(optionalVal2).toMatchTypeOf<Array<number> | undefined>();
    expectTypeOf(optionalVal3).toMatchTypeOf<Array<string> | undefined>();
    expectTypeOf(optionalVal4).toMatchTypeOf<Array<any> | undefined>();

    const arrayOfUnionSchema = array().of(
        union(number().equals(1)).or(string().equals('2'))
    );

    const arrayOfUnionVal: InferType<typeof arrayOfUnionSchema> = [];

    expectTypeOf(arrayOfUnionVal).toMatchTypeOf<(1 | '2')[]>();
    {
        const { object: res } = await arrayOfUnionSchema.validate([]);
        if (res) {
            expectTypeOf(res).toMatchTypeOf<(1 | '2')[]>();
        }
    }
});

test('Clean', async () => {
    const schema = array();

    {
        const { valid, errors, object: result } = await schema.validate([]);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual([]);
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema.validate([1, '2', { three: 3 }]);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual([1, '2', { three: 3 }]);
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema.validate('some string' as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema.validate(null as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema.validate(undefined as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }
});

test('Optional', async () => {
    const schema1 = array();
    const schema2 = schema1.optional();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const { valid, errors, object: result } = await schema2.validate([]);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual([]);
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema2.validate([1, '2', { three: 3 }]);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual([1, '2', { three: 3 }]);
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema2.validate('some string' as any);
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
        expect(result).toBeUndefined();
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema2.validate(null as any);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(null);
    }

    {
        const {
            valid,
            errors,
            object: result
        } = await schema2.validate(undefined as any);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(result).toEqual(undefined);
    }
});

test('Min Length - 1', async () => {
    const schema1 = array();
    const schema2 = schema1.minLength(3);

    expect(() => (schema1 as any).minLength()).toThrowError();
    expect(() => schema1.minLength(-1)).toThrowError();
    expect(() => schema1.minLength(undefined as any)).toThrowError();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2, 3]);
        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2, 3]);
        expect(errors).toBeUndefined();
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2, 3, 4]);
        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2, 3, 4]);
        expect(errors).toBeUndefined();
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2]);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Min Length - 2', async () => {
    const schema1 = array().minLength(3);
    const schema2 = schema1.clearMinLength();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2, 3]);
        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2, 3]);
        expect(errors).toBeUndefined();
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2, 3, 4]);
        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2, 3, 4]);
        expect(errors).toBeUndefined();
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2]);
        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2]);
        expect(errors).toBeUndefined();
    }
});

test('Max Length - 1', async () => {
    const schema1 = array();
    const schema2 = schema1.maxLength(3);

    expect(() => (schema1 as any).maxLength()).toThrowError();
    expect(() => schema1.maxLength(-1)).toThrowError();
    expect(() => schema1.maxLength(undefined as any)).toThrowError();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2, 3]);
        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2, 3]);
        expect(errors).toBeUndefined();
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2, 3, 4]);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2]);
        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2]);
        expect(errors).toBeUndefined();
    }
});

test('Max Length - 2', async () => {
    const schema1 = array().maxLength(3);
    const schema2 = schema1.clearMaxLength();

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2, 3]);
        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2, 3]);
        expect(errors).toBeUndefined();
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2, 3, 4]);
        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2, 3, 4]);
        expect(errors).toBeUndefined();
    }

    {
        const {
            object: result,
            errors,
            valid
        } = await schema2.validate([1, 2]);
        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2]);
        expect(errors).toBeUndefined();
    }
});

test('of - 1', async () => {
    const schema1 = array();
    const schema2 = schema1.of(
        union(number()).or(
            object({
                num: number(),
                str: string()
            })
        )
    );

    expect(schema1 === (schema2 as any)).toEqual(false);

    {
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate([1, 2, 3]);

        expect(valid).toEqual(true);
        expect(result).toEqual([1, 2, 3]);
        expect(errors).toBeUndefined();
    }

    {
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate([2, 'str', 3] as any);

        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate([
            2,
            1,
            {
                num: 234,
                str: 244
            }
        ] as any);

        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('of - 2', async () => {
    const schema = array().of(
        union(number()).or(
            object({
                num: number(),
                str: string()
            })
        )
    );

    {
        const {
            valid,
            object: result,
            errors
        } = await schema.validate(
            [
                2,
                1,
                {
                    num: 234,
                    str: 244
                }
            ] as any,
            {
                doNotStopOnFirstError: true
            }
        );

        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const {
            valid,
            object: result,
            errors
        } = await schema.validate(
            [
                2,
                1,
                {
                    num: 234,
                    str: '244'
                }
            ] as any,
            {
                doNotStopOnFirstError: true
            }
        );

        expect(valid).toEqual(true);
        expect(result).toEqual([2, 1, { num: 234, str: '244' }]);
        expect(errors).toBeUndefined();
    }
});

test('One call to set elementSchema - 1', () => {
    const schema = array(number());

    const typeCheck: InferType<typeof schema> = [1, 2, 3, 4];
    expectTypeOf(typeCheck).toMatchTypeOf<number[]>();
});

test('One call to set elementSchema - 2', () => {
    const schema = array(union(number(0)).or(number(1)).or(number(2)));

    const typeCheck: InferType<typeof schema> = [1, 2, 0];
    expectTypeOf(typeCheck).toMatchTypeOf<(0 | 1 | 2)[]>();
});
