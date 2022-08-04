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
    const schema = number().equalsTo(10);
    expect(schema).toHaveProperty('type', 'number');
    expect(schema).toHaveProperty('equals', 10);
});

test('equals - 2', () => {
    const schema = number();
    expect(schema).toHaveProperty('type', 'number');
    expect(schema).not.toHaveProperty('equals');
});

test('equals - 4', () => {
    const schema = number().equalsTo(10).clearEqualsTo();
    expect(schema).toHaveProperty('type', 'number');
    expect(schema).not.toHaveProperty('equals');
});

test('equals - 5', () => {
    const schema1 = number();
    const schema2 = schema1.equalsTo(20);
    const equals = (schema1 as any).equals === schema2.equals;
    expect(equals).toEqual(false);
    expect(schema1).not.toHaveProperty('equals');
    expect(schema2).toHaveProperty('equals', 20);
});

test('equals - 6', () => {
    const schema1 = number().equalsTo(20);
    const schema2 = schema1.equalsTo(20);
    const equals = (schema1 as any).equals === schema2.equals;
    expect(equals).toEqual(true);
    expect(schema1).toHaveProperty('equals', 20);
    expect(schema2).toHaveProperty('equals', 20);
});

test('equals - 6', () => {
    const schema1 = number().equalsTo(20);
    const schema2 = schema1.clearEqualsTo();
    const equals = (schema1 as any).equals === schema2.equals;
    expect(equals).toEqual(false);
    expect(schema1).toHaveProperty('equals', 20);
    expect(schema2).not.toHaveProperty('equals');
});

test('equals - 7', () => {
    const schema1 = number().equalsTo(20).clearEqualsTo();
    const schema2 = schema1.clearEqualsTo();
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(true);
});

test('min - 1', () => {
    const schema = number();
    expect(schema).not.toHaveProperty('min');
});

test('min - 2', () => {
    const schema = number().hasMinValue(20);
    expect(schema).toHaveProperty('min', 20);
});

test('min - 3', () => {
    const schema = number().hasMinValue(20).clearMinValue();
    expect(schema).not.toHaveProperty('min');
});

test('min - 4', () => {
    const schema1 = number();
    const schema2 = schema1.hasMinValue(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).not.toHaveProperty('min');
    expect(schema2).toHaveProperty('min', 20);
});

test('min - 5', () => {
    const schema1 = number().hasMinValue(20);
    const schema2 = schema1.hasMinValue(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('min', 20);
    expect(schema2).toHaveProperty('min', 20);
});

test('min - 6', () => {
    const schema1 = number().hasMinValue(20);
    const schema2 = schema1.clearMinValue();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).toHaveProperty('min', 20);
    expect(schema2).not.toHaveProperty('min');
});

test('min - 7', () => {
    const schema1 = number();
    const schema2 = schema1.clearMinValue();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('min');
    expect(schema2).not.toHaveProperty('min');
});

test('min - 8', () => {
    const schema1 = number().clearMinValue();
    const schema2 = schema1.clearMinValue();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('min');
    expect(schema2).not.toHaveProperty('min');
});

test('max - 1', () => {
    const schema = number();
    expect(schema).not.toHaveProperty('max');
});

test('max - 2', () => {
    const schema = number().hasMaxValue(30);
    expect(schema).toHaveProperty('max', 30);
});

test('max - 3', () => {
    const schema = number().hasMaxValue(30).clearMaxValue();
    expect(schema).not.toHaveProperty('max');
});

test('max - 4', () => {
    const schema1 = number();
    const schema2 = schema1.hasMaxValue(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).not.toHaveProperty('max');
    expect(schema2).toHaveProperty('max', 20);
});

test('max - 5', () => {
    const schema1 = number().hasMaxValue(20);
    const schema2 = schema1.hasMaxValue(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('max', 20);
    expect(schema2).toHaveProperty('max', 20);
});

test('max - 6', () => {
    const schema1 = number().hasMaxValue(20);
    const schema2 = schema1.clearMaxValue();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).toHaveProperty('max', 20);
    expect(schema2).not.toHaveProperty('max');
});

test('max - 7', () => {
    const schema1 = number();
    const schema2 = schema1.clearMaxValue();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('max');
    expect(schema2).not.toHaveProperty('max');
});

test('max - 8', () => {
    const schema1 = number().clearMaxValue();
    const schema2 = schema1.clearMaxValue();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('max');
    expect(schema2).not.toHaveProperty('max');
});

test('min,max - 1', () => {
    const schema = number().hasMinValue(20).hasMaxValue(30);
    expect(schema).toHaveProperty('min', 20);
    expect(schema).toHaveProperty('max', 30);
});

