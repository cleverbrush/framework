import { expect, expectTypeOf, test } from 'vitest';
import { array } from './ArraySchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import { func } from './FunctionSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { ObjectSchemaBuilder, object } from './ObjectSchemaBuilder.js';
import { PropertyValidationResult } from './PropertyValidationResult.js';
import type { InferType } from './SchemaBuilder.js';
import { SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';

test('empty - 1', async () => {
    const schema = object();

    const testObj = {};
    const { valid, object: obj } = await schema.validate(testObj);

    expect(valid).toEqual(true);
    expect(typeof obj === 'object').toEqual(true);
    expect(obj === testObj).toEqual(false);

    const typeTest: InferType<typeof schema> = {};
    expectTypeOf(typeTest).toEqualTypeOf<{}>();

    if (typeof obj !== 'undefined') {
        expectTypeOf(obj).toEqualTypeOf<{}>();
    }
});

test('empty, optional - 1', async () => {
    const schema = object().optional();

    const { valid, object: obj } = await schema.validate(null as any);

    expect(valid).toEqual(true);
    expect(obj === null).toEqual(true);
});

test('empty, optional - 2', async () => {
    const schema = object().optional();

    const { valid, object: obj } = await schema.validate(undefined as any);

    expect(valid).toEqual(true);
    expect(typeof obj === 'undefined').toEqual(true);
});

test('empty, required - 1', async () => {
    const schema = object().optional().required();

    {
        const {
            valid,
            object: obj,
            errors
        } = await schema.validate(null as any);

        expect(valid).toEqual(false);
        expect(typeof obj === 'undefined').toEqual(true);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const {
            valid,
            object: obj,
            errors
        } = await schema.validate(undefined as any);

        expect(valid).toEqual(false);
        expect(typeof obj === 'undefined').toEqual(true);
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('one prop - 1', async () => {
    const schema = object({
        /**
         * some comment
         */
        first: number()
    });

    const { valid } = await schema.validate({ first: 123 });

    expect(valid).toEqual(true);
});

test('one prop - 2', async () => {
    const schema = object({
        /**
         * some comment
         */
        first: number(),
        second: number().optional()
    });

    const {
        valid,
        object: result,
        errors
    } = await schema.validate({
        first: '123' as any
    });

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    expect(errors?.length).toBeGreaterThan(0);
    expect(errors?.[0]).toHaveProperty('message');

    const typeTest: InferType<typeof schema> = { first: 1 };
    expectTypeOf(typeTest).toEqualTypeOf<{ first: number; second?: number }>();

    if (typeof result !== 'undefined') {
        expectTypeOf(result).toEqualTypeOf<{
            first: number;
            second?: number;
        }>();

        const typeTest: InferType<typeof schema> = {} as any;

        expectTypeOf(typeTest).toEqualTypeOf<{
            first: number;
            second?: number;
        }>();
    }
});

test('one prop - 3', async () => {
    const schema = object({
        /**
         * some comment
         */
        first: number().optional()
    });

    const { valid, errors } = await schema.validate({
        first: '123' as any
    });

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    expect(errors?.length).toEqual(1);
    expect(errors?.[0]).toHaveProperty('message');
});

test('one prop - 4', async () => {
    const schema = object({
        /**
         * some comment
         */
        first: number().optional()
    });

    const obj = { first: 123 };
    const { valid, object: result, errors } = await schema.validate(obj);

    expect(valid).toEqual(true);
    expect(result !== obj).toEqual(true);
    expect(errors).not.toBeDefined();
});

test('one prop - 5', async () => {
    const schema = object({
        /**
         * some comment
         */
        first: number().optional()
    });

    const obj = {};
    const { valid, object: result, errors } = await schema.validate(obj);

    expect(valid).toEqual(true);
    expect(result !== obj).toEqual(true);
    expect(errors).not.toBeDefined();

    const typeTest: InferType<typeof schema> = { first: 1 };
    expectTypeOf(typeTest).toEqualTypeOf<{ first?: number }>();

    if (typeof result !== 'undefined') {
        expectTypeOf(result).toEqualTypeOf<{ first?: number }>();
    }
});

test('two props - 1', async () => {
    const schema = object({
        /**
         * first comment
         */
        first: number(),
        /**
         * second comment
         */
        second: number().min(10).max(100)
    });

    const val: InferType<typeof schema> = { first: 1, second: 20 };
    expectTypeOf(val).toEqualTypeOf<{ first: number; second: number }>();

    const { valid, object: result } = await schema.validate(val);

    expect(valid).toEqual(true);
    if (typeof result !== 'undefined') {
        expectTypeOf(result).toEqualTypeOf<{ first: number; second: number }>();
    }
});

test('two props - 2', async () => {
    const schema = object({
        /**
         * first comment
         */
        first: number(),
        /**
         * second comment
         */
        second: number().min(10).max(100).optional()
    });

    const introspected = schema.introspect();

    expect(introspected.properties).toHaveProperty('first');
    expect(introspected.properties).toHaveProperty('second');

    const val: InferType<typeof schema> = { first: 1 };
    expectTypeOf(val).toEqualTypeOf<{ first: number; second?: number }>();

    const { valid, object: result } = await schema.validate(val);

    expect(valid).toEqual(true);
    if (typeof result !== 'undefined') {
        expectTypeOf(result).toEqualTypeOf<{
            first: number;
            second?: number;
        }>();
    }
});

test('Immutable Optional - 1', () => {
    const schema1 = object();
    const schema2 = schema1.optional();
    const k = (schema1 as any) === (schema2 as any);
    expect(k).toEqual(false);
});

test('Immutable Add Props - 2', () => {
    const schema1 = object().addProps({
        first: number()
    });

    const schema2 = schema1.optional();

    const introspected1 = schema1.introspect();
    const introspected2 = schema2.introspect();

    expect(introspected1.properties).toHaveProperty('first');
    expect(introspected1.isRequired).toEqual(true);
    expect(introspected2.properties).toHaveProperty('first');
    expect(introspected2.isRequired).toEqual(false);
    expect(introspected2.properties.first.introspect().isRequired).toEqual(
        true
    );

    const k = (schema1 as any) === (schema2 as any);
    expect(k).toEqual(false);
});

test('addProps - 1', async () => {
    const schema1 = object({
        first: number()
    });

    const schemaAddFrom = object({
        third: number().optional(),
        fourth: number()
    });

    const schema2 = schema1.addProps(schemaAddFrom);

    expect((schema1 as any) !== schema2).toEqual(true);

    const typeCheck1: InferType<typeof schema1> = null as any;
    const typeCheck2: InferType<typeof schema2> = null as any;

    expectTypeOf(typeCheck1).toEqualTypeOf<{ first: number }>();
    expectTypeOf(typeCheck2).toEqualTypeOf<{
        first: number;
        third?: number;
        fourth: number;
    }>();
});

test('addProps - 2', async () => {
    const schema1 = object({
        first: number()
    });

    const schemaAddFrom = {
        third: number(),
        fourth: number()
    };

    const schema2 = schema1.addProps(schemaAddFrom);

    expect((schema1 as any) !== schema2).toEqual(true);

    const typeCheck1: InferType<typeof schema1> = null as any;
    const typeCheck2: InferType<typeof schema2> = null as any;

    expectTypeOf(typeCheck1).toEqualTypeOf<{ first: number }>();
    expectTypeOf(typeCheck2).toEqualTypeOf<{
        first: number;
        third: number;
        fourth: number;
    }>();
});

test('addProps - 3', async () => {
    const schema1 = object({
        first: number()
    });

    expect(() => {
        (schema1 as any).addProps();
    }).toThrow();

    expect(() => {
        (schema1 as any).addProps(null);
    }).toThrow();

    expect(() => {
        schema1.addProps({
            first: string()
        });
    }).toThrow();

    expect(() => {
        schema1.addProps({
            second: 'not SchemaBuilder'
        } as any);
    }).toThrow();
});

test('addProps - nested Optional', async () => {
    const schema = object({
        first: number(),
        toOmit: string()
    })
        .addProps({
            second: object({
                third: number().optional()
            })
                .optional()
                .addProp('fourth', number())
                .addProps({
                    fifth: string()
                })
        })
        .omit('toOmit');
    const objToValidate: InferType<typeof schema> = null as any;

    expectTypeOf(objToValidate).toEqualTypeOf<{
        first: number;
        second?: {
            third?: number;
            fourth: number;
            fifth: string;
        };
    }>();
});

test('nested object - 1', async () => {
    const schema = object({
        nested: object({
            num: number().min(5)
        })
    });

    const objToValidate = {
        nested: {
            num: 6
        }
    };

    const {
        valid,
        errors,
        object: resultObj
    } = await schema.validate(objToValidate);

    const typeCheck: InferType<typeof schema> = {} as any;
    expectTypeOf(typeCheck).toEqualTypeOf<{ nested: { num: number } }>();

    if (typeof resultObj !== 'undefined') {
        expectTypeOf(resultObj).toEqualTypeOf<{ nested: { num: number } }>();
    }

    expect(valid).toEqual(true);
    expect(errors).toBeUndefined();
    expect(objToValidate === resultObj).toEqual(false);
    expect(objToValidate.nested === resultObj?.nested).toEqual(false);
    expect(objToValidate).toEqual(resultObj);
});

test('nested object - 2', async () => {
    const schema = object({
        nested: object({
            num: number().min(5)
        })
    });

    const objToValidate = {
        nested: {
            num: 1
        }
    };

    const {
        valid,
        errors,
        object: resultObj
    } = await schema.validate(objToValidate);

    const typeCheck: InferType<typeof schema> = {} as any;
    expectTypeOf(typeCheck).toEqualTypeOf<{ nested: { num: number } }>();

    if (typeof resultObj !== 'undefined') {
        expectTypeOf(resultObj).toEqualTypeOf<{ nested: { num: number } }>();
    }

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    expect(resultObj).toBeUndefined();
    if (Array.isArray(errors)) {
        expect(errors[0]).toHaveProperty('message');
    }
});

test('no unknown fields - 1', async () => {
    const schema = object({
        first: number()
    });

    const objToCheck = {
        first: 10,
        second: 20
    } as any;

    const {
        valid,
        errors,
        getErrorsFor,
        object: objResult
    } = await schema.validate(objToCheck);

    const spec = schema.introspect();

    expect(spec.acceptUnknownProps).toEqual(false);

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    if (Array.isArray(errors)) {
        expect(errors[0].message).toContain('unknown property');
    }
    expect(objResult).toBeUndefined();

    const rootErrors = getErrorsFor(t => t);

    expect(Array.isArray(rootErrors.errors)).toEqual(true);
    expect(rootErrors.errors.length).toEqual(1);
});

test('no unknown fields - 2', async () => {
    const schema1 = object({
        first: number()
    });

    const schema2 = schema1.acceptUnknownProps();

    const objToCheck = {
        first: 10,
        second: 20
    } as any;

    const {
        valid,
        errors,
        object: objResult
    } = await schema2.validate(objToCheck);
    const spec = schema2.introspect();
    expect(schema1 === schema2).toEqual(false);
    expect(spec.acceptUnknownProps).toEqual(true);
    expect(valid).toEqual(true);

    expect(errors).toBeUndefined();
    expect(objResult).toEqual({ first: 10, second: 20 });
});

test('no unknown fields - 3', async () => {
    const schema1 = object({
        first: number()
    }).acceptUnknownProps();

    const schema2 = schema1.notAcceptUnknownProps();

    const objToCheck = {
        first: 10,
        second: 20
    } as any;

    const {
        valid,
        errors,
        object: objResult
    } = await schema2.validate(objToCheck);

    const spec = schema2.introspect();

    expect(spec.acceptUnknownProps).toEqual(false);

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    if (Array.isArray(errors)) {
        expect(errors[0].message).toContain('unknown property');
    }
    expect(objResult).toBeUndefined();
});

test('no unknown fields - 4', async () => {
    const schema = object({
        first: number(),
        nested: object({
            second: number()
        })
    });

    const objToCheck = {
        first: 10,
        nested: {
            second: 20,
            unknown: true
        }
    } as any;

    const {
        valid,
        errors,
        object: objResult
    } = await schema.validate(objToCheck);

    const spec = schema.introspect();

    expect(spec.acceptUnknownProps).toEqual(false);

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    if (Array.isArray(errors)) {
        expect(errors[0].message).toContain('unknown property');
    }
    expect(objResult).toBeUndefined();
});
test('no unknown fields - 5', () => {
    // Build a User schema with name (required string) and age (number)
    const User = object({});

    const result = User.validate({ name: 'Alice', age: 30 });
    expect(result.valid).toEqual(false);
});

test('multiple errors - 1', async () => {
    const schema = object({
        first: number().max(10),
        second: number().min(10)
    });

    const objToValidate = {
        first: 20,
        second: 5
    };

    const { valid, errors } = await schema.validate(objToValidate, {
        doNotStopOnFirstError: true
    });

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    expect(errors?.length).toEqual(2);
});

test('multiple errors - 2', async () => {
    const schema = object({
        first: number().max(10),
        second: number().min(10),
        nested: object({
            third: number()
        })
    });

    const objToValidate = {
        first: 20,
        nested: {
            third: 33,
            unk: false
        }
    };

    const {
        valid,
        errors,
        object: objResult
    } = await schema.validate(objToValidate as any, {
        doNotStopOnFirstError: true
    });

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    expect(errors?.length).toEqual(3);
    expect(objResult).toBeUndefined();
});

test('multiple errors - 3', async () => {
    const schema = object({
        first: number().max(10),
        second: number().min(10),
        nested: object({
            third: number()
        })
    });

    const objToValidate = {
        first: 20,
        nested: {
            third: 33,
            unk: false
        }
    };

    const {
        valid,
        errors,
        object: objResult
    } = await schema.validate(objToValidate as any);

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    expect(errors?.length).toEqual(1);
    expect(objResult).toBeUndefined();
});

test('omit - 1', async () => {
    const schema1 = object().addProps({
        first: number(),
        second: number()
    });

    const schema2 = schema1.omit('second');

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect((spec1 as any) !== spec2).toEqual(true);
    expect(spec1.properties).toHaveProperty('first');
    expect(spec1.properties).toHaveProperty('second');
    expect(spec2.properties).toHaveProperty('first');
    expect(spec2.properties).not.toHaveProperty('second');

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ first: number }>();

    const { valid, object: obj } = await schema2.validate({ first: 10 });

    expect(valid).toEqual(true);
    if (obj) {
        expectTypeOf(obj).toEqualTypeOf<{ first: number }>();
    }
});

test('omit - 2', async () => {
    const schema1 = object({
        first: number(),
        second: number(),
        third: number()
    });

    const schema2 = object({
        second: number(),
        third: number()
    });

    const schema3 = schema1.omit(['second', 'third']);

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();
    const spec3 = schema3.introspect();

    expect(spec1.properties).toHaveProperty('first');
    expect(spec1.properties).toHaveProperty('second');
    expect(spec1.properties).toHaveProperty('third');
    expect(spec2.properties).not.toHaveProperty('first');
    expect(spec2.properties).toHaveProperty('second');
    expect(spec2.properties).toHaveProperty('third');
    expect(spec3.properties).toHaveProperty('first');
    expect(spec3.properties).not.toHaveProperty('second');
    expect(spec3.properties).not.toHaveProperty('third');

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;
    const typeTest3: InferType<typeof schema3> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{
        first: number;
        second: number;
        third: number;
    }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ second: number; third: number }>();
    expectTypeOf(typeTest3).toEqualTypeOf<{ first: number }>();

    const { valid, object: obj } = await schema3.validate({ first: 20 });

    expect(valid).toEqual(true);
    expect(obj).toHaveProperty('first', 20);
    if (obj) {
        expectTypeOf(obj).toEqualTypeOf<{ first: number }>();
    }
});

test('omit - 3', async () => {
    const schema1 = object({
        first: number(),
        second: number(),
        third: number()
    });

    const schema2 = object({
        second: number(),
        third: number()
    });

    const schema3 = schema1.omit(schema2);

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();
    const spec3 = schema3.introspect();

    expect(spec1.properties).toHaveProperty('first');
    expect(spec1.properties).toHaveProperty('second');
    expect(spec1.properties).toHaveProperty('third');
    expect(spec2.properties).not.toHaveProperty('first');
    expect(spec2.properties).toHaveProperty('second');
    expect(spec2.properties).toHaveProperty('third');
    expect(spec3.properties).toHaveProperty('first');
    expect(spec3.properties).not.toHaveProperty('second');
    expect(spec3.properties).not.toHaveProperty('third');

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;
    const typeTest3: InferType<typeof schema3> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{
        first: number;
        second: number;
        third: number;
    }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ second: number; third: number }>();
    expectTypeOf(typeTest3).toEqualTypeOf<{ first: number }>();

    const { valid, object: obj } = await schema3.validate({ first: 20 });

    expect(valid).toEqual(true);
    expect(obj).toHaveProperty('first', 20);
    if (obj) {
        expectTypeOf(obj).toEqualTypeOf<{ first: number }>();
    }
});

test('omit - 4', async () => {
    const schema1 = object({
        first: number(),
        second: number(),
        third: number()
    });

    expect(() => {
        (schema1 as any).omit();
    }).toThrow();

    expect(() => {
        schema1.omit('');
    }).toThrow();

    expect(() => {
        schema1.omit([]);
    }).toThrow();

    expect(() => {
        schema1.omit([1 as any]);
    }).toThrow();

    expect(() => {
        schema1.omit(['first', 'fff']);
    }).toThrow();
});

test('Preprocessors - 1', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    });

    const schema2 = schema1.addPreprocessor(input => ({
        ...input,
        second: input?.second > 10 ? 10 : input.second
    }));

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect((spec1 as any) !== spec2).toEqual(true);
    expect(spec1.preprocessors.length).toEqual(0);
    expect(spec2.preprocessors.length).toEqual(1);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ first: number; second: number }>();

    const { object: obj, valid } = await schema2.validate({
        first: 10,
        second: 20
    });

    expect(valid).toEqual(true);
    expect(obj).toHaveProperty('second', 10);
});

