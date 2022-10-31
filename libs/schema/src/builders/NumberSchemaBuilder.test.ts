import { deepEqual } from '@cleverbrush/deep';

import { Schema } from '../schema.js';
import { number } from './NumberSchemaBuilder.js';

test('Clean', () => {
    const schema = number();
    expect(schema).toHaveProperty('type', 'number');
    expect(schema).toHaveProperty('isRequired', true);
    expect(schema).toHaveProperty('isNullable', false);
});

test('optional', () => {
    const schema = number().optional();
    expect(schema).toHaveProperty('type', 'number');
    expect(schema).toHaveProperty('isRequired', false);
});

test('optional - 2', () => {
    const schema = number().optional().required();
    expect(schema).toHaveProperty('type', 'number');
    expect(schema).toHaveProperty('isRequired', true);
});

test('optional - 3', () => {
    const schema1 = number();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired !== schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 4', () => {
    const schema1 = number().optional();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 5', () => {
    const schema1 = number();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 6', () => {
    const schema1 = number().optional();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(false);
});

test('optional - 7', () => {
    const schema1 = number().optional().required();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('nullable - 1', () => {
    const schema = number().nullable();
    expect(schema).toHaveProperty('type', 'number');
    expect(schema).toHaveProperty('isNullable', true);
});

test('nullable - 2', () => {
    const schema = number().nullable().notNullable();
    expect(schema).toHaveProperty('type', 'number');
    expect(schema).toHaveProperty('isNullable', false);
});

test('nullable - 3', () => {
    const schema1 = number();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable !== schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 4', () => {
    const schema1 = number().nullable();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 5', () => {
    const schema1 = number();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('nullable - 6', () => {
    const schema1 = number();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 7', () => {
    const schema1 = number().nullable();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('equals - 1', () => {
    const schema = number().equals(10);
    expect(schema._schema).toHaveProperty('type', 'number');
    expect(schema._schema).toHaveProperty('equals', 10);
});

test('equals - 2', () => {
    const schema = number();
    expect(schema._schema).toHaveProperty('type', 'number');
    expect(schema._schema).not.toHaveProperty('equals');
});

test('equals - 4', () => {
    const schema = number().equals(10).clearEquals();
    expect(schema._schema).toHaveProperty('type', 'number');
    expect(schema._schema).not.toHaveProperty('equals');
});

test('equals - 5', () => {
    const schema1 = number();
    const schema2 = schema1.equals(20);
    const equals = schema1._schema.equals === schema2._schema.equals;
    expect(equals).toEqual(false);
    expect(schema1._schema).not.toHaveProperty('equals');
    expect(schema2._schema).toHaveProperty('equals', 20);
});

test('equals - 6', () => {
    const schema1 = number().equals(20);
    const schema2 = schema1.equals(20);
    const equals = schema1._schema.equals === schema2._schema.equals;
    expect(equals).toEqual(true);
    expect(schema1._schema).toHaveProperty('equals', 20);
    expect(schema2._schema).toHaveProperty('equals', 20);
});

test('equals - 6', () => {
    const schema1 = number().equals(20);
    const schema2 = schema1.clearEquals();
    const equals = schema1._schema.equals === schema2._schema.equals;
    expect(equals).toEqual(false);
    expect(schema1._schema).toHaveProperty('equals', 20);
    expect(schema2._schema).not.toHaveProperty('equals');
});

test('equals - 7', () => {
    const schema1 = number().equals(20).clearEquals();
    const schema2 = schema1.clearEquals();
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(true);
});

test('min - 1', () => {
    const schema = number();
    expect(schema._schema).not.toHaveProperty('min');
});

test('min - 2', () => {
    const schema = number().min(20);
    expect(schema._schema).toHaveProperty('min', 20);
});

test('min - 3', () => {
    const schema = number().min(20).clearMin();
    expect(schema._schema).not.toHaveProperty('min');
});

test('min - 4', () => {
    const schema1 = number();
    const schema2 = schema1.min(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1._schema).not.toHaveProperty('min');
    expect(schema2._schema).toHaveProperty('min', 20);
});

test('min - 5', () => {
    const schema1 = number().min(20);
    const schema2 = schema1.min(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).toHaveProperty('min', 20);
    expect(schema2._schema).toHaveProperty('min', 20);
});

test('min - 6', () => {
    const schema1 = number().min(20);
    const schema2 = schema1.clearMin();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1._schema).toHaveProperty('min', 20);
    expect(schema2._schema).not.toHaveProperty('min');
});

test('min - 7', () => {
    const schema1 = number();
    const schema2 = schema1.clearMin();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).not.toHaveProperty('min');
    expect(schema2._schema).not.toHaveProperty('min');
});

test('min - 8', () => {
    const schema1 = number().clearMin();
    const schema2 = schema1.clearMin();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).not.toHaveProperty('min');
    expect(schema2._schema).not.toHaveProperty('min');
});

test('max - 1', () => {
    const schema = number();
    expect(schema._schema).not.toHaveProperty('max');
});

test('max - 2', () => {
    const schema = number().max(30);
    expect(schema._schema).toHaveProperty('max', 30);
});

test('max - 3', () => {
    const schema = number().max(30).clearMax();
    expect(schema._schema).not.toHaveProperty('max');
});

test('max - 4', () => {
    const schema1 = number();
    const schema2 = schema1.max(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1._schema).not.toHaveProperty('max');
    expect(schema2._schema).toHaveProperty('max', 20);
});

test('max - 5', () => {
    const schema1 = number().max(20);
    const schema2 = schema1.max(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).toHaveProperty('max', 20);
    expect(schema2._schema).toHaveProperty('max', 20);
});

test('max - 6', () => {
    const schema1 = number().max(20);
    const schema2 = schema1.clearMax();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1._schema).toHaveProperty('max', 20);
    expect(schema2._schema).not.toHaveProperty('max');
});

test('max - 7', () => {
    const schema1 = number();
    const schema2 = schema1.clearMax();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).not.toHaveProperty('max');
    expect(schema2._schema).not.toHaveProperty('max');
});

test('max - 8', () => {
    const schema1 = number().clearMax();
    const schema2 = schema1.clearMax();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).not.toHaveProperty('max');
    expect(schema2._schema).not.toHaveProperty('max');
});

