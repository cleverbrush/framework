import { expectType } from 'tsd';
import { any } from './AnySchemaBuilder.js';
import { InferType } from './SchemaBuilder.js';

test('Any checks', async () => {
    const schema = any();

    const typeCheck: InferType<typeof schema> = null;
    expectType<any>(typeCheck);

    {
        const obj = null;
        const { valid, object: result, errors } = await schema.validate(obj);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = undefined;
        const { valid, object: result, errors } = await schema.validate(obj);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = 0;
        const { valid, object: result, errors } = await schema.validate(obj);
        expect(valid).toEqual(true);
        expect(result).toEqual(0);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 400;
        const { valid, object: result, errors } = await schema.validate(obj);
        expect(valid).toEqual(true);
        expect(result).toEqual(400);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 'some string';
        const { valid, object: result, errors } = await schema.validate(obj);
        expect(valid).toEqual(true);
        expect(result).toEqual('some string');
        expect(errors).not.toBeDefined();
    }

    {
        const obj = { obj: { nested: 'val' } };
        const { valid, object: result, errors } = await schema.validate(obj);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }
});

test('Optional checks', async () => {
    const schema1 = any();
    const schema2 = schema1.optional();

    expect(schema1 === (schema2 as any)).toEqual(false);

    const typeCheck: InferType<typeof schema2> = new Date();
    expectType<any>(typeCheck);

    {
        const obj = null;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = undefined;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 0;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(0);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 400;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(400);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 'some string';
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual('some string');
        expect(errors).not.toBeDefined();
    }

    {
        const obj = { obj: { nested: 'val' } };
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }
});

test('Required checks', async () => {
    const schema1 = any().optional().hasType<Date>();
    const schema2 = schema1.required();

    expect(schema1 === (schema2 as any)).toEqual(false);

    const typeCheck: InferType<typeof schema2> = new Date();
    expectType<Date>(typeCheck);

    {
        const obj = null;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = undefined;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = 0;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(0);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 400;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(400);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 'some string';
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual('some string');
        expect(errors).not.toBeDefined();
    }

    {
        const obj = { obj: { nested: 'val' } };
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }
});
test('Has type checks', async () => {
    const schema1 = any();
    const schema2 = schema1.hasType<Date>();

    expect(schema1 === (schema2 as any)).toEqual(false);

    const typeCheck: InferType<typeof schema2> = new Date();
    expectType<Date>(typeCheck);

    {
        const obj = null;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = undefined;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = 0;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(0);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 400;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(400);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 'some string';
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual('some string');
        expect(errors).not.toBeDefined();
    }

    {
        const obj = { obj: { nested: 'val' } };
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }
});

test('Preprocessors', async () => {
    const schema1 = any().hasType<Date>();
    const schema2 = schema1
        .addPreprocessor((value: any) => {
            if (typeof value === 'undefined') return value;
            if (typeof value === 'string') {
                const time = Date.parse(value);
                if (Number.isNaN(time)) return value;
                return new Date(time);
            }
            return value;
        })
        .addValidator((value) => {
            if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
                return {
                    valid: false,
                    errors: [{ message: 'must be a valid date' }]
                };
            }
            return { valid: true };
        });

    expect(schema1 === (schema2 as any)).toEqual(false);

    const typeCheck: InferType<typeof schema2> = new Date();
    expectType<Date>(typeCheck);

    {
        const obj = null;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = undefined;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = 0;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = 400;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = 'some string';
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = { obj: { nested: 'val' } };
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const now = new Date();
        const obj = now.toJSON();
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(true);
        expect(result?.getTime() === now.getTime()).toEqual(true);
        expect(errors).not.toBeDefined();
    }
});
