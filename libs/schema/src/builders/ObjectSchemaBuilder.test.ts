import { object } from './ObjectSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { union } from './UnionSchemaBuilder.js';
import { date } from './DateSchemaBuilder.js';
import { InferType } from './SchemaBuilder.js';

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
    expect(errors?.findIndex((e) => e.path === '$.first')).not.toEqual(-1);

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

    const {
        valid,
        object: result,
        errors
    } = await schema.validate({
        first: '123' as any
    });

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    expect(errors?.length).toEqual(1);
    expect(errors?.findIndex((e) => e.path === '$.first')).not.toEqual(-1);
    if (typeof result !== 'undefined') {
        // eslint-disable-next-line
        // const typeTest: Expect<Equal<{ first?: number }, typeof result>> = true;
    }
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
    if (typeof result !== 'undefined') {
        // eslint-disable-next-line
        // const typeTest: Expect<Equal<{ first?: number }, typeof result>> = true;
    }
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
    }).toThrowError();

    expect(() => {
        (schema1 as any).addProps(null);
    }).toThrowError();

    expect(() => {
        schema1.addProps({
            first: string()
        });
    }).toThrowError();

    expect(() => {
        schema1.addProps({
            second: 'not SchemaBuilder'
        } as any);
    }).toThrowError();
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
        expect(errors[0].path).toEqual('$.nested.num');
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
        object: objResult
    } = await schema.validate(objToCheck);

    const spec = schema.introspect();

    expect(spec.acceptUnknownProps).toEqual(false);

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    if (Array.isArray(errors)) {
        expect(errors[0].path).toEqual('$');
    }
    expect(objResult).toBeUndefined();
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
        expect(errors[0].path).toEqual('$');
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
        expect(errors[0].path).toEqual('$.nested');
    }
    expect(objResult).toBeUndefined();
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

    const {
        valid,
        errors,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        object: objResult
    } = await schema.validate(objToValidate, {
        doNotStopOnFirstError: true
    });

    expect(valid).toEqual(false);
    expect(Array.isArray(errors)).toEqual(true);
    expect(errors?.length).toEqual(2);
    expect(errors?.find((e) => e.path === '$.first')).toBeDefined();
    expect(errors?.find((e) => e.path === '$.second')).toBeDefined();
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
    expect(errors?.find((e) => e.path === '$.first')).toBeDefined();
    expect(errors?.find((e) => e.path === '$.second')).toBeDefined();
    expect(errors?.find((e) => e.path === '$.nested')).toBeDefined();
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
    }).toThrowError();

    expect(() => {
        schema1.omit('');
    }).toThrowError();

    expect(() => {
        schema1.omit([]);
    }).toThrowError();

    expect(() => {
        schema1.omit([1 as any]);
    }).toThrowError();

    expect(() => {
        schema1.omit(['first', 'fff']);
    }).toThrowError();
});

test('Preprocessors - 1', async () => {
    const schema1 = object({
        first: number(),
        second: number()
    });

    const schema2 = schema1.addPreprocessor((input) => ({
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
        expect(errors[0].path).toEqual('$($preprocessors[0])');
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

    const schema2 = schema1.addValidator((input) =>
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

    const schema2 = schema1.addValidator((input) =>
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
        expect(errors[0].path).toEqual('$($validators[0])');
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
        expect(errors[0]).toHaveProperty('path', '$($validators[0])');
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
        .addPreprocessor((value) => ({
            ...value,
            second: value.second < 10 ? value.second + 9 : value.second
        }))
        .addValidator((value) =>
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
            .addPreprocessor((value) => (value % 3 === 0 ? value + 9 : value))
    }).addPreprocessor((value) => ({
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
            .addValidator((value) =>
                value % 3 !== 0
                    ? {
                          valid: false,
                          errors: [{ message: 'must divide by 3' }]
                      }
                    : { valid: true }
            )
    }).addValidator((value) =>
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
            expect(errors[0]).toHaveProperty('path', '$($validators[0])');
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
            expect(errors[0]).toHaveProperty(
                'path',
                '$.second($validators[0])'
            );
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

    const schema2 = schema1.modifyPropSchema('first', (first) =>
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
    }).toThrowError();

    expect(() => {
        object({
            first: string(),
            second: number()
        }).modifyPropSchema('third' as any, () => string());
    }).toThrowError();

    expect(() => {
        object({
            first: string(),
            second: number()
        }).modifyPropSchema('second', 'string' as any);
    }).toThrowError();

    expect(() => {
        object({
            first: string(),
            second: number()
        }).modifyPropSchema('second' as any, () => 'some str' as any);
    }).toThrowError();
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
    }).toThrowError();

    expect(() => {
        schema1.partial([1 as any]);
    }).toThrowError();

    expect(() => {
        schema1.partial(['first', 'sss' as any]);
    }).toThrowError();

    expect(() => {
        schema1.partial(123 as any);
    }).toThrowError();
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

    const schemaPickFrom = object({
        first: number(),
        /**
         * some comment
         */
        third: number(),
        fourth: number()
    });

    expect(() => {
        (schema1 as any).pick();
    }).toThrowError();

    expect(() => {
        schema1.pick('' as any);
    }).toThrowError();

    expect(() => {
        schema1.pick('ssss' as any);
    }).toThrowError();

    expect(() => {
        schema1.pick([]);
    }).toThrowError();

    expect(() => {
        schema1.pick([1 as any]);
    }).toThrowError();

    expect(() => {
        schema1.pick(['first', 'sss' as any]);
    }).toThrowError();

    expect(() => {
        schema1.pick(object({ fff: number() }));
    }).toThrowError();
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
    }).addPreprocessor((obj) =>
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
        .addPreprocessor((obj) =>
            obj && obj.num % 2 === 0 ? { num: obj.num + 1 } : { num: 0 }
        )
        .addValidator((obj) =>
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
    const preprocessDateInterval = (value) => {
        if (typeof value === 'undefined') return value;

        if (typeof value === 'string') {
            try {
                return {
                    from: new Date(2022, 0, 1),
                    to: new Date(2023, 0, 1)
                };
            } catch (e) {
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
    }).addPreprocessor((value) => {
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
    const schema = object({ a: string() }).addValidator((val) => ({
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
    }).toThrowError();
});

test('validator not function', async () => {
    expect(() => {
        object({ a: string() }).addValidator('some str' as any);
    }).toThrowError();
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
    }).toThrowError();

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
    }).toThrowError();

    expect(() => {
        schema1.addProp('first', number());
    }).toThrowError();

    expect(() => {
        schema1.addProp('second', 'sss' as any);
    }).toThrowError();
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
            path: '$.sub',
            doNotStopOnFirstError: true
        }
    );

    expect(valid).toEqual(false);
    expect(
        Array.isArray(errors) &&
            errors.length === 2 &&
            errors[0].path === '$.sub.first' &&
            errors[1].path === '$.sub'
    ).toEqual(true);
});