test('Preprocessors - 2', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    });

    const schema2 = schema1.addPreprocessor(() => {
        throw new Error('some error msg');
    });

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect((spec1 as any) !== spec2).toEqual(true);
    expect(spec1.preprocessors.length).toEqual(0);
    expect(spec2.preprocessors.length).toEqual(1);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ first: number; second: number }>();

    const {
        object: obj,
        valid,
        errors
    } = await schema2.validate({
        first: 10,
        second: 20
    });

    expect(valid).toEqual(false);
    expect(obj).toBeUndefined();
    expect(Array.isArray(errors)).toEqual(true);
    if (Array.isArray(errors)) {
        expect(errors.length).toEqual(1);
        expect(errors[0].message).toContain('Preprocessor');
    }
});

test('Preprocessors - 3', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    }).addPreprocessor(() => {
        throw new Error('some error msg');
    });

    const schema2 = schema1.clearPreprocessors();

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect((spec1 as any) !== spec2).toEqual(true);
    expect(spec1.preprocessors.length).toEqual(1);
    expect(spec2.preprocessors.length).toEqual(0);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ first: number; second: number }>();

    const {
        object: obj,
        valid,
        errors
    } = await schema2.validate({
        first: 10,
        second: 20
    });

    expect(valid).toEqual(true);
    expect(obj).toEqual({ first: 10, second: 20 });
    expect(errors).toBeUndefined();
});

test('Validators - 1', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    });

    const schema2 = schema1.addValidator(input =>
        input?.second % 3 !== 0
            ? {
                  valid: false,
                  errors: [
                      {
                          message: 'must divide by 3'
                      }
                  ]
              }
            : { valid: true }
    );

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect((spec1 as any) !== spec2).toEqual(true);
    expect(spec1.validators.length).toEqual(0);
    expect(spec2.validators.length).toEqual(1);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ first: number; second: number }>();

    const { object: obj, valid } = await schema2.validate({
        first: 10,
        second: 21
    });

    expect(valid).toEqual(true);
    expect(obj).toHaveProperty('second', 21);
});

test('Validators - 2', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    });

    const schema2 = schema1.addValidator(input =>
        input?.second % 3 !== 0
            ? {
                  valid: false,
                  errors: [
                      {
                          message: 'must divide by 3'
                      }
                  ]
              }
            : { valid: true }
    );

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect((spec1 as any) !== spec2).toEqual(true);
    expect(spec1.validators.length).toEqual(0);
    expect(spec2.validators.length).toEqual(1);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ first: number; second: number }>();

    const {
        object: obj,
        valid,
        errors
    } = await schema2.validate({
        first: 10,
        second: 20
    });

    expect(valid).toEqual(false);
    expect(obj).toBeUndefined();
    expect(Array.isArray(errors)).toEqual(true);
    expect(errors?.length).toEqual(1);
    if (errors) {
        expect(errors[0].message).toContain('must divide by 3');
    }
});