test('min,max - 1', () => {
    const schema = number().min(20).max(30);
    expect(schema._schema).toHaveProperty('min', 20);
    expect(schema._schema).toHaveProperty('max', 30);
});

test('isInteger - 1', () => {
    const schema = number();
    expect(schema._schema).not.toHaveProperty('isInteger');
});

test('isInteger - 2', () => {
    const schema = number().isInteger();
    expect(schema._schema).toHaveProperty('isInteger', true);
});

test('isInteger - 3', () => {
    const schema = number().isInteger().canBeNotInteger();
    expect(schema._schema).not.toHaveProperty('isInteger');
});

test('isInteger - 4', () => {
    const schema1 = number();
    const schema2 = schema1.isInteger();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1._schema).not.toHaveProperty('isInteger');
    expect(schema2._schema).toHaveProperty('isInteger', true);
});

test('isInteger - 5', () => {
    const schema1 = number().isInteger();
    const schema2 = schema1.isInteger();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).toHaveProperty('isInteger', true);
    expect(schema2._schema).toHaveProperty('isInteger', true);
});

test('isInteger - 6', () => {
    const schema1 = number();
    const schema2 = schema1.canBeNotInteger();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).not.toHaveProperty('isInteger');
    expect(schema2._schema).not.toHaveProperty('isInteger');
});

test('isInteger - 7', () => {
    const schema1 = number().canBeNotInteger();
    const schema2 = schema1.canBeNotInteger();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).not.toHaveProperty('isInteger');
    expect(schema2._schema).not.toHaveProperty('isInteger');
});

