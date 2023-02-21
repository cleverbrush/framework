import { expectType } from 'tsd';

import { array } from './ArraySchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';
import { InferType } from './SchemaBuilder.js';

test('Types - 1', async () => {
    const schema1 = array();
    const schema2 = schema1.setItemSchema(number());
    const schema3 = schema2.setItemSchema(string());
    const schema4 = schema3.clearItemSchema();
    const schema5 = schema4.hasType<Date>();
    const schema6 = schema5.clearHasType();

    const val1: InferType<typeof schema1> = [];
    const val2: InferType<typeof schema2> = [];
    const val3: InferType<typeof schema3> = [];
    const val4: InferType<typeof schema4> = [];
    const val5: InferType<typeof schema5> = new Date();
    const val6: InferType<typeof schema6> = [];

    expectType<Array<any>>(val1);
    expectType<Array<number>>(val2);
    expectType<Array<string>>(val3);
    expectType<Array<any>>(val4);
    expectType<Date>(val5);
    expectType<Array<any>>(val6);

    {
        const { object: res } = await schema1.validate([]);
        if (res) {
            expectType<any[]>(res);
        }
    }
    {
        const { object: res } = await schema2.validate([]);
        if (res) {
            expectType<number[]>(res);
        }
    }
    {
        const { object: res } = await schema3.validate([]);
        if (res) {
            expectType<string[]>(res);
        }
    }
    {
        const { object: res } = await schema4.validate([]);
        if (res) {
            expectType<any[]>(res);
        }
    }

    const optionalSchema1 = schema1.optional();
    const optionalSchema2 = optionalSchema1.setItemSchema(number());
    const optionalSchema3 = optionalSchema2.setItemSchema(string());
    const optionalSchema4 = optionalSchema3.clearItemSchema();

    const requiredSchema = optionalSchema4.required();

    expect(requiredSchema === (optionalSchema4 as any)).toEqual(false);

    const optionalVal1: InferType<typeof optionalSchema1> = [];
    const optionalVal2: InferType<typeof optionalSchema2> = [];
    const optionalVal3: InferType<typeof optionalSchema3> = [];
    const optionalVal4: InferType<typeof optionalSchema4> = [];

    expectType<Array<any> | undefined>(optionalVal1);
    expectType<Array<number> | undefined>(optionalVal2);
    expectType<Array<string> | undefined>(optionalVal3);
    expectType<Array<any> | undefined>(optionalVal4);

    const arrayOfUnionSchema = array().setItemSchema(
        union(number().equals(1)).or(string().equals('2'))
    );

    const arrayOfUnionVal: InferType<typeof arrayOfUnionSchema> = [];

    expectType<Array<1 | '2'>>(arrayOfUnionVal);
    {
        const { object: res } = await arrayOfUnionSchema.validate([]);
        if (res) {
            expectType<(1 | '2')[]>(res);
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

test('setItemSchema - 1', async () => {
    const schema1 = array();
    const schema2 = schema1.setItemSchema(
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

test('setItemSchema - 2', async () => {
    const schema = array().setItemSchema(
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
