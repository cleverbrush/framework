import { deepEqual } from '@cleverbrush/deep';

import { Schema } from '../schema.js';
import { boolean } from './BooleanSchemaBuilder.js';

test('Clean', () => {
    const schema = boolean();
    expect(schema).toHaveProperty('type', 'boolean');
    expect(schema).toHaveProperty('isRequired', true);
    expect(schema).toHaveProperty('isNullable', false);
});

test('optional', () => {
    const schema = boolean().optional();
    expect(schema).toHaveProperty('type', 'boolean');
    expect(schema).toHaveProperty('isRequired', false);
});

test('optional - 2', () => {
    const schema = boolean().optional().required();
    expect(schema).toHaveProperty('type', 'boolean');
    expect(schema).toHaveProperty('isRequired', true);
});

test('optional - 3', () => {
    const schema1 = boolean();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired !== schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 4', () => {
    const schema1 = boolean().optional();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 5', () => {
    const schema1 = boolean();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 6', () => {
    const schema1 = boolean().optional();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(false);
});

test('optional - 7', () => {
    const schema1 = boolean().optional().required();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('nullable', () => {
    const schema = boolean().nullable();
    expect(schema).toHaveProperty('type', 'boolean');
    expect(schema).toHaveProperty('isNullable', true);
});

test('nullable - 2', () => {
    const schema = boolean().nullable().notNullable();
    expect(schema).toHaveProperty('type', 'boolean');
    expect(schema).toHaveProperty('isNullable', false);
});

test('nullable - 3', () => {
    const schema1 = boolean();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable !== schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 4', () => {
    const schema1 = boolean().nullable();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 5', () => {
    const schema1 = boolean();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('nullable - 6', () => {
    const schema1 = boolean();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 7', () => {
    const schema1 = boolean().nullable();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('equals - 1', () => {
    const schema = boolean().equalsTo(true);
    expect(schema).toHaveProperty('type', 'boolean');
    expect(schema).toHaveProperty('equals', true);
});

test('equals - 2', () => {
    const schema = boolean().equalsTo(false);
    expect(schema).toHaveProperty('type', 'boolean');
    expect(schema).toHaveProperty('equals', false);
});

test('equals - 3', () => {
    const schema = boolean();
    expect(schema).toHaveProperty('type', 'boolean');
    expect(schema).not.toHaveProperty('equals');
});

test('equals - 4', () => {
    const schema = boolean().equalsTo(true).clearEqualsTo();
    expect(schema).toHaveProperty('type', 'boolean');
    expect(schema).not.toHaveProperty('equals');
});

test('equals - 5', () => {
    const schema1 = boolean().equalsTo(true);
    const schema2 = schema1.equalsTo(true);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('equals', true);
    expect(schema2).toHaveProperty('equals', true);
});

test('equals - 6', () => {
    const schema1 = boolean();
    const schema2 = schema1.equalsTo(true);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).not.toHaveProperty('equals');
    expect(schema2).toHaveProperty('equals', true);
});

test('equals - 7', () => {
    const schema1 = boolean();
    const schema2 = schema1.clearEqualsTo();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).not.toHaveProperty('equals');
    expect(schema2).not.toHaveProperty('equals');
});

test('equals - 8', () => {
    const schema1 = boolean().clearEqualsTo();
    const schema2 = schema1.equalsTo(false);
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema1).not.toHaveProperty('equals');
    expect(schema2).toHaveProperty('equals', false);
});

test('Clone', () => {
    const schema1 = boolean()
        .addValidator(() => ({ valid: true }))
        .equalsTo(true);
    const schema2 = schema1.clone();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const equal2 = deepEqual(
        (schema1 as any)._schema,
        (schema2 as any)._schema
    );
    expect(equal2).toEqual(true);
});