test('NaN - 1', () => {
    const schema = number();
    expect(schema._schema).toHaveProperty('ensureNotNaN', true);
});

test('NaN - 2', () => {
    const schema = number().notNaN();
    expect(schema._schema).toHaveProperty('ensureNotNaN', true);
});

test('NaN - 3', () => {
    const schema = number().canBeNaN();
    expect(schema._schema).toHaveProperty('ensureNotNaN', false);
});

test('NaN - 4', () => {
    const schema1 = number();
    const schema2 = schema1.notNaN();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).toHaveProperty('ensureNotNaN', true);
    expect(schema2._schema).toHaveProperty('ensureNotNaN', true);
});

test('NaN - 5', () => {
    const schema1 = number().notNaN();
    const schema2 = schema1.notNaN();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).toHaveProperty('ensureNotNaN', true);
    expect(schema2._schema).toHaveProperty('ensureNotNaN', true);
});

test('NaN - 6', () => {
    const schema1 = number();
    const schema2 = schema1.canBeNaN();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1._schema).toHaveProperty('ensureNotNaN', true);
    expect(schema2._schema).toHaveProperty('ensureNotNaN', false);
});

test('NaN - 7', () => {
    const schema1 = number().canBeNaN();
    const schema2 = schema1.canBeNaN();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).toHaveProperty('ensureNotNaN', false);
    expect(schema2._schema).toHaveProperty('ensureNotNaN', false);
});

test('NaN - 8', () => {
    const schema1 = number().canBeNaN();
    const schema2 = schema1.notNaN();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1._schema).toHaveProperty('ensureNotNaN', false);
    expect(schema2._schema).toHaveProperty('ensureNotNaN', true);
});

test('Finite - 1', () => {
    const schema = number();
    expect(schema._schema).toHaveProperty('ensureIsFinite', true);
});

test('Finite - 2', () => {
    const schema = number().isFinite();
    expect(schema._schema).toHaveProperty('ensureIsFinite', true);
});

test('Finite - 3', () => {
    const schema = number().canBeInfinite();
    expect(schema._schema).toHaveProperty('ensureIsFinite', false);
});

test('Finite - 4', () => {
    const schema1 = number();
    const schema2 = schema1.isFinite();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).toHaveProperty('ensureIsFinite', true);
    expect(schema2._schema).toHaveProperty('ensureIsFinite', true);
});

test('Finite - 5', () => {
    const schema1 = number().isFinite();
    const schema2 = schema1.isFinite();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).toHaveProperty('ensureIsFinite', true);
    expect(schema2._schema).toHaveProperty('ensureIsFinite', true);
});

test('Finite - 6', () => {
    const schema1 = number();
    const schema2 = schema1.canBeInfinite();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1._schema).toHaveProperty('ensureIsFinite', true);
    expect(schema2._schema).toHaveProperty('ensureIsFinite', false);
});

test('Finite - 7', () => {
    const schema1 = number().canBeInfinite();
    const schema2 = schema1.canBeInfinite();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1._schema).toHaveProperty('ensureIsFinite', false);
    expect(schema2._schema).toHaveProperty('ensureIsFinite', false);
});

test('Finite - 8', () => {
    const schema1 = number().canBeInfinite();
    const schema2 = schema1.isFinite();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1._schema).toHaveProperty('ensureIsFinite', false);
    expect(schema2._schema).toHaveProperty('ensureIsFinite', true);
});

test('Clone', () => {
    const schema1 = number()
        .canBeInfinite()
        .min(20)
        .max(30)
        .addValidator(() => ({ valid: true }))
        .canBeNotInteger()
        .canBeInfinite()
        .canBeNaN();
    const schema2 = schema1.clone();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const equal2 = deepEqual(
        (schema1 as any)._schema,
        (schema2 as any)._schema
    );
    expect(equal2).toEqual(true);
});
