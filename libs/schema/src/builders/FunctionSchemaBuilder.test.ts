import { expectType } from 'tsd';
import { func } from './FunctionSchemaBuilder.js';
import { InferType } from './SchemaBuilder.js';

test('Func checks', async () => {
    const schema = func();

    const typeCheck: InferType<typeof schema> = () => null;
    expectType<(...args: any[]) => any>(typeCheck);

    {
        const obj = null;
        const {
            valid,
            object: result,
            errors
        } = await schema.validate(obj as any);
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
        } = await schema.validate(obj as any);
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
        } = await schema.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = () => 10;
        const { valid, object: result, errors } = await schema.validate(obj);
        expect(valid).toEqual(true);
        expect(result).toEqual(obj);
        expect(errors).not.toBeDefined();
    }

    {
        const obj = 'some string';
        const {
            valid,
            object: result,
            errors
        } = await schema.validate(obj as any);
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
        } = await schema.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).not.toBeDefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Optional checks', async () => {
    const schema1 = func();
    const schema2 = schema1.optional();

    expect(schema1 === (schema2 as any)).toEqual(false);

    const typeCheck: InferType<typeof schema2> = () => 1;
    expectType<(...args: any[]) => any | undefined>(typeCheck);

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
        const obj = () => 342;
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
        const obj = 400;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});

test('Required checks', async () => {
    const schema1 = func().optional().hasType<Date>();
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
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }

    {
        const obj = () => true;
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
    const schema1 = func();
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
        const obj = () => 445;
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
        const obj = 400;
        const {
            valid,
            object: result,
            errors
        } = await schema2.validate(obj as any);
        expect(valid).toEqual(false);
        expect(result).toBeUndefined();
        expect(Array.isArray(errors) && errors.length > 0).toEqual(true);
    }
});
