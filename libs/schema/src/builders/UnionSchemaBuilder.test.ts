import { union } from './UnionSchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';

test('Clean', () => {
    const schema = union(string());
    expect(schema).toHaveProperty('type', 'union');
    expect(schema).toHaveProperty('variants');
    expect(schema).toHaveProperty('variants.length', 1);
    expect(schema).toHaveProperty('isRequired', true);
    expect(schema).toHaveProperty('isNullable', false);
});

test('optional', () => {
    const schema = union(number()).optional();
    expect(schema).toHaveProperty('isRequired', false);
});

test('optional - 2', () => {
    const schema = union(number()).optional().required();
    expect(schema).toHaveProperty('isRequired', true);
});

test('optional - 3', () => {
    const schema1 = union(number());
    const schema2 = schema1.optional();
    const e = (schema1 as any) === schema2;
    const isRequiredEqual = (schema1 as any).isRequired !== schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 4', () => {
    const schema1 = union(number()).optional();
    const schema2 = schema1.optional();
    const e = (schema1 as any) === schema2;
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 5', () => {
    const schema1 = union(number());
    const schema2 = schema1.required();
    const e = (schema1 as any) === schema2;
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 6', () => {
    const schema1 = union(number()).optional();
    const schema2 = schema1.required();
    const e = (schema1 as any) === schema2;
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(false);
});

test('optional - 7', () => {
    const schema1 = union(number()).optional().required();
    const schema2 = schema1.required();
    const e = (schema1 as any) === schema2;
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('nullable - 1', () => {
    const schema = union(number()).nullable();
    expect(schema).toHaveProperty('isNullable', true);
});

test('nullable - 2', () => {
    const schema = union(number()).nullable().notNullable();
    expect(schema).toHaveProperty('isNullable', false);
});

test('nullable - 3', () => {
    const schema1 = union(string());
    const schema2 = schema1.nullable();
    const e = (schema1 as any) === schema2;
    const isNullableEqual = (schema1 as any).isNullable !== schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 4', () => {
    const schema1 = union(number()).nullable();
    const schema2 = schema1.nullable();
    const e = (schema1 as any) === schema2;
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 5', () => {
    const schema1 = union(number());
    const schema2 = schema1.nullable();
    const e = (schema1 as any) === schema2;
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('nullable - 6', () => {
    const schema1 = union(number());
    const schema2 = schema1.notNullable();
    const e = (schema1 as any) === schema2;
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 7', () => {
    const schema1 = union(number()).nullable();
    const schema2 = schema1.notNullable();
    const e = (schema1 as any) === schema2;
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});
test('or - 1', () => {
    const schema1 = union(string());
    const schema2 = schema1.or(number());
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).toHaveProperty('type', 'union');
    expect(schema2).toHaveProperty('variants');
    expect(schema2).toHaveProperty('variants.length', 2);
    expect(schema2).toHaveProperty('isRequired', true);
    expect(schema2).toHaveProperty('isNullable', false);
});

test('or - 2', () => {
    const schema1 = union(string()).or(number());
    const schema2 = schema1.clearVariants();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).toHaveProperty('type', 'union');
    expect(schema2).toHaveProperty('variants');
    expect(schema2).toHaveProperty('variants.length', 0);
    expect(schema2).toHaveProperty('isRequired', true);
    expect(schema2).toHaveProperty('isNullable', false);
});

test('or - 3', () => {
    const schema1 = union(string()).or(number()).clearVariants();
    const schema2 = schema1.clearVariants();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema2).toHaveProperty('type', 'union');
    expect(schema2).toHaveProperty('variants');
    expect(schema2).toHaveProperty('variants.length', 0);
    expect(schema2).toHaveProperty('isRequired', true);
    expect(schema2).toHaveProperty('isNullable', false);
});
