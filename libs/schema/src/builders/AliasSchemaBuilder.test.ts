import { Schema } from '../schema.js';
import { alias } from './AliasSchemaBuilder.js';

test('Clean', () => {
    const schema = alias('Something');
    expect(schema).toHaveProperty('type', 'alias');
    expect(schema).toHaveProperty('schemaName', 'Something');
    expect(schema).toHaveProperty('isRequired', true);
    expect(schema).toHaveProperty('isNullable', false);
});

test('optional', () => {
    const schema = alias('Something').optional();
    expect(schema).toHaveProperty('type', 'alias');
    expect(schema).toHaveProperty('isRequired', false);
});

test('optional - 2', () => {
    const schema = alias('Something').optional().required();
    expect(schema).toHaveProperty('type', 'alias');
    expect(schema).toHaveProperty('isRequired', true);
});

test('optional - 3', () => {
    const schema1 = alias('Something');
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired !== schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 4', () => {
    const schema1 = alias('Something').optional();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 5', () => {
    const schema1 = alias('Something');
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 6', () => {
    const schema1 = alias('Something').optional();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(false);
});

test('optional - 7', () => {
    const schema1 = alias('Something').optional().required();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('nullable', () => {
    const schema = alias('Something').nullable();
    expect(schema).toHaveProperty('type', 'alias');
    expect(schema).toHaveProperty('isNullable', true);
});

test('nullable - 2', () => {
    const schema = alias('Something').nullable().notNullable();
    expect(schema).toHaveProperty('type', 'alias');
    expect(schema).toHaveProperty('isNullable', false);
});

test('nullable - 3', () => {
    const schema1 = alias('Something');
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable !== schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 4', () => {
    const schema1 = alias('Something').nullable();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 5', () => {
    const schema1 = alias('Something');
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('nullable - 6', () => {
    const schema1 = alias('Something');
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 7', () => {
    const schema1 = alias('Something').nullable();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});