test('Validators - 3', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    });

    const schema2 = schema1.addValidator(() => {
        throw new Error('some error msg');
    });

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect((spec1 as any) !== spec2).toEqual(true);
    expect(spec1.validators.length).toEqual(0);
    expect(spec2.validators.length).toEqual(1);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ first: number; second: number }>();

    const {
        object: obj,
        valid,
        errors
    } = await schema2.validate({
        first: 10,
        second: 20
    });

    expect(valid).toEqual(false);
    expect(obj).toBeUndefined();
    expect(Array.isArray(errors)).toEqual(true);
    if (Array.isArray(errors)) {
        expect(errors.length).toEqual(1);
        expect(errors[0]).toHaveProperty('message');
    }
});

test('Validators - 4', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    }).addValidator(() => {
        throw new Error('some error msg');
    });

    const schema2 = schema1.clearValidators();

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect((spec1 as any) !== spec2).toEqual(true);
    expect(spec1.validators.length).toEqual(1);
    expect(spec2.validators.length).toEqual(0);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ first: number; second: number }>();

    const {
        object: obj,
        valid,
        errors
    } = await schema2.validate({
        first: 10,
        second: 20
    });

    expect(valid).toEqual(true);
    expect(obj).toEqual({ first: 10, second: 20 });
    expect(errors).toBeUndefined();
});

test('preprocessors run before validators - 1', async () => {
    const schema1 = object({
        first: number(),
        second: number().min(10)
    })
        .addPreprocessor(value => ({
            ...value,
            second: value.second < 10 ? value.second + 9 : value.second
        }))
        .addValidator(value =>
            value?.second % 3 === 0
                ? { valid: true }
                : { valid: false, errors: [{ message: 'must divide by 3' }] }
        );

    {
        const testVal = {
            first: 10,
            second: 9
        }; // true

        const { valid, object } = await schema1.validate(testVal);

        expect(valid).toEqual(true);
        expect(object).toEqual({
            first: 10,
            second: 18
        });
    }

    {
        const testVal = {
            first: 10,
            second: 0
        }; // false

        const { valid, object } = await schema1.validate(testVal);
        expect(valid).toEqual(false);
        expect(object).toBeUndefined();
    }
});

test("child preprocessor run after parent's - 1", async () => {
    const schema1 = object({
        first: number(),
        second: number()
            .min(10)
            .addPreprocessor(value => (value % 3 === 0 ? value + 9 : value))
    }).addPreprocessor(value => ({
        ...value,
        second: value.second < 10 ? value.second + 9 : value.second
    }));

    {
        const testVal = {
            first: 10,
            second: 9
        }; // true

        const { valid, object } = await schema1.validate(testVal);

        expect(valid).toEqual(true);
        expect(object).toEqual({
            first: 10,
            second: 27
        });
    }

    {
        const testVal = {
            first: 10,
            second: 0
        }; // false

        const { valid, object } = await schema1.validate(testVal);
        expect(valid).toEqual(true);
        expect(object).toEqual({
            first: 10,
            second: 18
        });
    }
});

test("child validator run after parent's - 1", async () => {
    const schema1 = object({
        first: number(),
        second: number()
            .min(10)
            .addValidator(value =>
                value % 3 !== 0
                    ? {
                          valid: false,
                          errors: [{ message: 'must divide by 3' }]
                      }
                    : { valid: true }
            )
    }).addValidator(value =>
        value?.second % 5 === 0
            ? { valid: true }
            : { valid: false, errors: [{ message: 'must divide by 5' }] }
    );

    {
        const testVal = {
            first: 10,
            second: 15
        }; // true

        const { valid, object } = await schema1.validate(testVal);

        expect(valid).toEqual(true);
        expect(object).toEqual({
            first: 10,
            second: 15
        });
    }

    {
        const testVal = {
            first: 10,
            second: 8
        }; // false

        const { valid, object, errors } = await schema1.validate(testVal);
        expect(valid).toEqual(false);
        expect(object).toBeUndefined();
        expect(Array.isArray(errors)).toEqual(true);
        if (errors) {
            expect(errors[0]).toHaveProperty('message', 'must divide by 5');
        }
    }

    {
        const testVal = {
            first: 10,
            second: 25
        }; // false

        const { valid, object, errors } = await schema1.validate(testVal);
        expect(valid).toEqual(false);
        expect(object).toBeUndefined();
        expect(Array.isArray(errors)).toEqual(true);
        if (errors) {
            expect(errors[0]).toHaveProperty('message', 'must divide by 3');
        }
    }
});

test('modifyPropSchema - 1', async () => {
    const schema1 = object({
        /**
         * first comment
         */
        first: number(),
        /**
         * second comment
         */
        second: number()
    });

    const schema2 = schema1.modifyPropSchema('first', first =>
        /**
         * some new comment
         */
        first.optional()
    );

    expect((schema1 as any) !== schema2).toEqual(true);

    const typeTest1: InferType<typeof schema1> = { second: 1, first: 3 };
    const typeTest2: InferType<typeof schema2> = { second: 2, first: 3 };

    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ first?: number; second: number }>();

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect(spec1.properties.first.introspect().isRequired).toEqual(true);
    expect(spec2.properties.first.introspect().isRequired).toEqual(false);
    expect((spec2.properties.first as any) !== spec1.properties.first).toEqual(
        true
    );

    {
        const testValue = {
            first: 10,
            second: 20
        };

        const { object, valid, errors } = await schema2.validate(testValue);

        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual({ first: 10, second: 20 });
    }

    {
        const testValue = {
            second: 20
        };

        const { object, valid, errors } = await schema2.validate(testValue);

        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual({ second: 20 });
    }
});

test('modifyPropSchema - 2', () => {
    expect(() => {
        object({
            first: string(),
            second: number()
        }).modifyPropSchema({} as any, () => string());
    }).toThrow();

    expect(() => {
        object({
            first: string(),
            second: number()
        }).modifyPropSchema('third' as any, () => string());
    }).toThrow();

    expect(() => {
        object({
            first: string(),
            second: number()
        }).modifyPropSchema('second', 'string' as any);
    }).toThrow();

    expect(() => {
        object({
            first: string(),
            second: number()
        }).modifyPropSchema('second' as any, () => 'some str' as any);
    }).toThrow();
});

test('Partial - 1', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    });

    const schema2 = schema1.partial();

    expect((schema1 as any) !== schema2).toEqual(true);

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect(spec1.properties.first.introspect().isRequired).toEqual(true);
    expect(spec1.properties.second.introspect().isRequired).toEqual(true);
    expect(spec2.properties.first.introspect().isRequired).toEqual(false);
    expect(spec2.properties.second.introspect().isRequired).toEqual(false);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{
        first?: number;
        second?: number;
    }>();

    {
        const testObj = {
            first: 10,
            second: 20
        };

        const { valid, object, errors } = await schema2.validate(testObj);

        expect(valid).toEqual(true);
        expect(object).toEqual(testObj);
        expect(errors).toBeUndefined();

        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                first?: number;
                second?: number;
            }>();
        }
    }

    {
        const testObj = {};

        const { valid, object, errors } = await schema2.validate(testObj);

        expect(valid).toEqual(true);
        expect(object).toEqual(testObj);
        expect(errors).toBeUndefined();

        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                first?: number;
                second?: number;
            }>();
        }
    }
});

test('Partial - 2', async () => {
    const schema1 = object({
        first: number(),
        second: number(),
        third: number()
    });

    const schema2 = schema1.partial(['second', 'third']);

    expect((schema1 as any) !== schema2).toEqual(true);

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect(spec1.properties.first.introspect().isRequired).toEqual(true);
    expect(spec1.properties.second.introspect().isRequired).toEqual(true);
    expect(spec1.properties.third.introspect().isRequired).toEqual(true);
    expect(spec2.properties.first.introspect().isRequired).toEqual(true);
    expect(spec2.properties.second.introspect().isRequired).toEqual(false);
    expect(spec2.properties.third.introspect().isRequired).toEqual(false);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{
        first: number;
        second: number;
        third: number;
    }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{
        first: number;
        second?: number;
        third?: number;
    }>();

    {
        const testObj = {
            first: 10
        };

        const { valid, object, errors } = await schema2.validate(testObj);

        expect(valid).toEqual(true);
        expect(object).toEqual(testObj);
        expect(errors).toBeUndefined();

        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                first: number;
                second?: number;
                third?: number;
            }>();
        }
    }
});

test('Partial - 3', async () => {
    const schema1 = object({
        first: number(),
        second: number(),
        third: number()
    });

    const schema2 = schema1.partial('second');

    expect((schema1 as any) !== schema2).toEqual(true);

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect(spec1.properties.first.introspect().isRequired).toEqual(true);
    expect(spec1.properties.second.introspect().isRequired).toEqual(true);
    expect(spec1.properties.third.introspect().isRequired).toEqual(true);
    expect(spec2.properties.first.introspect().isRequired).toEqual(true);
    expect(spec2.properties.second.introspect().isRequired).toEqual(false);
    expect(spec2.properties.third.introspect().isRequired).toEqual(true);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;

    expectTypeOf(typeTest1).toEqualTypeOf<{
        first: number;
        second: number;
        third: number;
    }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{
        first: number;
        second?: number;
        third: number;
    }>();

    {
        const testObj = {
            first: 10,
            third: 20
        };

        const { valid, object, errors } = await schema2.validate(testObj);

        expect(valid).toEqual(true);
        expect(object).toEqual(testObj);
        expect(errors).toBeUndefined();

        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                first: number;
                second?: number;
                third: number;
            }>();
        }
    }
});

test('Partial - 4', async () => {
    const schema1 = object({
        first: number(),
        second: number(),
        third: number()
    });

    expect(() => {
        schema1.partial([]);
    }).toThrow();

    expect(() => {
        schema1.partial([1 as any]);
    }).toThrow();

    expect(() => {
        schema1.partial(['first', 'sss' as any]);
    }).toThrow();

    expect(() => {
        schema1.partial(123 as any);
    }).toThrow();
});

test('deepPartial - flat object acts like partial', async () => {
    const schema1 = object({ first: number(), second: number() });
    const schema2 = schema1.deepPartial();

    expect((schema1 as any) !== schema2).toEqual(true);

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    expect(spec1.properties.first.introspect().isRequired).toEqual(true);
    expect(spec1.properties.second.introspect().isRequired).toEqual(true);
    expect(spec2.properties.first.introspect().isRequired).toEqual(false);
    expect(spec2.properties.second.introspect().isRequired).toEqual(false);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;
    expectTypeOf(typeTest1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{
        first?: number;
        second?: number;
    }>();

    {
        const { valid, object } = schema2.validate({ first: 1, second: 2 });
        expect(valid).toEqual(true);
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                first?: number;
                second?: number;
            }>();
        }
    }

    {
        const { valid, object, errors } = schema2.validate({});
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                first?: number;
                second?: number;
            }>();
        }
    }
});

