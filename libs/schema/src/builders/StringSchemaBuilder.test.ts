import { deepEqual } from '@cleverbrush/deep';

import { Schema } from '../schema.js';
import { string } from './StringSchemaBuilder.js';

test('Clean', () => {
    const schema = string();
    expect(schema).toHaveProperty('type', 'string');
    expect(schema).toHaveProperty('isRequired', true);
    expect(schema).toHaveProperty('isNullable', false);
});

test('optional', () => {
    const schema = string().optional();
    expect(schema).toHaveProperty('type', 'string');
    expect(schema).toHaveProperty('isRequired', false);
});

test('optional - 2', () => {
    const schema = string().optional().required();
    expect(schema).toHaveProperty('type', 'string');
    expect(schema).toHaveProperty('isRequired', true);
});

test('optional - 3', () => {
    const schema1 = string();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired !== schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 4', () => {
    const schema1 = string().optional();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 5', () => {
    const schema1 = string();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 6', () => {
    const schema1 = string().optional();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(false);
});

test('optional - 7', () => {
    const schema1 = string().optional().required();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('nullable - 1', () => {
    const schema = string().nullable();
    expect(schema).toHaveProperty('type', 'string');
    expect(schema).toHaveProperty('isNullable', true);
});

test('nullable - 2', () => {
    const schema = string().nullable().notNullable();
    expect(schema).toHaveProperty('type', 'string');
    expect(schema).toHaveProperty('isNullable', false);
});

test('nullable - 3', () => {
    const schema1 = string();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable !== schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 4', () => {
    const schema1 = string().nullable();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 5', () => {
    const schema1 = string();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('nullable - 6', () => {
    const schema1 = string();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 7', () => {
    const schema1 = string().nullable();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('equals - 1', () => {
    const schema = string().equalsTo('abc');
    expect(schema).toHaveProperty('type', 'string');
    expect(schema).toHaveProperty('equals', 'abc');
});

test('equals - 2', () => {
    const schema = string();
    expect(schema).toHaveProperty('type', 'string');
    expect(schema).not.toHaveProperty('equals');
});

test('equals - 4', () => {
    const schema = string().equalsTo('abcd').clearEqualsTo();
    expect(schema).toHaveProperty('type', 'string');
    expect(schema).not.toHaveProperty('equals');
});

test('equals - 5', () => {
    const schema1 = string();
    const schema2 = schema1.equalsTo('abcde');
    const equals = (schema1 as any).equals === schema2.equals;
    expect(equals).toEqual(false);
    expect(schema1).not.toHaveProperty('equals');
    expect(schema2).toHaveProperty('equals', 'abcde');
});

test('equals - 6', () => {
    const schema1 = string().equalsTo('abcdef');
    const schema2 = schema1.equalsTo('abcdef');
    const equals = (schema1 as any).equals === schema2.equals;
    expect(equals).toEqual(true);
    expect(schema1).toHaveProperty('equals', 'abcdef');
    expect(schema2).toHaveProperty('equals', 'abcdef');
});

test('equals - 6', () => {
    const schema1 = string().equalsTo('abcdefg');
    const schema2 = schema1.clearEqualsTo();
    const equals = (schema1 as any).equals === schema2.equals;
    expect(equals).toEqual(false);
    expect(schema1).toHaveProperty('equals', 'abcdefg');
    expect(schema2).not.toHaveProperty('equals');
});

test('equals - 7', () => {
    const schema1 = string().equalsTo('abcdefgh').clearEqualsTo();
    const schema2 = schema1.clearEqualsTo();
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(true);
});

test('minLength - 1', () => {
    const schema = string();
    expect(schema).not.toHaveProperty('minLength');
});

test('minLength - 2', () => {
    const schema = string().hasMinLength(20);
    expect(schema).toHaveProperty('minLength', 20);
});

test('minLength - 3', () => {
    const schema = string().hasMinLength(20).clearMinLength();
    expect(schema).not.toHaveProperty('minLength');
});

test('minLength - 4', () => {
    const schema1 = string();
    const schema2 = schema1.hasMinLength(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).not.toHaveProperty('minLength');
    expect(schema2).toHaveProperty('minLength', 20);
});

test('minLength - 5', () => {
    const schema1 = string().hasMinLength(20);
    const schema2 = schema1.hasMinLength(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('minLength', 20);
    expect(schema2).toHaveProperty('minLength', 20);
});

test('minLength - 6', () => {
    const schema1 = string().hasMinLength(20);
    const schema2 = schema1.clearMinLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).toHaveProperty('minLength', 20);
    expect(schema2).not.toHaveProperty('minLength');
});

test('minLength - 7', () => {
    const schema1 = string();
    const schema2 = schema1.clearMinLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('minLength');
    expect(schema2).not.toHaveProperty('minLength');
});

test('minLength - 8', () => {
    const schema1 = string().clearMinLength();
    const schema2 = schema1.clearMinLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('minLength');
    expect(schema2).not.toHaveProperty('minLength');
});

test('maxLength - 1', () => {
    const schema = string();
    expect(schema).not.toHaveProperty('maxLength');
});

test('maxLength - 2', () => {
    const schema = string().hasMaxLength(30);
    expect(schema).toHaveProperty('maxLength', 30);
});

test('maxLength - 3', () => {
    const schema = string().hasMaxLength(30).clearMaxLength();
    expect(schema).not.toHaveProperty('maxLength');
});

test('maxLength - 4', () => {
    const schema1 = string();
    const schema2 = schema1.hasMaxLength(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).not.toHaveProperty('maxLength');
    expect(schema2).toHaveProperty('maxLength', 20);
});

test('maxLength - 5', () => {
    const schema1 = string().hasMaxLength(20);
    const schema2 = schema1.hasMaxLength(20);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('maxLength', 20);
    expect(schema2).toHaveProperty('maxLength', 20);
});

test('maxLength - 6', () => {
    const schema1 = string().hasMaxLength(20);
    const schema2 = schema1.clearMaxLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).toHaveProperty('maxLength', 20);
    expect(schema2).not.toHaveProperty('maxLength');
});

test('maxLength - 7', () => {
    const schema1 = string();
    const schema2 = schema1.clearMaxLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('maxLength');
    expect(schema2).not.toHaveProperty('maxLength');
});

test('maxLength - 8', () => {
    const schema1 = string().clearMaxLength();
    const schema2 = schema1.clearMaxLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('maxLength');
    expect(schema2).not.toHaveProperty('maxLength');
});

test('minLength,max - 1', () => {
    const schema = string().hasMinLength(20).hasMaxLength(30);
    expect(schema).toHaveProperty('minLength', 20);
    expect(schema).toHaveProperty('maxLength', 30);
});

test('Clone', () => {
    const schema1 = string()
        .hasMinLength(20)
        .hasMaxLength(30)
        .addValidator(() => ({ valid: true }));
    const schema2 = schema1.clone();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const equal2 = deepEqual(
        (schema1 as any)._schema,
        (schema2 as any)._schema
    );
    expect(equal2).toEqual(true);
});
