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
    const schema1 = object().addProps({
        first: number()
    });
    const schema2 = schema1.optional();
    const k = (schema1 as any).properties === (schema2 as any).properties;
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
    const schema2 = schema1.addProps({
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
        .addProps({
            first: number(),
            second: {
                type: 'number'
            }
        });
    const schema2 = schema1.addProps({
        third: number()
    });

    const equal = (schema1 as Schema) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).toHaveProperty('properties.third.type', 'number');
});

test('removeProp - 1', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number()
        })
        .removeProp('second');
    expect(schema1).toHaveProperty('properties.first');
    expect(schema1).not.toHaveProperty('properties.second');
});

test('removeProp - 2', () => {
    const schema1 = object().addProps({
        first: number(),
        second: number()
    });
    const schema2 = schema1.removeProp('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
});

test('removeProp - 3', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number()
        })
        .setPropPreprocessor('second', () => 321);
    const schema2 = schema1.removeProp('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).not.toHaveProperty('properties.second');
    expect(schema2).not.toHaveProperty('preprocessors.second');
});

test('preprocessors - 1', () => {
    const schema1 = object().addProps({
        first: number(),
        second: number().optional()
    });
    expect(schema1).not.toHaveProperty('preprocessors');
});

test('preprocessors - 2', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number().optional()
        })
        .setPropPreprocessor('first', () => 123);
    expect(schema1).toHaveProperty('preprocessors.first');
});

test('preprocessors - 3', () => {
    const schema1 = object().addProps({
        first: number(),
        second: number().optional()
    });
    const schema2 = schema1.setPropPreprocessor('first', () => 123);
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(false);
});

test('preprocessors - 4', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number().optional()
        })
        .setPropPreprocessor('first', () => 123);
    const schema2 = schema1.unsetPropPreprocessor('first');
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(false);
    expect(schema2).not.toHaveProperty('preprocessors');
});

test('preprocessors - 5', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number().optional()
        })
        .setPropPreprocessor('first', () => 123);
    const schema2 = schema1
        .setPropPreprocessor('second', () => 321)
        .unsetPropPreprocessor('first');
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(false);
    expect(schema2).not.toHaveProperty('preprocessors.first');
    expect(schema2).toHaveProperty('preprocessors.second');
});

test('preprocessors - 6', () => {
    const schema1 = object().addProps({
        first: number(),
        second: number().optional()
    });
    const schema2 = schema1.clearPropsPreprocessors();
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(true);
});

test('preprocessors - 7', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number().optional()
        })
        .setPropPreprocessor('first', () => 123);
    const schema2 = schema1.clearPropsPreprocessors();
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(false);
    expect(schema2).not.toHaveProperty('preprocessors');
});

test('preprocessors - 8', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number().optional()
        })
        .setPropPreprocessor('first', () => 123)
        .setPropPreprocessor('*', () => 123);
    const schema2 = schema1.unsetPropPreprocessor('first');
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(false);
    expect(schema2).not.toHaveProperty('preprocessors.first');
    expect(schema2).toHaveProperty('preprocessors.*');
});

test('preprocessors - 9', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number().optional()
        })
        .setPropPreprocessor('first', () => 123)
        .unsetPropPreprocessor('first');
    const schema2 = schema1.unsetPropPreprocessor('first');
    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(true);
});

test('canHaveUnknownProps - 1', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number().optional()
        })
        .canHaveUnknownProps();
    expect(schema1).toHaveProperty('noUnknownProperties', false);
});

test('canHaveUnknownProps - 2', () => {
    const schema1 = object().addProps({
        first: number(),
        second: number().optional()
    });
    const schema2 = schema1.canHaveUnknownProps();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).toHaveProperty('noUnknownProperties', false);
});

test('canHaveUnknownProps - 3', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number().optional()
        })
        .canHaveUnknownProps();
    const schema2 = schema1.canHaveUnknownProps();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('noUnknownProperties', false);
    expect(schema2).toHaveProperty('noUnknownProperties', false);
});

test('noUnknownProps - 1', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number().optional()
        })
        .noUnknownProps();
    expect(schema1).toHaveProperty('noUnknownProperties', true);
});