test('deepPartial - nested object properties become optional', async () => {
    const schema1 = object({
        name: string(),
        address: object({ city: string(), country: string() })
    });
    const schema2 = schema1.deepPartial();

    const spec1 = schema1.introspect();
    const spec2 = schema2.introspect();

    // Top-level required unchanged in original
    expect(spec1.properties.name.introspect().isRequired).toEqual(true);
    expect(spec1.properties.address.introspect().isRequired).toEqual(true);
    const origAddr = spec1.properties.address.introspect() as any;
    expect(origAddr.properties.city.introspect().isRequired).toEqual(true);
    expect(origAddr.properties.country.introspect().isRequired).toEqual(true);

    // Top-level optional in deep partial
    expect(spec2.properties.name.introspect().isRequired).toEqual(false);
    expect(spec2.properties.address.introspect().isRequired).toEqual(false);

    // Nested properties also optional
    const deepAddr = spec2.properties.address.introspect() as any;
    expect(deepAddr.properties.city.introspect().isRequired).toEqual(false);
    expect(deepAddr.properties.country.introspect().isRequired).toEqual(false);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;
    expectTypeOf(typeTest1).toEqualTypeOf<{
        name: string;
        address: { city: string; country: string };
    }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{
        name?: string;
        address?: { city?: string; country?: string };
    }>();

    {
        const { valid, object, errors } = schema2.validate({});
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                name?: string;
                address?: { city?: string; country?: string };
            }>();
        }
    }

    {
        const { valid, object } = schema2.validate({ address: {} });
        expect(valid).toEqual(true);
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                name?: string;
                address?: { city?: string; country?: string };
            }>();
        }
    }

    {
        const { valid, object } = schema2.validate({
            address: { city: 'Paris' }
        });
        expect(valid).toEqual(true);
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                name?: string;
                address?: { city?: string; country?: string };
            }>();
        }
    }

    {
        const { valid, object } = schema2.validate({
            name: 'Alice',
            address: { city: 'Paris', country: 'FR' }
        });
        expect(valid).toEqual(true);
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                name?: string;
                address?: { city?: string; country?: string };
            }>();
        }
    }
});

test('deepPartial - three levels deep', async () => {
    const schema1 = object({
        a: object({
            b: object({ c: string() })
        })
    });
    const schema2 = schema1.deepPartial();

    const spec2 = schema2.introspect();

    const aSchema = spec2.properties.a.introspect() as any;
    expect(aSchema.isRequired).toEqual(false);
    const bSchema = aSchema.properties.b.introspect() as any;
    expect(bSchema.isRequired).toEqual(false);
    const cSchema = bSchema.properties.c.introspect() as any;
    expect(cSchema.isRequired).toEqual(false);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;
    expectTypeOf(typeTest1).toEqualTypeOf<{ a: { b: { c: string } } }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ a?: { b?: { c?: string } } }>();

    {
        const { valid, object, errors } = schema2.validate({});
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                a?: { b?: { c?: string } };
            }>();
        }
    }

    {
        const { valid, object } = schema2.validate({ a: {} });
        expect(valid).toEqual(true);
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                a?: { b?: { c?: string } };
            }>();
        }
    }

    {
        const { valid, object } = schema2.validate({ a: { b: {} } });
        expect(valid).toEqual(true);
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                a?: { b?: { c?: string } };
            }>();
        }
    }

    {
        const { valid, object } = schema2.validate({
            a: { b: { c: 'hello' } }
        });
        expect(valid).toEqual(true);
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                a?: { b?: { c?: string } };
            }>();
        }
    }
});

test('deepPartial - array properties become optional (elements unchanged)', async () => {
    const schema1 = object({
        tags: array(string()),
        nested: object({ x: number() })
    });
    const schema2 = schema1.deepPartial();

    const spec2 = schema2.introspect();

    // The array property itself is optional
    expect(spec2.properties.tags.introspect().isRequired).toEqual(false);
    // The nested object property is optional and recursed
    expect(spec2.properties.nested.introspect().isRequired).toEqual(false);
    const nestedSchema = spec2.properties.nested.introspect() as any;
    expect(nestedSchema.properties.x.introspect().isRequired).toEqual(false);

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;
    expectTypeOf(typeTest1).toEqualTypeOf<{
        tags: string[];
        nested: { x: number };
    }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{
        tags?: string[];
        nested?: { x?: number };
    }>();

    {
        const { valid, object, errors } = schema2.validate({});
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                tags?: string[];
                nested?: { x?: number };
            }>();
        }
    }

    {
        const { valid, object } = schema2.validate({ tags: ['a', 'b'] });
        expect(valid).toEqual(true);
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                tags?: string[];
                nested?: { x?: number };
            }>();
        }
    }

    {
        const { valid, object } = schema2.validate({ nested: {} });
        expect(valid).toEqual(true);
        if (object) {
            expectTypeOf(object).toEqualTypeOf<{
                tags?: string[];
                nested?: { x?: number };
            }>();
        }
    }
});

test('deepPartial - original schema is not mutated', () => {
    const schema = object({
        name: string(),
        address: object({ city: string() })
    });

    schema.deepPartial();

    // Original must remain required
    expect(schema.introspect().properties.name.introspect().isRequired).toEqual(
        true
    );
    expect(
        schema.introspect().properties.address.introspect().isRequired
    ).toEqual(true);
    const addrSchema = schema
        .introspect()
        .properties.address.introspect() as any;
    expect(addrSchema.properties.city.introspect().isRequired).toEqual(true);

    const typeTest: InferType<typeof schema> = {} as any;
    expectTypeOf(typeTest).toEqualTypeOf<{
        name: string;
        address: { city: string };
    }>();
});

test('deepPartial - chaining with readonly', () => {
    const schema1 = object({ name: string(), inner: object({ x: number() }) });
    const schema2 = schema1.deepPartial().readonly();

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;
    expectTypeOf(typeTest1).toEqualTypeOf<{
        name: string;
        inner: { x: number };
    }>();
    expectTypeOf(typeTest2).toEqualTypeOf<
        Readonly<{ name?: string; inner?: { x?: number } }>
    >();

    {
        const { valid, object, errors } = schema2.validate({});
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        if (object) {
            expectTypeOf(object).toEqualTypeOf<
                Readonly<{ name?: string; inner?: { x?: number } }>
            >();
        }
    }

    {
        const { valid, object } = schema2.validate({
            name: 'hi',
            inner: { x: 5 }
        });
        expect(valid).toEqual(true);
        if (object) {
            expectTypeOf(object).toEqualTypeOf<
                Readonly<{ name?: string; inner?: { x?: number } }>
            >();
        }
    }
});

test('deepPartial - chaining with default', () => {
    const schema1 = object({ count: number() });
    const schema2 = schema1.deepPartial().default({ count: 42 });

    const typeTest1: InferType<typeof schema1> = {} as any;
    const typeTest2: InferType<typeof schema2> = {} as any;
    expectTypeOf(typeTest1).toEqualTypeOf<{ count: number }>();
    expectTypeOf(typeTest2).toEqualTypeOf<{ count?: number }>();

    const result = schema2.validate(undefined as any);
    expect(result.valid).toEqual(true);
    expect((result as any).object).toEqual({ count: 42 });
    if (result.object) {
        expectTypeOf(result.object).toEqualTypeOf<{ count?: number }>();
    }
});

test('makePropOptional - 1', async () => {
    const schema1 = object({
        /**
         * first comment
         */
        first: number(),
        /**
         * second comment
         */
        second: number()
    });
    const schema2 = schema1.makePropOptional('first');

    expect((schema1 as any) !== schema2).toEqual(true);

    expect(
        schema1.introspect().properties.first.introspect().isRequired
    ).toEqual(true);
    expect(
        schema2.introspect().properties.first.introspect().isRequired
    ).toEqual(false);

    const typeCheck: InferType<typeof schema2> = {
        second: 1,
        first: 2
    };

    expectTypeOf(typeCheck).toEqualTypeOf<{ first?: number; second: number }>();
});

test('makePropRequired - 1', async () => {
    const schema1 = object({
        first: number().optional(),
        second: number()
    });
    const schema2 = schema1.makePropRequired('first');

    expect((schema1 as any) !== schema2).toEqual(true);

    expect(
        schema1.introspect().properties.first.introspect().isRequired
    ).toEqual(false);
    expect(
        schema2.introspect().properties.first.introspect().isRequired
    ).toEqual(true);

    const typeCheck1: InferType<typeof schema1> = null as any;
    const typeCheck2: InferType<typeof schema2> = null as any;

    expectTypeOf(typeCheck1).toEqualTypeOf<{
        first?: number;
        second: number;
    }>();
    expectTypeOf(typeCheck2).toEqualTypeOf<{ first: number; second: number }>();
});

test('makeAllPropsOptional - 1', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    });
    const schema2 = schema1.makeAllPropsOptional();

    expect((schema1 as any) !== schema2).toEqual(true);
    expect(
        schema1.introspect().properties.first.introspect().isRequired
    ).toEqual(true);
    expect(
        schema1.introspect().properties.second.introspect().isRequired
    ).toEqual(true);
    expect(
        schema2.introspect().properties.first.introspect().isRequired
    ).toEqual(false);
    expect(
        schema2.introspect().properties.second.introspect().isRequired
    ).toEqual(false);

    const typeCheck1: InferType<typeof schema1> = null as any;
    const typeCheck2: InferType<typeof schema2> = null as any;

    expectTypeOf(typeCheck1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeCheck2).toEqualTypeOf<{
        first?: number;
        second?: number;
    }>();
});

test('makeAllPropsRequired - 1', async () => {
    const schema1 = object({
        first: number(),
        second: number().optional()
    });
    const schema2 = schema1.makeAllPropsRequired();

    expect((schema1 as any) !== schema2).toEqual(true);
    expect(
        schema1.introspect().properties.first.introspect().isRequired
    ).toEqual(true);
    expect(
        schema1.introspect().properties.second.introspect().isRequired
    ).toEqual(false);
    expect(
        schema2.introspect().properties.first.introspect().isRequired
    ).toEqual(true);
    expect(
        schema2.introspect().properties.second.introspect().isRequired
    ).toEqual(true);

    const typeCheck1: InferType<typeof schema1> = null as any;
    const typeCheck2: InferType<typeof schema2> = null as any;

    expectTypeOf(typeCheck1).toEqualTypeOf<{
        first: number;
        second?: number;
    }>();
    expectTypeOf(typeCheck2).toEqualTypeOf<{ first: number; second: number }>();
});

test('hasType - 1', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    });
    const schema2 = schema1.hasType<string>();

    expect((schema1 as any) !== schema2).toEqual(true);

    const typeCheck1: InferType<typeof schema1> = null as any;
    const typeCheck2: InferType<typeof schema2> = null as any;

    expectTypeOf(typeCheck1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeCheck2).toBeString();
});

