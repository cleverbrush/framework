import { Schema } from '../schema.js';
import { number } from './NumberSchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';

test('Clean', () => {
    const schema = object();
    expect(schema).toHaveProperty('type', 'object');
    expect(schema).not.toHaveProperty('properties');
});

test('Immutable - 1', () => {
    const schema1 = object();
    const schema2 = schema1.optional();
    const k = (schema1 as any) === (schema2 as any);
    expect(k).toEqual(false);
});

test('Immutable - 2', () => {
    const schema1 = object().addProperties({
        first: number()
    });
    const schema2 = schema1.optional();
    const k = schema1.properties === schema2.properties;
    expect(k).toEqual(false);
});

test('optional', () => {
    const schema = object().optional();
    expect(schema).toHaveProperty('type', 'object');
    expect(schema).toHaveProperty('isRequired', false);
});

test('optional - 2', () => {
    const schema = object().optional().required();
    expect(schema).toHaveProperty('type', 'object');
    expect(schema).toHaveProperty('isRequired', true);
});

test('optional - 3', () => {
    const schema1 = object();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired !== schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 4', () => {
    const schema1 = object().optional();
    const schema2 = schema1.optional();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 5', () => {
    const schema1 = object();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('optional - 6', () => {
    const schema1 = object().optional();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(false);
    expect(isRequiredEqual).toEqual(false);
});

test('optional - 7', () => {
    const schema1 = object().optional().required();
    const schema2 = schema1.required();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isRequiredEqual = (schema1 as any).isRequired === schema2.isRequired;
    expect(e).toEqual(true);
    expect(isRequiredEqual).toEqual(true);
});

test('nullable - 1', () => {
    const schema = object().nullable();
    expect(schema).toHaveProperty('type', 'object');
    expect(schema).toHaveProperty('isNullable', true);
});

test('nullable - 2', () => {
    const schema = object().nullable().notNullable();
    expect(schema).toHaveProperty('type', 'object');
    expect(schema).toHaveProperty('isNullable', false);
});

test('nullable - 3', () => {
    const schema1 = object();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable !== schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 4', () => {
    const schema1 = object().nullable();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 5', () => {
    const schema1 = object();
    const schema2 = schema1.nullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('nullable - 6', () => {
    const schema1 = object();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(true);
    expect(isNullableEqual).toEqual(true);
});

test('nullable - 7', () => {
    const schema1 = object().nullable();
    const schema2 = schema1.notNullable();
    const e = (schema1 as Schema) === (schema2 as Schema);
    const isNullableEqual = (schema1 as any).isNullable === schema2.isNullable;
    expect(e).toEqual(false);
    expect(isNullableEqual).toEqual(false);
});

test('hasProperties - 1', () => {
    const schema1 = object().optional();
    const schema2 = schema1.addProperties({
        first: number(),
        second: {
            type: 'number'
        }
    });

    const equal = (schema1 as Schema) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).toHaveProperty('properties.second.type', 'number');
});

test('hasProperties - 2', () => {
    const schema1 = object()
        .optional()
        .addProperties({
            first: number(),
            second: {
                type: 'number'
            }
        });
    const schema2 = schema1.addProperties({
        third: number()
    });

    const equal = (schema1 as Schema) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).toHaveProperty('properties.third.type', 'number');
});

test('removeProperty - 1', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number()
        })
        .removeProperty('second');
    expect(schema1).toHaveProperty('properties.first');
    expect(schema1).not.toHaveProperty('properties.second');
});

test('removeProperty - 2', () => {
    const schema1 = object().addProperties({
        first: number(),
        second: number()
    });
    const schema2 = schema1.removeProperty('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
});

test('removeProperty - 3', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number()
        })
        .addFieldPreprocessor('second', () => 321);
    const schema2 = schema1.removeProperty('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).not.toHaveProperty('properties.second');
    expect(schema2).not.toHaveProperty('preprocessors.second');
});

test('preprocessors - 1', () => {
    const schema1 = object().addProperties({
        first: number(),
        second: number().optional()
    });
    expect(schema1).not.toHaveProperty('preprocessors');
});

test('preprocessors - 2', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number().optional()
        })
        .addFieldPreprocessor('first', () => 123);
    expect(schema1).toHaveProperty('preprocessors.first');
});

test('preprocessors - 3', () => {
    const schema1 = object().addProperties({
        first: number(),
        second: number().optional()
    });
    const schema2 = schema1.addFieldPreprocessor('first', () => 123);
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(false);
});

test('preprocessors - 4', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number().optional()
        })
        .addFieldPreprocessor('first', () => 123);
    const schema2 = schema1.removeFieldPreprocessor('first');
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(false);
    expect(schema2).not.toHaveProperty('preprocessors');
});

test('preprocessors - 5', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number().optional()
        })
        .addFieldPreprocessor('first', () => 123);
    const schema2 = schema1
        .addFieldPreprocessor('second', () => 321)
        .removeFieldPreprocessor('first');
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(false);
    expect(schema2).not.toHaveProperty('preprocessors.first');
    expect(schema2).toHaveProperty('preprocessors.second');
});

test('preprocessors - 6', () => {
    const schema1 = object().addProperties({
        first: number(),
        second: number().optional()
    });
    const schema2 = schema1.clearFieldPreprocessors();
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(true);
});

test('preprocessors - 7', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number().optional()
        })
        .addFieldPreprocessor('first', () => 123);
    const schema2 = schema1.clearFieldPreprocessors();
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(false);
    expect(schema2).not.toHaveProperty('preprocessors');
});

test('preprocessors - 8', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number().optional()
        })
        .addFieldPreprocessor('first', () => 123)
        .addFieldPreprocessor('*', () => 123);
    const schema2 = schema1.removeFieldPreprocessor('first');
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(false);
    expect(schema2).not.toHaveProperty('preprocessors.first');
    expect(schema2).toHaveProperty('preprocessors.*');
});

test('canHaveUnknownProperties - 1', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number().optional()
        })
        .canHaveUnknownProperties();
    expect(schema1).toHaveProperty('noUnknownProperties', false);
});

test('canHaveUnknownProperties - 2', () => {
    const schema1 = object().addProperties({
        first: number(),
        second: number().optional()
    });
    const schema2 = schema1.canHaveUnknownProperties();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).toHaveProperty('noUnknownProperties', false);
});

test('canHaveUnknownProperties - 3', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number().optional()
        })
        .canHaveUnknownProperties();
    const schema2 = schema1.canHaveUnknownProperties();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('noUnknownProperties', false);
    expect(schema2).toHaveProperty('noUnknownProperties', false);
});

test('shouldNotHaveUnknownProperties - 1', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number().optional()
        })
        .shouldNotHaveUnknownProperties();
    expect(schema1).toHaveProperty('noUnknownProperties', true);
});

test('canHaveUnknownProperties - 2', () => {
    const schema1 = object().addProperties({
        first: number(),
        second: number().optional()
    });
    const schema2 = schema1.shouldNotHaveUnknownProperties();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).toHaveProperty('noUnknownProperties', true);
});

test('canHaveUnknownProperties - 3', () => {
    const schema1 = object()
        .addProperties({
            first: number(),
            second: number().optional()
        })
        .shouldNotHaveUnknownProperties();
    const schema2 = schema1.shouldNotHaveUnknownProperties();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('noUnknownProperties', true);
    expect(schema2).toHaveProperty('noUnknownProperties', true);
});
