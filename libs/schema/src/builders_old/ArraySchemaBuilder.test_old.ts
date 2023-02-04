import { Schema } from '../schema.js';
import { array } from './ArraySchemaBuilder.js';
import { number } from './NumberSchemaBuilder.js';

test('Clean', () => {
    const schema = array();
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).toHaveProperty('isRequired', true);
    expect(schema).toHaveProperty('isNullable', false);
});

test('optional', () => {
    const schema = array().optional();
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).toHaveProperty('isRequired', false);
});

test('optional - 2', () => {
    const schema = array().optional().required();
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).toHaveProperty('isRequired', true);
});

test('optional - 3', () => {
    const schema1 = array();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired !== schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 4', () => {
    const schema1 = array().optional();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 5', () => {
    const schema1 = array();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 6', () => {
    const schema1 = array().optional();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(false);
});

test('optional - 7', () => {
    const schema1 = array().optional().required();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('nullable', () => {
    const schema = array().nullable();
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).toHaveProperty('isNullable', true);
});

test('nullable - 2', () => {
    const schema = array().nullable().notNullable();
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).toHaveProperty('isNullable', false);
});

test('nullable - 3', () => {
    const schema1 = array();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable !== schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 4', () => {
    const schema1 = array().nullable();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 5', () => {
    const schema1 = array();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('nullable - 6', () => {
    const schema1 = array();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 7', () => {
    const schema1 = array().nullable();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('ofType - 1', () => {
    const s: Schema = {
        type: 'number'
    };
    const schema = array().ofType(s)._schema;
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).toHaveProperty('ofType', s);
});

test('ofType - 2', () => {
    const s: Schema = {
        type: 'array'
    };
    const schema = array().ofType(s).clearOfType()._schema;
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).not.toHaveProperty('ofType');
});

test('ofType - 3', () => {
    const schema1 = array();
    const schema2 = schema1.ofType(number());
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
});

test('ofType - 4', () => {
    const schema1 = array().ofType(number());
    const schema2 = schema1.ofType(number());
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
});

test('ofType - 5', () => {
    const schema1 = array().ofType(number());
    const schema2 = schema1.clone();
    const equal = schema1._schema.ofType === schema2._schema.ofType;
    expect(equal).toEqual(false);
});

test('ofType - 6', () => {
    const schema1 = array().ofType(number());
    const schema2 = schema1.clearOfType();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
});

test('ofType - 7', () => {
    const schema1 = array().ofType(number()).clearOfType();
    const schema2 = schema1.clearOfType();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
});

test('maxLength - 1', () => {
    const schema = array()._schema;
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).not.toHaveProperty('maxLength');
});

test('maxLength - 2', () => {
    const s: Schema = {
        type: 'array'
    };
    const schema = array().ofType(s).maxLength(10)._schema;
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).toHaveProperty('maxLength', 10);
});

test('maxLength - 3', () => {
    const s: Schema = {
        type: 'array'
    };
    const schema = array().ofType(s).maxLength(10).clearMaxLength()._schema;
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).not.toHaveProperty('maxLength');
});

test('maxLength - 4', () => {
    const schema1 = array().maxLength(10).clearMaxLength();
    const schema2 = schema1.clearMaxLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
});

test('maxLength - 5', () => {
    const schema1 = array().maxLength(20);
    const schema2 = schema1.clearMaxLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
});

test('minLength - 1', () => {
    const schema = array()._schema;
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).not.toHaveProperty('minLength');
});

test('minLength - 2', () => {
    const s: Schema = {
        type: 'array'
    };
    const schema = array().ofType(s).minLength(10)._schema;
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).toHaveProperty('minLength', 10);
});

test('minLength - 3', () => {
    const s: Schema = {
        type: 'array'
    };
    const schema = array().ofType(s).minLength(10).clearMinLength()._schema;
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).not.toHaveProperty('minLength');
});

test('minLength - 4', () => {
    const schema1 = array().minLength(10).clearMinLength();
    const schema2 = schema1.clearMinLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
});

test('minLength - 5', () => {
    const schema1 = array().minLength(20);
    const schema2 = schema1.clearMinLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
});

test('minLength - 6', () => {
    const schema1 = array().minLength(20).clearMinLength();
    const schema2 = schema1.clearMinLength();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
});

test('min/max lengths - 1', () => {
    const s: Schema = {
        type: 'array'
    };
    const schema = array().ofType(s).minLength(10).maxLength(100)._schema;
    expect(schema).toHaveProperty('type', 'array');
    expect(schema).toHaveProperty('minLength', 10);
    expect(schema).toHaveProperty('maxLength', 100);
});