test('isInteger - 1', () => {
    const schema = number();
    expect(schema).not.toHaveProperty('isInteger');
});

test('isInteger - 2', () => {
    const schema = number().ensureIsInteger();
    expect(schema).toHaveProperty('isInteger', true);
});

test('isInteger - 3', () => {
    const schema = number().ensureIsInteger().notEnsureIsInteger();
    expect(schema).not.toHaveProperty('isInteger');
});

test('isInteger - 4', () => {
    const schema1 = number();
    const schema2 = schema1.ensureIsInteger();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).not.toHaveProperty('isInteger');
    expect(schema2).toHaveProperty('isInteger', true);
});

test('isInteger - 5', () => {
    const schema1 = number().ensureIsInteger();
    const schema2 = schema1.ensureIsInteger();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('isInteger', true);
    expect(schema2).toHaveProperty('isInteger', true);
});

test('isInteger - 6', () => {
    const schema1 = number();
    const schema2 = schema1.notEnsureIsInteger();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('isInteger');
    expect(schema2).not.toHaveProperty('isInteger');
});

test('isInteger - 7', () => {
    const schema1 = number().notEnsureIsInteger();
    const schema2 = schema1.notEnsureIsInteger();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('isInteger');
    expect(schema2).not.toHaveProperty('isInteger');
});

test('NaN - 1', () => {
    const schema = number();
    expect(schema).toHaveProperty('ensureNotNaN', true);
});

test('NaN - 2', () => {
    const schema = number().notNaN();
    expect(schema).toHaveProperty('ensureNotNaN', true);
});

test('NaN - 3', () => {
    const schema = number().canBeNaN();
    expect(schema).toHaveProperty('ensureNotNaN', false);
});

test('NaN - 4', () => {
    const schema1 = number();
    const schema2 = schema1.notNaN();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('ensureNotNaN', true);
    expect(schema2).toHaveProperty('ensureNotNaN', true);
});

test('NaN - 5', () => {
    const schema1 = number().notNaN();
    const schema2 = schema1.notNaN();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('ensureNotNaN', true);
    expect(schema2).toHaveProperty('ensureNotNaN', true);
});

test('NaN - 6', () => {
    const schema1 = number();
    const schema2 = schema1.canBeNaN();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).toHaveProperty('ensureNotNaN', true);
    expect(schema2).toHaveProperty('ensureNotNaN', false);
});

test('NaN - 7', () => {
    const schema1 = number().canBeNaN();
    const schema2 = schema1.canBeNaN();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('ensureNotNaN', false);
    expect(schema2).toHaveProperty('ensureNotNaN', false);
});

test('NaN - 8', () => {
    const schema1 = number().canBeNaN();
    const schema2 = schema1.notNaN();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).toHaveProperty('ensureNotNaN', false);
    expect(schema2).toHaveProperty('ensureNotNaN', true);
});

test('Finite - 1', () => {
    const schema = number();
    expect(schema).toHaveProperty('ensureIsFinite', true);
});

test('Finite - 2', () => {
    const schema = number().isFinite();
    expect(schema).toHaveProperty('ensureIsFinite', true);
});

test('Finite - 3', () => {
    const schema = number().canBeInfinite();
    expect(schema).toHaveProperty('ensureIsFinite', false);
});

test('Finite - 4', () => {
    const schema1 = number();
    const schema2 = schema1.isFinite();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('ensureIsFinite', true);
    expect(schema2).toHaveProperty('ensureIsFinite', true);
});

test('Finite - 5', () => {
    const schema1 = number().isFinite();
    const schema2 = schema1.isFinite();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('ensureIsFinite', true);
    expect(schema2).toHaveProperty('ensureIsFinite', true);
});

test('Finite - 6', () => {
    const schema1 = number();
    const schema2 = schema1.canBeInfinite();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).toHaveProperty('ensureIsFinite', true);
    expect(schema2).toHaveProperty('ensureIsFinite', false);
});

test('Finite - 7', () => {
    const schema1 = number().canBeInfinite();
    const schema2 = schema1.canBeInfinite();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('ensureIsFinite', false);
    expect(schema2).toHaveProperty('ensureIsFinite', false);
});

test('Finite - 8', () => {
    const schema1 = number().canBeInfinite();
    const schema2 = schema1.isFinite();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).toHaveProperty('ensureIsFinite', false);
    expect(schema2).toHaveProperty('ensureIsFinite', true);
});

test('Clone', () => {
    const schema1 = number()
        .canBeInfinite()
        .hasMinValue(20)
        .hasMaxValue(30)
        .addValidator(() => ({ valid: true }))
        .notEnsureIsInteger()
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