test('clearHasType - 1', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    }).hasType('some string');
    const schema2 = schema1.clearHasType();

    expect((schema1 as any) !== schema2).toEqual(true);

    const typeCheck1: InferType<typeof schema1> = null as any;
    const typeCheck2: InferType<typeof schema2> = null as any;

    expectTypeOf(typeCheck1).toBeString();
    expectTypeOf(typeCheck2).toEqualTypeOf<{ first: number; second: number }>();
});

test('pick - 1', async () => {
    const schema1 = object({
        /**
         * comment 1
         */
        first: number(),
        /**
         * comment 2
         */
        second: number()
    });
    const schema2 = schema1.pick('first');

    expect((schema1 as any) !== schema2).toEqual(true);

    const typeCheck1: InferType<typeof schema1> = { first: 1, second: 2 };
    const typeCheck2: InferType<typeof schema2> = { first: 4 };

    expectTypeOf(typeCheck1).toEqualTypeOf<{ first: number; second: number }>();
    expectTypeOf(typeCheck2).toEqualTypeOf<{ first: number }>();
});

test('pick - 2', async () => {
    const schema1 = object({
        first: number(),
        second: number(),
        third: number()
    });
    const schema2 = schema1.pick(['first', 'third']);

    expect((schema1 as any) !== schema2).toEqual(true);

    const typeCheck1: InferType<typeof schema1> = null as any;
    const typeCheck2: InferType<typeof schema2> = null as any;

    expectTypeOf(typeCheck1).toEqualTypeOf<{
        first: number;
        second: number;
        third: number;
    }>();
    expectTypeOf(typeCheck2).toEqualTypeOf<{ first: number; third: number }>();
});

test('pick - 3', async () => {
    const schema1 = object({
        first: number(),
        second: number(),
        third: number()
    });

    const schemaPickFrom = object({
        first: number(),
        /**
         * some comment
         */
        third: number(),
        fourth: number()
    });

    const schema2 = schema1.pick(schemaPickFrom);

    expect((schema1 as any) !== schema2).toEqual(true);

    const typeCheck1: InferType<typeof schema1> = null as any;
    const typeCheck2: InferType<typeof schema2> = null as any;

    expectTypeOf(typeCheck1).toEqualTypeOf<{
        first: number;
        second: number;
        third: number;
    }>();
    expectTypeOf(typeCheck2).toEqualTypeOf<{ first: number; third: number }>();
});

test('pick - 4', async () => {
    const schema1 = object({
        first: number(),
        second: number(),
        third: number()
    });

    const _schemaPickFrom = object({
        first: number(),
        /**
         * some comment
         */
        third: number(),
        fourth: number()
    });

    expect(() => {
        (schema1 as any).pick();
    }).toThrow();

    expect(() => {
        schema1.pick('' as any);
    }).toThrow();

    expect(() => {
        schema1.pick('ssss' as any);
    }).toThrow();

    expect(() => {
        schema1.pick([]);
    }).toThrow();

    expect(() => {
        schema1.pick([1 as any]);
    }).toThrow();

    expect(() => {
        schema1.pick(['first', 'sss' as any]);
    }).toThrow();

    expect(() => {
        schema1.pick(object({ fff: number() }));
    }).toThrow();
});

test('big schema - 1', async () => {
    const externalSchema = object({
        externalFirst: number(),
        externalSecond: number(),
        externalThird: number().optional()
    });

    const twenty = number().equals(20);

    const schema1 = object({
        something1: number(),
        something2: number(),
        something3: number(),
        something4: number(),
        something5: number(),
        something6: number(),
        something7: number(),
        something8: number(),
        something9: number(),
        something10: number(),
        something11: number(),
        something12: number(),
        something13: number(),
        something14: number(),
        something15: number(),
        something16: number(),
        something17: number(),
        something18: number(),
        something19: number(),
        something20: number(),
        something21: number(),
        something22: number(),
        something23: number(),
        something24: number(),
        something25: number(),
        something26: number(),
        something27: number(),
        something28: number(),
        something29: number(),
        something30: number(),
        something31: number(),
        something32: number(),
        something33: number(),
        something34: number(),
        something35: number(),
        something36: number(),
        something37: number(),
        something38: number(),
        something39: number(),
        something40: number(),
        something41: number(),
        something42: number(),
        something43: number(),
        something44: number(),
        something45: number(),
        something46: number(),
        something47: number(),
        something48: number(),
        something49: number(),
        something50: number(),
        something51: number(),
        something52: number(),
        something53: number(),
        something54: number(),
        something55: number(),
        something56: number(),
        something57: number(),
        something58: number(),
        something59: number(),
        something60: number(),
        something61: number(),
        something62: number(),
        something63: number(),
        something64: number(),
        something65: number(),
        something66: number(),
        something67: number(),
        something68: number(),
        something69: number(),
        something70: number(),
        something71: number(),
        something72: number(),
        something73: number(),
        something74: number(),
        something75: number(),
        something76: number(),
        something77: number(),
        something78: number(),
        something79: number(),
        something80: number(),
        something81: number(),
        something82: number(),
        something83: number(),
        something84: number(),
        something85: number(),
        something86: number(),
        something87: number(),
        something88: number(),
        something89: number(),
        something90: number(),
        something91: number(),
        something92: number(),
        something93: number(),
        something94: number(),
        something95: number(),
        something96: number(),
        something97: number(),
        something98: number(),
        something99: number(),
        something100: number(),
        propToOmit1: number(),
        propToOmit2: number(),
        propToOmit3: number()
    })
        .addProps({
            /**
             * some comment
             */
            twenty1: twenty,
            // p2: number().optional(),
            nested: object({
                /**
                 * some description
                 */
                twenty1: twenty,
                twenty2Optional: twenty.optional()
            })
                .optional()
                .addProp('num', number())
                .addProps({
                    n4: number(),
                    n5: number().optional()
                })
        })
        .omit('propToOmit1')
        .hasType(new Date())
        .addProp('newlyAddedProp', number())
        .omit(['propToOmit2', 'propToOmit3'])
        .addProps(externalSchema)
        .clearHasType();

    const val: InferType<typeof schema1> = {
        something1: 1,
        something2: 2,
        something3: 3,
        something4: 4,
        something5: 5,
        something6: 6,
        something7: 7,
        something8: 8,
        something9: 9,
        something10: 10,
        something11: 11,
        something12: 12,
        something13: 13,
        something14: 14,
        something15: 15,
        something16: 16,
        something17: 17,
        something18: 18,
        something19: 19,
        something20: 20,
        something21: 21,
        something22: 22,
        something23: 23,
        something24: 24,
        something25: 25,
        something26: 26,
        something27: 27,
        something28: 28,
        something29: 29,
        something30: 30,
        something31: 31,
        something32: 32,
        something33: 33,
        something34: 34,
        something35: 35,
        something36: 36,
        something37: 37,
        something38: 38,
        something39: 39,
        something40: 40,
        something41: 41,
        something42: 42,
        something43: 43,
        something44: 44,
        something45: 45,
        something46: 46,
        something47: 47,
        something48: 48,
        something49: 49,
        something50: 50,
        something51: 51,
        something52: 52,
        something53: 53,
        something54: 54,
        something55: 55,
        something56: 56,
        something57: 57,
        something58: 58,
        something59: 59,
        something60: 60,
        something61: 61,
        something62: 62,
        something63: 63,
        something64: 64,
        something65: 65,
        something66: 66,
        something67: 67,
        something68: 68,
        something69: 69,
        something70: 70,
        something71: 71,
        something72: 72,
        something73: 73,
        something74: 74,
        something75: 75,
        something76: 76,
        something77: 77,
        something78: 78,
        something79: 79,
        something80: 80,
        something81: 81,
        something82: 82,
        something83: 83,
        something84: 84,
        something85: 85,
        something86: 86,
        something87: 87,
        something88: 88,
        something89: 89,
        something90: 90,
        something91: 91,
        something92: 92,
        something93: 93,
        something94: 94,
        something95: 95,
        something96: 96,
        something97: 97,
        something98: 98,
        something99: 99,
        something100: 100,
        twenty1: 20,
        nested: {
            n4: 1,
            num: 2,
            twenty1: 20
        },
        externalFirst: 1,
        externalSecond: 2,
        newlyAddedProp: 4,
        externalThird: 3
    };

    {
        const { object, valid, errors } = await schema1.validate(val);
        expect(valid).toEqual(true);
        expect(errors).toBeUndefined();
        expect(object).toEqual(val);

        if (typeof object !== 'undefined') {
            expectTypeOf(object).toEqualTypeOf<{
                something1: number;
                something2: number;
                something3: number;
                something4: number;
                something5: number;
                something6: number;
                something7: number;
                something8: number;
                something9: number;
                something10: number;
                something11: number;
                something12: number;
                something13: number;
                something14: number;
                something15: number;
                something16: number;
                something17: number;
                something18: number;
                something19: number;
                something20: number;
                something21: number;
                something22: number;
                something23: number;
                something24: number;
                something25: number;
                something26: number;
                something27: number;
                something28: number;
                something29: number;
                something30: number;
                something31: number;
                something32: number;
                something33: number;
                something34: number;
                something35: number;
                something36: number;
                something37: number;
                something38: number;
                something39: number;
                something40: number;
                something41: number;
                something42: number;
                something43: number;
                something44: number;
                something45: number;
                something46: number;
                something47: number;
                something48: number;
                something49: number;
                something50: number;
                something51: number;
                something52: number;
                something53: number;
                something54: number;
                something55: number;
                something56: number;
                something57: number;
                something58: number;
                something59: number;
                something60: number;
                something61: number;
                something62: number;
                something63: number;
                something64: number;
                something65: number;
                something66: number;
                something67: number;
                something68: number;
                something69: number;
                something70: number;
                something71: number;
                something72: number;
                something73: number;
                something74: number;
                something75: number;
                something76: number;
                something77: number;
                something78: number;
                something79: number;
                something80: number;
                something81: number;
                something82: number;
                something83: number;
                something84: number;
                something85: number;
                something86: number;
                something87: number;
                something88: number;
                something89: number;
                something90: number;
                something91: number;
                something92: number;
                something93: number;
                something94: number;
                something95: number;
                something96: number;
                something97: number;
                something98: number;
                something99: number;
                something100: number;
                twenty1: 20;
                nested?: {
                    n4: number;
                    n5?: number;
                    num: number;
                    twenty1: 20;
                    twenty2Optional?: 20;
                };
                externalFirst: number;
                externalSecond: number;
                newlyAddedProp: number;
                externalThird?: number;
            }>();
        }
    }
});