test('canHaveUnknownProps - 2', () => {
    const schema1 = object().addProps({
        first: number(),
        second: number().optional()
    });
    const schema2 = schema1.noUnknownProps();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    expect(schema2).toHaveProperty('noUnknownProperties', true);
});

test('canHaveUnknownProps - 3', () => {
    const schema1 = object()
        .addProps({
            first: number(),
            second: number().optional()
        })
        .noUnknownProps();
    const schema2 = schema1.noUnknownProps();
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(true);
    expect(schema1).toHaveProperty('noUnknownProperties', true);
    expect(schema2).toHaveProperty('noUnknownProperties', true);
});

test('makePropOptional - 1', () => {
    const schema1 = object().addProps({
        first: number(),
        second: number()
    });
    const schema2 = schema1.makePropOptional('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const propsEqual =
        (schema1 as any).properties.second ===
        (schema2 as any).properties.second;
    expect(propsEqual).toEqual(false);
    const propsIsRequired1 =
        (schema1 as any).properties.second.isRequired === true;
    expect(propsIsRequired1).toEqual(true);
    const propsIsRequired2 =
        (schema2 as any).properties.second.isRequired === false;
    expect(propsIsRequired2).toEqual(true);
});

test('makePropOptional - 2', () => {
    expect(() => {
        const schema1 = object().addProps({
            first: number(),
            second: number()
        });
        schema1.makePropOptional('second123' as any);
    }).toThrow();
});

test('makePropOptional - 3', () => {
    const schema1 = object().addProps({
        first: number(),
        second: {
            type: 'number',
            isRequired: true
        }
    });
    const schema2 = schema1.makePropOptional('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const propsEqual =
        (schema1 as any).properties.second ===
        (schema2 as any).properties.second;
    expect(propsEqual).toEqual(false);
    const propsIsRequired1 =
        (schema1 as any).properties.second.isRequired === true;
    expect(propsIsRequired1).toEqual(true);
    const propsIsRequired2 =
        (schema2 as any).properties.second.isRequired === false;
    expect(propsIsRequired2).toEqual(true);
});

test('makePropRequired - 1', () => {
    const schema1 = object().addProps({
        first: number().optional(),
        second: number().optional()
    });
    const schema2 = schema1.makePropRequired('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const propsEqual =
        (schema1 as any).properties.second ===
        (schema2 as any).properties.second;
    expect(propsEqual).toEqual(false);
    const propsIsRequired1 =
        (schema1 as any).properties.second.isRequired === false;
    expect(propsIsRequired1).toEqual(true);
    const propsIsRequired2 =
        (schema2 as any).properties.second.isRequired === true;
    expect(propsIsRequired2).toEqual(true);
});

test('makePropRequired - 2', () => {
    expect(() => {
        const schema1 = object().addProps({
            first: number(),
            second: number()
        });
        schema1.makePropRequired('second123' as any);
    }).toThrow();
});

test('makePropRequired - 3', () => {
    const schema1 = object().addProps({
        first: number().optional(),
        second: {
            type: 'number',
            isRequired: false
        }
    });
    const schema2 = schema1.makePropRequired('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const propsEqual =
        (schema1 as any).properties.second ===
        (schema2 as any).properties.second;
    expect(propsEqual).toEqual(false);
    const propsIsRequired1 =
        (schema1 as any).properties.second.isRequired === false;
    expect(propsIsRequired1).toEqual(true);
    const propsIsRequired2 =
        (schema2 as any).properties.second.isRequired === true;
    expect(propsIsRequired2).toEqual(true);
});

test('makePropNullable - 1', () => {
    const schema1 = object().addProps({
        first: number(),
        second: number()
    });
    const schema2 = schema1.makePropNullable('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const propsEqual =
        (schema1 as any).properties.second ===
        (schema2 as any).properties.second;
    expect(propsEqual).toEqual(false);
    const propsIsNullable1 =
        (schema1 as any).properties.second.isNullable === false;
    expect(propsIsNullable1).toEqual(true);
    const propsIsNullable2 =
        (schema2 as any).properties.second.isNullable === true;
    expect(propsIsNullable2).toEqual(true);
});

test('makePropNullable - 2', () => {
    expect(() => {
        const schema1 = object().addProps({
            first: number(),
            second: number()
        });
        schema1.makePropNullable('second123' as any);
    }).toThrow();
});

test('makePropNullable - 3', () => {
    const schema1 = object().addProps({
        first: number(),
        second: {
            type: 'number',
            isNullable: false
        }
    });
    const schema2 = schema1.makePropNullable('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const propsEqual =
        (schema1 as any).properties.second ===
        (schema2 as any).properties.second;
    expect(propsEqual).toEqual(false);
    const propsIsNullable1 =
        (schema1 as any).properties.second.isNullable === false;
    expect(propsIsNullable1).toEqual(true);
    const propsIsNullable2 =
        (schema2 as any).properties.second.isNullable === true;
    expect(propsIsNullable2).toEqual(true);
});

test('makePropNotNullable - 1', () => {
    const schema1 = object().addProps({
        first: number().notNullable(),
        second: number().notNullable()
    });
    const schema2 = schema1.makePropNullable('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const propsEqual =
        (schema1 as any).properties.second ===
        (schema2 as any).properties.second;
    expect(propsEqual).toEqual(false);
    const propsIsNotNullable1 =
        (schema1 as any).properties.second.isNullable === false;
    expect(propsIsNotNullable1).toEqual(true);
    const propsIsNotNullable2 =
        (schema2 as any).properties.second.isNullable === true;
    expect(propsIsNotNullable2).toEqual(true);
});

test('makePropNotNullable - 2', () => {
    expect(() => {
        const schema1 = object().addProps({
            first: number(),
            second: number()
        });
        schema1.makePropNotNullable('second123' as any);
    }).toThrow();
});

test('makePropNotNullable - 3', () => {
    const schema1 = object().addProps({
        first: number().optional(),
        second: {
            type: 'number',
            isNullable: false
        }
    });
    const schema2 = schema1.makePropNotNullable('second');
    const equal = (schema1 as any) === schema2;
    expect(equal).toEqual(false);
    const propsEqual =
        (schema1 as any).properties.second ===
        (schema2 as any).properties.second;
    expect(propsEqual).toEqual(false);
    const propsIsNullable1 =
        (schema1 as any).properties.second.isNullable === false;
    expect(propsIsNullable1).toEqual(true);
    const propsIsNullable2 =
        (schema2 as any).properties.second.isNullable === false;
    expect(propsIsNullable2).toEqual(true);
});

type TestType = { first?: number; second: number };

test('mapToType - 1', () => {
    const schema1 = object({
        first: number().optional(),
        second: number()
    });

    const schema2 = schema1.mapToType<TestType>();

    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(true);
});

test('mapToType - 1', () => {
    const schema1 = object({
        first: number().optional(),
        second: number()
    }).mapToType<TestType>();

    const schema2 = schema1.clearMapToType();

    const equals = (schema1 as any) === schema2;
    expect(equals).toEqual(true);
});

test('makeAllPropsOptional - 1', () => {
    const schema = object({
        first: number(),
        second: number()
    }).makeAllPropsOptional();

    const firstIsOptional =
        schema._schema.properties.first.isRequired === false;
    const secondIsOptional =
        schema._schema.properties.second.isRequired === false;

    expect(firstIsOptional).toEqual(true);
    expect(secondIsOptional).toEqual(true);
});

test('makeAllPropsOptional - 2', () => {
    const schema = object({
        first: number(),
        second: number(),
        id: number()
    })
        .makeAllPropsOptional()
        .makePropRequired('id');

    const firstIsOptional =
        schema._schema.properties.first.isRequired === false;
    const secondIsOptional =
        schema._schema.properties.second.isRequired === false;
    const idIsRequired = schema._schema.properties.id.isRequired === true;

    expect(firstIsOptional).toEqual(true);
    expect(secondIsOptional).toEqual(true);
    expect(idIsRequired).toEqual(true);
});