test('Conditional Preprocessors', async () => {
    const schema = object({
        num: number()
    }).addPreprocessor(obj =>
        obj && obj.num % 2 === 0 ? { num: obj.num + 1 } : { num: 0 }
    );

    {
        const obj = {
            num: 11
        };

        const { valid, object: res1 } = await schema.validate(obj);
        expect(valid).toEqual(true);
        expect(res1?.num).toEqual(0);
        expect(obj.num).toEqual(11);
    }

    {
        const obj = {
            num: 10
        };
        const { valid, object: res } = await schema.validate(obj);
        expect(valid).toEqual(true);
        expect(res?.num).toEqual(11);
        expect(obj.num).toEqual(10);
    }
});

test('Conditional Preprocessors', async () => {
    const schema = object({
        num: number()
    })
        .addPreprocessor(obj =>
            obj && obj.num % 2 === 0 ? { num: obj.num + 1 } : { num: 0 }
        )
        .addValidator(obj =>
            obj?.num === 11
                ? { valid: false, errors: [{ message: '11 is not valid' }] }
                : { valid: true }
        );

    {
        const obj = {
            num: 11
        };

        const { valid, object: res1 } = await schema.validate(obj);
        expect(valid).toEqual(true);
        expect(res1?.num).toEqual(0);
        expect(obj.num).toEqual(11);
    }

    {
        const obj = {
            num: 10
        };
        const { valid, object: res } = await schema.validate(obj);
        expect(valid).toEqual(false);
        expect(res).toBeUndefined();
        expect(obj.num).toEqual(10);
    }
});

test('Preprocessors', async () => {
    const preprocessDateInterval = (value: any) => {
        if (typeof value === 'undefined') return value;

        if (typeof value === 'string') {
            try {
                return {
                    from: new Date(2022, 0, 1),
                    to: new Date(2023, 0, 1)
                };
            } catch (_e) {
                return value;
            }
        }

        return value;
    };

    const IntervalSchema = union(string()).or(
        object({
            from: date(),
            to: date()
        })
    );

    const schema = object({
        interval: IntervalSchema,
        num: number()
    }).addPreprocessor(value => {
        if (!value || typeof value !== 'object') return value;
        value.interval = preprocessDateInterval(value?.interval);
        return value;
    });

    const testObj = {
        interval: 'some-str',
        num: 10
    };

    const { valid, object: result, errors } = await schema.validate(testObj);

    expect(valid).toEqual(true);
    expect(result === testObj).toEqual(false);
    expect(typeof testObj.interval === 'string').toEqual(true);
    expect(errors).toBeUndefined();
});

test('Number equals as property', async () => {
    const schema = object({
        first: number().equals(10)
    });

    const typeTest: InferType<typeof schema> = {} as any;
    expectTypeOf(typeTest).toEqualTypeOf<{ first: 10 }>();
});

test('Optional Property', async () => {
    const schema = object({
        first: number(),
        second: string().optional()
    });

    {
        const { valid, object, errors } = await schema.validate({
            first: 123,
            second: '234'
        });

        expect(valid).toEqual(true);
        expect(object).toEqual({
            first: 123,
            second: '234'
        });
        expect(errors).toBeUndefined();
    }

    {
        const { valid, object, errors } = await schema.validate({
            first: 123,
            second: null as any
        });

        expect(valid).toEqual(true);
        expect(object).toEqual({
            first: 123,
            second: null
        });
        expect(errors).toBeUndefined();
    }

    {
        const { valid, object, errors } = await schema.validate({
            first: 123,
            second: undefined
        });

        expect(valid).toEqual(true);
        expect(object).toEqual({
            first: 123,
            second: undefined
        });
        expect(errors).toBeUndefined();
    }
});

test('no errors returned from validator', async () => {
    const schema = object({ a: string() }).addValidator(_val => ({
        valid: false,
        errors: []
    }));

    {
        const { valid, errors } = await schema.validate({} as any, {
            doNotStopOnFirstError: true
        });
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length === 2).toEqual(true);
    }
});

test('named validator', async () => {
    const namedValidator = () => ({
        valid: false,
        errors: []
    });
    const schema = object({ a: string() }).addValidator(namedValidator);

    {
        const { valid, errors } = await schema.validate({} as any, {
            doNotStopOnFirstError: true
        });
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length === 2).toEqual(true);
    }
});

test('named validator throws', async () => {
    const namedValidator = () => {
        throw new Error('some error');
    };
    const schema = object({ a: string() }).addValidator(namedValidator);

    {
        const { valid, errors } = await schema.validate({} as any, {
            doNotStopOnFirstError: true
        });
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length === 2).toEqual(true);
    }
});

test('named preprocessor throws', async () => {
    const namedPreprocessor = () => {
        throw new Error('some error');
    };
    const schema = object({ a: string() }).addPreprocessor(namedPreprocessor);

    {
        const { valid, errors } = await schema.validate({} as any, {
            doNotStopOnFirstError: true
        });
        expect(valid).toEqual(false);
        expect(Array.isArray(errors) && errors.length === 2).toEqual(true);
    }
});

test('preprocessor not function', async () => {
    expect(() => {
        object({ a: string() }).addPreprocessor('some str' as any);
    }).toThrow();
});

test('validator not function', async () => {
    expect(() => {
        object({ a: string() }).addValidator('some str' as any);
    }).toThrow();
});

test('intersect - 1', async () => {
    const schema1 = object({
        /** First comment */
        first: string(),
        /** Second comment */
        second: number(),
        third: string()
    });

    const schema2 = object({
        /** Third comment */
        third: number()
    });

    const schema3 = schema1.intersect(schema2);

    const typeCheck: InferType<typeof schema3> = {
        first: '44',
        second: 234,
        third: 123
    };

    expect(() => {
        schema2.intersect({} as any);
    }).toThrow();

    expect(schema3 !== (schema2 as any)).toEqual(true);

    expect(
        schema1.introspect().properties.third.introspect().type === 'string'
    ).toEqual(true);

    expect(
        schema3.introspect().properties.third.introspect().type === 'number'
    ).toEqual(true);

    expectTypeOf(typeCheck).toEqualTypeOf<{
        first: string;
        second: number;
        third: number;
    }>();
});

test('optimize', () => {
    const schema = object({ first: string() });

    expect(schema.optimize() !== schema).toEqual(true);
});

test('addProp - 1', async () => {
    const schema1 = object({ first: number() });

    const schema2 = schema1.addProp('second', string());

    expect(schema1 !== (schema2 as any)).toEqual(true);

    expect('second' in schema2.introspect().properties).toEqual(true);

    expect(() => {
        (schema1 as any).addProp();
    }).toThrow();

    expect(() => {
        schema1.addProp('first', number());
    }).toThrow();

    expect(() => {
        schema1.addProp('second', 'sss' as any);
    }).toThrow();
});

test('Custom path', async () => {
    const schema = object({
        first: string()
    });

    const { valid, errors } = await schema.validate(
        {
            unk: 123
        } as any,
        {
            doNotStopOnFirstError: true
        }
    );

    expect(valid).toEqual(false);
    expect(Array.isArray(errors) && errors.length === 2).toEqual(true);
});

test('getErrorsFor - 1', async () => {
    const schema = object({
        first: string(),
        last: string(),
        age: number()
    });

    const obj = { first: 'Leo', last: 'Tolstoi', age: 'old' };

    const { getErrorsFor } = await schema.validate(obj as any);

    const ageErrors = getErrorsFor(t => t.age);
    const firstErrors = getErrorsFor(t => t.first);
    const lastErrors = getErrorsFor(t => t.last);

    expect(ageErrors).toBeDefined();
    expect(firstErrors).toBeDefined();
    expect(lastErrors).toBeDefined();

    expect(
        Array.isArray(firstErrors.errors) && firstErrors.errors.length === 0
    ).toEqual(true);
    expect(
        Array.isArray(lastErrors.errors) && lastErrors.errors.length === 0
    ).toEqual(true);
    expect(
        Array.isArray(ageErrors.errors) && ageErrors.errors.length === 1
    ).toEqual(true);

    expect(ageErrors.seenValue).toEqual('old');
    expect(firstErrors.seenValue).toEqual('Leo');
    expect(lastErrors.seenValue).toEqual('Tolstoi');

    expect(ageErrors.errors[0]).toEqual('expected type number, but saw string');
});

test('getErrorsFor - self', async () => {
    const schema = object({
        first: string(),
        last: string(),
        age: number()
    });

    const { valid, getErrorsFor } = await schema.validate(123 as any);

    expect(valid).toEqual(false);
    const rootErrors = getErrorsFor(t => t);
    expect(rootErrors).toBeDefined();
    expect(
        Array.isArray(rootErrors.errors) && rootErrors.errors.length === 1
    ).toEqual(true);
    expect(rootErrors.errors[0]).toEqual('must be an object');
});

test('getErrorsFor - nested 1', async () => {
    const schema = object({
        first: string(),
        last: string(),
        age: number(),
        nested: object({
            nested1: string(),
            /**
             * some comment here
             */
            nested2: string(),
            nested3: number()
        })
    });

    const obj = {
        first: 'Leo',
        last: 'Tolstoi',
        age: 20,
        nested: {
            nested1: 'Leo',
            nested2: 'Tolstoi',
            nested3: 'old'
        }
    };

    const { getErrorsFor, valid } = await schema.validate(obj as any);
    const rootErrors = getErrorsFor(t => t);
    expect(rootErrors).toBeDefined();
    expect(rootErrors.errors).toBeDefined();
    expect(rootErrors.errors.length).toEqual(0);

    const nestedErrors = getErrorsFor(t => t.nested);
    expect(nestedErrors.isValid).toEqual(false);
    expect(nestedErrors.errors).toBeDefined();
    expect(nestedErrors.errors.length).toEqual(0);
    const childErrors = nestedErrors.getChildErrors();
    expect(childErrors.length).toEqual(1);
    expect(childErrors[0].errors.length).toEqual(1);
    expect(childErrors[0].errors[0]).toEqual(
        'expected type number, but saw string'
    );

    const nested3Errors = getErrorsFor(t => t.nested.nested3);
    expect(nested3Errors.errors).toBeDefined();
    expect(nested3Errors.errors.length).toEqual(1);
    expect(nested3Errors.errors[0]).toEqual(
        'expected type number, but saw string'
    );
    expect(valid).toEqual(false);

    const nested4Errors = getErrorsFor(
        t => t.nested.nested2
    ).descriptor.parent.parent.getSchema();

    expect(nested4Errors === schema).toEqual(true);
});

test('getErrorsFor - union', async () => {
    const IntervalSchema = union(string()).or(
        object({
            from: date(),
            to: date()
        })
    );

    const wrongInterval: InferType<typeof IntervalSchema> = 123 as any;

    const { getNestedErrors, valid } = await IntervalSchema.validate(
        wrongInterval as any
    );

    expect(valid).toEqual(false);

    const rootErrors = getNestedErrors();
    expect(rootErrors).toBeDefined();
    expect(
        Array.isArray(rootErrors.errors) && rootErrors.errors.length === 1
    ).toEqual(true);
});

test('getErrorsFor - root errors from validator', () => {
    const ChangePasswordSchema = object({
        currentPassword: string(),
        newPassword: string().minLength(
            6,
            'Пароль має містити щонайменше 6 символів'
        ),
        confirmPassword: string().minLength(
            6,
            'Пароль має містити щонайменше 6 символів'
        )
    }).addValidator(value => {
        if (value.newPassword !== value.confirmPassword) {
            return {
                valid: false,
                errors: [
                    {
                        message: 'Passwords do not match'
                    }
                ]
            };
        }
        return { valid: true };
    });

    const { getErrorsFor, valid } = ChangePasswordSchema.validate({
        currentPassword: 'oldPass',
        newPassword: 'newPass',
        confirmPassword: 'newPass2'
    });

    expect(valid).toEqual(false);

    const rootErrors = getErrorsFor();
    expect(rootErrors).toBeDefined();
    expect(
        Array.isArray(rootErrors.errors) && rootErrors.errors.length === 1
    ).toEqual(true);
    expect(rootErrors.errors[0]).toEqual('Passwords do not match');
});

// ---------------------------------------------------------------------------
// Property-targeted validator errors
// ---------------------------------------------------------------------------

test('addValidator - property-targeted error appears on getErrorsFor', () => {
    const schema = object({
        password: string().minLength(6),
        confirmPassword: string().minLength(6)
    }).addValidator(value => {
        if (value.password !== value.confirmPassword) {
            return {
                valid: false,
                errors: [
                    {
                        message: 'Passwords do not match',
                        property: t => t.confirmPassword
                    }
                ]
            };
        }
        return { valid: true };
    });

    const result = schema.validate(
        { password: 'secret1', confirmPassword: 'secret2' },
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toEqual(false);

    const confirmErrors = result.getErrorsFor(t => t.confirmPassword);
    expect(confirmErrors.errors.length).toEqual(1);
    expect(confirmErrors.errors[0]).toEqual('Passwords do not match');

    const passwordErrors = result.getErrorsFor(t => t.password);
    expect(passwordErrors.errors.length).toEqual(0);
});

test('addValidator - property-targeted error without doNotStopOnFirstError', () => {
    const schema = object({
        password: string().minLength(6),
        confirmPassword: string().minLength(6)
    }).addValidator(value => {
        if (value.password !== value.confirmPassword) {
            return {
                valid: false,
                errors: [
                    {
                        message: 'Passwords do not match',
                        property: t => t.confirmPassword
                    }
                ]
            };
        }
        return { valid: true };
    });

    const result = schema.validate({
        password: 'secret1',
        confirmPassword: 'secret2'
    });

    expect(result.valid).toEqual(false);

    const confirmErrors = result.getErrorsFor(t => t.confirmPassword);
    expect(confirmErrors.errors.length).toEqual(1);
    expect(confirmErrors.errors[0]).toEqual('Passwords do not match');

    const passwordErrors = result.getErrorsFor(t => t.password);
    expect(passwordErrors.errors.length).toEqual(0);
});

test('addValidator - multiple errors targeting different properties', () => {
    const schema = object({
        startDate: string(),
        endDate: string(),
        name: string()
    }).addValidator(value => {
        if (value.startDate > value.endDate) {
            return {
                valid: false as const,
                errors: [
                    {
                        message: 'Start date must be before end date',
                        property: t => t.startDate
                    },
                    {
                        message: 'End date must be after start date',
                        property: t => t.endDate
                    }
                ]
            };
        }
        return { valid: true as const };
    });

    const result = schema.validate(
        { startDate: '2026-12-01', endDate: '2026-01-01', name: 'test' },
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toEqual(false);

    const startErrors = result.getErrorsFor(t => t.startDate);
    expect(startErrors.errors.length).toEqual(1);
    expect(startErrors.errors[0]).toEqual('Start date must be before end date');

    const endErrors = result.getErrorsFor(t => t.endDate);
    expect(endErrors.errors.length).toEqual(1);
    expect(endErrors.errors[0]).toEqual('End date must be after start date');

    const nameErrors = result.getErrorsFor(t => t.name);
    expect(nameErrors.errors.length).toEqual(0);
});

test('addValidator - mix of targeted and untargeted errors', () => {
    const schema = object({
        password: string(),
        confirmPassword: string()
    }).addValidator(value => {
        if (value.password !== value.confirmPassword) {
            return {
                valid: false,
                errors: [
                    {
                        message: 'Passwords do not match',
                        property: t => t.confirmPassword
                    },
                    { message: 'Form has errors' }
                ]
            };
        }
        return { valid: true };
    });

    const result = schema.validate(
        { password: 'abc', confirmPassword: 'xyz' },
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toEqual(false);

    // Targeted error goes to confirmPassword
    const confirmErrors = result.getErrorsFor(t => t.confirmPassword);
    expect(confirmErrors.errors.length).toEqual(1);
    expect(confirmErrors.errors[0]).toEqual('Passwords do not match');

    // Untargeted error goes to root
    const rootErrors = result.getErrorsFor();
    expect(rootErrors.errors).toContain('Form has errors');

    // Both errors present in flat errors array
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toEqual(2);
});

test('addValidator - async validator with property targeting', async () => {
    const schema = object({
        email: string(),
        confirmEmail: string()
    }).addValidator(async value => {
        if (value.email !== value.confirmEmail) {
            return {
                valid: false,
                errors: [
                    {
                        message: 'Emails do not match',
                        property: t => t.confirmEmail
                    }
                ]
            };
        }
        return { valid: true };
    });

    const result = await schema.validateAsync(
        { email: 'a@b.com', confirmEmail: 'c@d.com' },
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toEqual(false);

    const confirmErrors = result.getErrorsFor(t => t.confirmEmail);
    expect(confirmErrors.errors.length).toEqual(1);
    expect(confirmErrors.errors[0]).toEqual('Emails do not match');

    const emailErrors = result.getErrorsFor(t => t.email);
    expect(emailErrors.errors.length).toEqual(0);
});

test('addValidator - property-targeted error also in flat errors array', () => {
    const schema = object({
        password: string(),
        confirmPassword: string()
    }).addValidator(value => {
        if (value.password !== value.confirmPassword) {
            return {
                valid: false,
                errors: [
                    {
                        message: 'Passwords do not match',
                        property: t => t.confirmPassword
                    }
                ]
            };
        }
        return { valid: true };
    });

    const result = schema.validate(
        { password: 'abc', confirmPassword: 'xyz' },
        { doNotStopOnFirstError: true }
    );

    expect(result.valid).toEqual(false);
    // Error is still in the flat errors array for backward compat
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toEqual(1);
    expect(result.errors![0].message).toEqual('Passwords do not match');
});

test('addValidator - property selector callback receives PropertyDescriptorTree', () => {
    object({
        password: string(),
        confirmPassword: string()
    }).addValidator(_value => {
        return {
            valid: false,
            errors: [
                {
                    message: 'test',
                    property: t => {
                        // t should have 'password' and 'confirmPassword' keys
                        expectTypeOf(t).toHaveProperty('password');
                        expectTypeOf(t).toHaveProperty('confirmPassword');
                        return t.confirmPassword;
                    }
                }
            ]
        };
    });
});

// ---------------------------------------------------------------------------
// clearDefault (line 397)
// ---------------------------------------------------------------------------

test('clearDefault - removes default value from object schema', () => {
    const schema = object({ name: string() })
        .default({ name: 'default' } as any)
        .clearDefault();
    expect(schema.introspect().defaultValue).toBeUndefined();
    const { valid } = schema.validate(undefined as any);
    expect(valid).toEqual(false);
});

// ---------------------------------------------------------------------------
// Full validation path: null/undefined optional — line 665
// ---------------------------------------------------------------------------

test('full-path: optional object schema with null → valid (line 665)', () => {
    const schema = object({ name: string() })
        .optional()
        .addValidator(() => ({ valid: true }));
    const result = schema.validate(null as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toBeNull();
});

test('full-path: optional object schema with undefined → valid (line 665)', () => {
    const schema = object({ name: string() })
        .optional()
        .addValidator(() => ({ valid: true }));
    const result = schema.validate(undefined as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toBeUndefined();
});

// ---------------------------------------------------------------------------
// Full-path: empty schema + empty object edge cases — lines 703-753
// ---------------------------------------------------------------------------

test('full-path: empty schema + empty obj + failing validator doNotStopOnFirstError (lines 703-705)', () => {
    const schema = object().addValidator(() => ({
        valid: false,
        errors: [{ message: 'always fails' }]
    }));
    const result = schema.validate({} as any, { doNotStopOnFirstError: true });
    expect(result.valid).toEqual(false);
});

test('full-path: empty schema + empty obj + passing validator (lines 714-717)', () => {
    const schema = object().addValidator(() => ({ valid: true }));
    const result = schema.validate({} as any);
    expect(result.valid).toEqual(true);
    expect(result.object).toEqual({});
});

test('full-path: empty schema + unknown props + !acceptUnknownProps (lines 727-740)', () => {
    const schema = object().addValidator(() => ({ valid: true }));
    const result = schema.validate({ unknownKey: 'val' } as any);
    expect(result.valid).toEqual(false);
    expect(result.errors?.[0].message).toContain('unknown property');
});

test('full-path: empty schema + unknown props + doNotStopOnFirstError (lines 728-733)', () => {
    const schema = object().addValidator(() => ({ valid: true }));
    const result = schema.validate({ key1: 'a', key2: 'b' } as any, {
        doNotStopOnFirstError: true
    });
    expect(result.valid).toEqual(false);
    expect(result.errors?.length).toBeGreaterThanOrEqual(2);
});

test('full-path: empty schema + acceptUnknownProps + unknown props (lines 750-753)', () => {
    const schema = object()
        .acceptUnknownProps()
        .addValidator(() => ({ valid: true }));
    const result = schema.validate({ extra: 'value' } as any);
    expect(result.valid).toEqual(true);
    expect((result.object as any).extra).toBe('value');
});

// ---------------------------------------------------------------------------
// Full-path: acceptUnknownProps with defined + unknown props (lines 853-855)
// ---------------------------------------------------------------------------

test('full-path: acceptUnknownProps copies unknown keys to result (lines 853-855)', () => {
    const schema = object({ name: string() })
        .acceptUnknownProps()
        .addValidator(() => ({ valid: true }));
    const result = schema.validate({ name: 'Alice', extra: 42 } as any);
    expect(result.valid).toEqual(true);
    expect((result.object as any).extra).toBe(42);
});

// ---------------------------------------------------------------------------
// Fast-path lazy getErrorsFor — lines 1031, 1049
// ---------------------------------------------------------------------------

test('fast-path: optional object null → getErrorsFor is lazy (line 1031)', () => {
    const schema = object({ name: string() }).optional();
    const result = schema.validate(null as any);
    expect(result.valid).toEqual(true);
    // Calling getErrorsFor triggers the lazy evaluator at line 1031
    const errors = result.getErrorsFor();
    expect(errors).toBeDefined();
});

test('fast-path: required object undefined → getErrorsFor is lazy (line 1049)', () => {
    const schema = object({ name: string() });
    const result = schema.validate(undefined as any);
    expect(result.valid).toEqual(false);
    // Calling getErrorsFor triggers the lazy evaluator at line 1049
    const errors = result.getErrorsFor();
    expect(errors).toBeDefined();
});

// ---------------------------------------------------------------------------
// createPropertyDescriptorFor: getValue when propertyName is undefined (line 2420)
// ---------------------------------------------------------------------------

test('getPropertiesFor root descriptor: getValue returns seenValue when propertyName not a string (line 2420)', () => {
    const schema = object({ name: string() });
    const props = ObjectSchemaBuilder.getPropertiesFor(schema);
    const rootDesc = (props as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
    if (rootDesc && typeof rootDesc.getValue === 'function') {
        // Root descriptor has no propertyName → typeof undefined !== 'string'
        // getValue returns { success: true, value: selectorResult }
        const testObj = { name: 'Alice' };
        const result = rootDesc.getValue(testObj);
        expect(result.success).toBe(true);
    }
});

test('PropertyValidationResult: throws on invalid descriptor (line 118)', () => {
    expect(() => new PropertyValidationResult({} as any, undefined)).toThrow(
        'Invalid property descriptor'
    );
});

// ---------------------------------------------------------------------------
// getErrorsFor with invalid descriptor throws (line 618)
// ---------------------------------------------------------------------------

test('getErrorsFor: throws on invalid descriptor (line 618)', () => {
    const schema = object({ name: string() });
    const result = schema.validate({ name: 'Alice' });
    expect(() => result.getErrorsFor(() => ({}) as any)).toThrow(
        'invalid property descriptor'
    );
});

// line 2147 (!introspected.properties branch) is unreachable through public API;
// ObjectSchemaBuilder.getPropertiesFor validates instanceof before reaching it.

// ---------------------------------------------------------------------------
// PropertyValidationResult: seenValue false branch (line 58)
//   and constructor with errors array (line 121)
// ---------------------------------------------------------------------------

test('PropertyValidationResult: seenValue returns undefined when property missing (line 58)', () => {
    const schema = object({ city: string() });
    const props = ObjectSchemaBuilder.getPropertiesFor(schema);
    // Pass an empty object — city is absent → getValue returns { success: false }
    const pvr = new PropertyValidationResult((props as any).city, {} as any);
    expect(pvr.seenValue).toBeUndefined();
});

test('PropertyValidationResult: constructor with initial errors array (line 121)', () => {
    const schema = object({ city: string() });
    const props = ObjectSchemaBuilder.getPropertiesFor(schema);
    const pvr = new PropertyValidationResult(
        (props as any).city,
        { city: 'London' },
        ['pre-existing error']
    );
    expect(pvr.errors).toEqual(['pre-existing error']);
});

// ---------------------------------------------------------------------------
// addConstructor / clearConstructors
// ---------------------------------------------------------------------------

test('addConstructor: inferred type includes construct signature (single constructor)', () => {
    const schema = object({ name: string() }).addConstructor(
        func().addParameter(string())
    );

    type Inferred = InferType<typeof schema>;

    expectTypeOf<Inferred>().toMatchTypeOf<{
        new (p0: string): { name: string };
    }>();

    expectTypeOf<Inferred>().toMatchTypeOf<{ name: string }>();
});

test('addConstructor: inferred type supports two chained constructors', () => {
    const schema = object({ name: string() })
        .addConstructor(func().addParameter(string()))
        .addConstructor(func().addParameter(string()).addParameter(number()));

    type Inferred = InferType<typeof schema>;

    expectTypeOf<Inferred>().toMatchTypeOf<{
        new (p0: string): { name: string };
    }>();

    expectTypeOf<Inferred>().toMatchTypeOf<{
        new (p0: string, p1: number): { name: string };
    }>();

    expectTypeOf<Inferred>().toMatchTypeOf<{ name: string }>();
});

test('addConstructor: type is preserved through addProp', () => {
    const schema = object({ name: string() })
        .addConstructor(func().addParameter(number()))
        .addProp('age', number());

    type Inferred = InferType<typeof schema>;

    expectTypeOf<Inferred>().toMatchTypeOf<{
        new (p0: number): { name: string; age: number };
    }>();
});

test('addConstructor: type is preserved through optional()', () => {
    const schema = object({ name: string() })
        .addConstructor(func().addParameter(string()))
        .optional();

    type Inferred = InferType<typeof schema>;

    expectTypeOf<Inferred>().toMatchTypeOf<
        ({ new (p0: string): { name: string } } & { name: string }) | undefined
    >();
});

test('clearConstructors: reverts inferred type to plain props', () => {
    const schema = object({ name: string() })
        .addConstructor(func().addParameter(string()))
        .clearConstructors();

    type Inferred = InferType<typeof schema>;

    expectTypeOf<Inferred>().toEqualTypeOf<{ name: string }>();
});

test('addConstructor: introspect exposes constructorSchemas', () => {
    const funcSchema = func().addParameter(string());
    const schema = object({ name: string() }).addConstructor(funcSchema);

    const { constructorSchemas } = schema.introspect();
    expect(constructorSchemas).toHaveLength(1);
    expect(constructorSchemas[0]).toBe(funcSchema);
});

test('addConstructor: chained calls accumulate constructorSchemas', () => {
    const f1 = func().addParameter(string());
    const f2 = func().addParameter(number());
    const schema = object({ name: string() })
        .addConstructor(f1)
        .addConstructor(f2);

    const { constructorSchemas } = schema.introspect();
    expect(constructorSchemas).toHaveLength(2);
    expect(constructorSchemas[0]).toBe(f1);
    expect(constructorSchemas[1]).toBe(f2);
});

test('clearConstructors: introspect returns empty constructorSchemas', () => {
    const schema = object({ name: string() })
        .addConstructor(func().addParameter(string()))
        .clearConstructors();

    const { constructorSchemas } = schema.introspect();
    expect(constructorSchemas).toHaveLength(0);
});

test('addConstructor: validate still works with plain objects', async () => {
    const schema = object({ name: string() }).addConstructor(
        func().addParameter(string())
    );

    const { valid } = await schema.validate({ name: 'Alice' });
    expect(valid).toBe(true);
});

test('addConstructor: validate rejects invalid plain objects', async () => {
    const schema = object({ name: string() }).addConstructor(
        func().addParameter(string())
    );

    const { valid } = await schema.validate({ name: 123 } as any);
    expect(valid).toBe(false);
});

test('addConstructor: no effect on empty constructor list for inferred type', () => {
    const schema = object({ name: string() });
    type Inferred = InferType<typeof schema>;
    expectTypeOf<Inferred>().toEqualTypeOf<{ name: string }>();
});

// ---------------------------------------------------------------------------
// Regression: Object.keys(null) crash when doNotStopOnFirstError is true
// Prior to the fix, passing null to a required object schema with
// doNotStopOnFirstError:true would throw "Cannot convert undefined or null
// to object" at Object.keys() inside #setupValidation.
// ---------------------------------------------------------------------------

test('regression: null input with doNotStopOnFirstError:true does not throw', async () => {
    const schema = object({ msg: string().required() });
    const result = await schema.validateAsync(null as any, {
        doNotStopOnFirstError: true
    });
    expect(result.valid).toBe(false);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors!.length).toBeGreaterThan(0);
});

test('regression: null input with doNotStopOnFirstError:false does not throw', async () => {
    const schema = object({ msg: string().required() });
    const result = await schema.validateAsync(null as any, {
        doNotStopOnFirstError: false
    });
    expect(result.valid).toBe(false);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors!.length).toBeGreaterThan(0);
});

test('toJsonPointer returns correct path for nested descriptors', () => {
    const schema = object({
        name: string(),
        address: object({
            city: string(),
            country: string()
        })
    });

    const props = ObjectSchemaBuilder.getPropertiesFor(schema);
    expect(props[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].toJsonPointer()).toBe('');
    expect(
        (props as any).name[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].toJsonPointer()
    ).toBe('/name');
    expect(
        (props as any).address[
            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
        ].toJsonPointer()
    ).toBe('/address');
    expect(
        (props as any).address.city[
            SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
        ].toJsonPointer()
    ).toBe('/address/city');
});

test('toJsonPointer escapes ~ and / in property names per RFC 6901', () => {
    const schema = object({
        'a/b': string(),
        'c~d': string()
    });

    const props = ObjectSchemaBuilder.getPropertiesFor(schema);
    expect(
        (props as any)['a/b'][SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].toJsonPointer()
    ).toBe('/a~1b');
    expect(
        (props as any)['c~d'][SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].toJsonPointer()
    ).toBe('/c~0d');
});

test('getInvalidProperties returns entries with correct toJsonPointer for nested errors', async () => {
    const schema = object({
        name: string(),
        address: object({
            city: string(),
            zip: number()
        })
    });

    const result = await schema.validateAsync(
        { name: 'Leo', address: { city: 123, zip: 'bad' } } as any,
        { doNotStopOnFirstError: true }
    );
    expect(result.valid).toBe(false);
    expect(typeof result.getInvalidProperties).toBe('function');

    const invalid = result.getInvalidProperties();
    expect(invalid.length).toBeGreaterThanOrEqual(2);

    const pointers = invalid.map(r => r.descriptor.toJsonPointer());
    expect(pointers).toContain('/address/city');
    expect(pointers).toContain('/address/zip');
});

test('getInvalidProperties returns root-level error for non-object body', async () => {
    const schema = object({ name: string() });

    const result = await schema.validateAsync('not an object' as any, {
        doNotStopOnFirstError: true
    });
    expect(result.valid).toBe(false);

    const invalid = result.getInvalidProperties();
    expect(invalid.length).toBeGreaterThanOrEqual(1);
    expect(invalid.some(r => r.descriptor.toJsonPointer() === '')).toBe(true);
});

test('getInvalidProperties returns empty array when validation passes', async () => {
    const schema = object({ name: string() });

    const result = await schema.validateAsync({ name: 'Leo' } as any, {
        doNotStopOnFirstError: true
    });
    expect(result.valid).toBe(true);

    const invalid = result.getInvalidProperties();
    expect(invalid).toEqual([]);
});
