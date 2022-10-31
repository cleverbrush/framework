import { deepEqual, deepExtend } from '@cleverbrush/deep';

import {
    ValidationResult,
    NumberSchema,
    ObjectSchema,
    Schema
} from './schema.js';
import SchemaRegistry from './schemaRegistry.js';

type User = {
    id: number;
    name: {
        first: string;
        last: string;
    };
    bornAt: Date;
    diedAt?: Date;
    incomePerMonth: number;
    aliases: string[];
    spouse?: User;
};

const getUserSchema = (): Schema<User> =>
    ({
        type: 'object',
        properties: {
            id: 'number',
            name: {
                type: 'object',
                isNullable: false,
                isRequired: true,
                properties: {
                    first: {
                        type: 'string',
                        isNullable: false,
                        isRequired: true,
                        minLength: 1,
                        maxLength: 100
                    },
                    last: {
                        type: 'string',
                        isNullable: false,
                        isRequired: true,
                        minLength: 1,
                        maxLength: 100
                    }
                }
            },
            incomePerMonth: {
                type: 'number',
                min: 0
            }
        }
    } as any);

test('Can add schema', () => {
    const validator = new SchemaRegistry().addSchema('something', {
        type: 'object',
        properties: {
            a: 'string'
        }
    });
    expect(validator.schemas.something).toBeDefined();
});

test('Throws when not array or object is passed to addSchemaType', () => {
    expect(() => {
        new SchemaRegistry().addSchema('something', 1234 as any);
    }).toThrow();
});

test('Error thrown on adding a schema with duplicate name', () => {
    expect(() =>
        new SchemaRegistry()
            .addSchema('smth', {} as any)
            .addSchema('smth', {} as any)
    ).toThrow();
});

test('Receiving the same schema after add', () => {
    const schema: ObjectSchema<{ name: string }> = {
        type: 'object',
        properties: {
            name: 'string'
        }
    };
    const validator = new SchemaRegistry().addSchema('something', schema);

    expect(
        deepEqual(
            { ...schema, type: 'object' },
            validator.schemas.something.schema
        )
    ).toEqual(true);
});

test('Schemas property is cached when reading', () => {
    const validator = new SchemaRegistry().addSchema('something', {});
    expect(validator.schemas).toEqual(validator.schemas);
});

test('Schemas property is updated after adding a new schema', () => {
    let validator = new SchemaRegistry().addSchema(
        'something',
        {} as ObjectSchema<any>
    );
    const s = validator.schemas;
    validator = validator.addSchema('another', {});
    expect(s).not.toEqual(validator.schemas);
});

test('Trows when trying to add a schema with name = "number"', () => {
    const validator = new SchemaRegistry();
    expect(() =>
        validator.addSchema('number', {} as ObjectSchema<any>)
    ).toThrow();
});

test('Trows when trying to add a schema with name = "array"', () => {
    const validator = new SchemaRegistry();
    expect(() =>
        validator.addSchema('array', {} as ObjectSchema<any>)
    ).toThrow();
});

test('Trows when trying to add a schema with name = "string"', () => {
    const validator = new SchemaRegistry();
    expect(() =>
        validator.addSchema('string', {} as ObjectSchema<any>)
    ).toThrow();
});

test('Throws if schema name is empty', () => {
    const validator = new SchemaRegistry();
    expect(() => validator.addSchema('', {} as ObjectSchema<any>)).toThrow();
});

test('Throws if schema name is not a string', () => {
    const validator = new SchemaRegistry();
    expect(() =>
        validator.addSchema(
            new Date() as any as string,
            {} as ObjectSchema<any>
        )
    ).toThrow();
});

test('Throws if schema is not an object', () => {
    const validator = new SchemaRegistry();
    expect(() =>
        validator.addSchema('string', 'string' as any as ObjectSchema<any>)
    ).toThrow();
});

test('Union - Array as schema type', async () => {
    const validator = new SchemaRegistry()
        .addSchema('name', {
            type: 'object',
            properties: {
                name: 'string'
            }
        })
        .addSchema('number_or_string', ['number', 'string', 'name']);

    let result = await validator.schemas.number_or_string.validate(123);

    expect(result).toHaveProperty('valid', true);

    result = await validator.schemas.number_or_string.validate('some string');

    expect(result).toHaveProperty('valid', true);

    result = await validator.schemas.number_or_string.validate({});

    expect(result).toHaveProperty('valid', false);

    result = await validator.schemas.number_or_string.validate({
        name: 'some name'
    });
    expect(result).toHaveProperty('valid', true);
});

test('Union - Schema Object - 1', async () => {
    const validator = new SchemaRegistry().addSchema('address', {
        type: 'object',
        properties: {
            first: {
                type: 'union',
                variants: [
                    { type: 'number', min: 10, max: 20 },
                    { type: 'string', minLength: 2 }
                ]
            }
        }
    });

    let result = await validator.schemas.address.validate({
        first: 15
    });
    expect(result).toHaveProperty('valid', true);
    result = await validator.schemas.address.validate({
        first: 25
    });
    expect(result).toHaveProperty('valid', false);
    result = await validator.schemas.address.validate({
        first: 'some string'
    });
    expect(result).toHaveProperty('valid', true);
    result = await validator.schemas.address.validate({
        first: 's'
    });
    expect(result).toHaveProperty('valid', false);
});

test('Union - Schema Object - 2', async () => {
    const validator = new SchemaRegistry().addSchema('address', {
        type: 'object',
        properties: {
            first: {
                type: 'union',
                isRequired: false,
                isNullable: true,
                variants: [
                    { type: 'number', min: 10, max: 20 },
                    { type: 'string', minLength: 2 }
                ]
            }
        }
    });

    let result = await validator.schemas.address.validate({});
    expect(result).toHaveProperty('valid', true);
    result = await validator.schemas.address.validate({
        first: null
    });
    expect(result).toHaveProperty('valid', true);
});

test('Validate - no schema', async () => {
    const validator = new SchemaRegistry();
    const cth = jest.fn();
    validator
        .validate(null as any, 10)
        .catch(cth)
        .then(() => {
            expect(cth).toBeCalled();
        });
});

test('Validate - no schema type', async () => {
    const validator = new SchemaRegistry();
    const cth = jest.fn();
    validator
        .validate(
            {
                isRequired: true
            } as Schema<any>,
            10
        )
        .catch(cth)
        .then(() => {
            expect(cth).toBeCalled();
        });
});

test('Validate - number by value', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(10, 0);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by value - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(10, 10);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by value - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(10, {});
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by value - 4', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(10, 15);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by name: object', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('number', {});
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by name: string', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('number', '10');
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by name - correct', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('number', 10);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by number - correct', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(10, 10);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by number - incorrect', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(10, 20);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number'
        },
        10
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - not number passed', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number'
        },
        'str'
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - min', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            min: 1000
        },
        10
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - min 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            min: 1000
        },
        10000
    );
    expect(result).toEqual({
        valid: true
    });
});

test('Validate - number by schema - min 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            min: 1000
        },
        1000
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - min 4', async () => {
    const validator = new SchemaRegistry();
    const mk = jest.fn();
    validator
        .validate(
            {
                type: 'number',
                min: 'string' as any as number
            },
            10
        )
        .catch(mk)
        .then(() => {
            expect(mk).toBeCalled();
        });
});

test('Validate - number by schema - max', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            max: 1000
        },
        20000
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - max 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            max: 40000
        },
        10000
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - max 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            max: 1000
        },
        1000
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - max 4', async () => {
    const validator = new SchemaRegistry();
    const mk = jest.fn();
    validator
        .validate(
            {
                type: 'number',
                max: 'string' as any as number
            },
            10
        )
        .catch(mk)
        .then(() => {
            expect(mk).toBeCalled();
        });
});

test('Validate - number by schema - range', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            min: 1,
            max: 100
        },
        10
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - range - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            min: -100,
            max: 100
        },
        -210
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - range - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            min: -100,
            max: 100
        },
        -100
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - range - 4', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            min: -100,
            max: 100
        },
        100
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - range - 5', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            min: -100,
            max: 100
        },
        200
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - range - 6', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            min: -100,
            max: 100
        },
        200
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - NaN', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            min: -100,
            max: 100
        },
        0 / 0
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - NaN - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            ensureNotNaN: false
        },
        0 / 0
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - Infinity', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number'
        },
        100 / 0
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - Infinity - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'number',
            ensureIsFinite: false
        },
        100 / 0
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - custom validators - 1', async () => {
    const validator = new SchemaRegistry();
    const schema: NumberSchema = {
        type: 'number',
        validators: [
            async (value) => {
                if ((value & 0xb01) === 0)
                    return {
                        valid: false,
                        errors: ['value should be odd!']
                    };
                return {
                    valid: true
                };
            }
        ]
    };
    let result = await validator.validate(schema, 101);

    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(schema, 100);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - custom validators - 2', async () => {
    const validator = new SchemaRegistry();
    const schema: NumberSchema = {
        type: 'number',
        validators: [
            (value) => {
                if ((value & 0xb01) === 0)
                    return {
                        valid: false,
                        errors: ['value should be odd!']
                    };
                return {
                    valid: true
                };
            },
            (value) => ({ valid: value > 100 })
        ]
    };
    let result = await validator.validate(schema, 101);

    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(schema, 99);
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(schema, 100);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - custom validators - 3', async () => {
    const validator = new SchemaRegistry();
    const schema: NumberSchema = {
        type: 'number',
        validators: [
            async () => {
                throw new Error('error');
            },
            (value) => ({ valid: value > 100 })
        ]
    };
    const result = await validator.validate(schema, 101);

    expect(result).toHaveProperty('valid', false);

    // result = await validator.validate(schema, 99);
    // expect(result).toHaveProperty('valid', false);

    // result = await validator.validate(schema, 100);
    // expect(result).toHaveProperty('valid', false);
});

test('Validate - boolean - 1', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'boolean'
        },
        300
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - boolean - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'boolean'
        },
        true
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - boolean - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'boolean'
        },
        false
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - boolean - 4', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'boolean',
            equals: true
        },
        false
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - boolean - 5', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'boolean',
            equals: false
        },
        false
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - boolean - 6', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('boolean', false);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - boolean - 7', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('boolean', '123');

    expect(result).toHaveProperty('valid', false);
});

test('Validate - boolean - 8', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'boolean',
            isRequired: false
        },
        undefined
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - function - 1', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'function'
        },
        300
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - function - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'function'
        },
        () => 10
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - function - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'function'
        },
        (a) => a * a
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - function - 4', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('function', () => 20);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - function - 5', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('function', '123');

    expect(result).toHaveProperty('valid', false);
});

test('Validate - function - 6', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'function',
            isRequired: false
        },
        undefined
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - string - 1', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('string', '12345');
    expect(result).toHaveProperty('valid', true);
});

test('Validate - string - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('string', 12345);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('12345', '12345');
    expect(result).toHaveProperty('valid', true);
});

test('Validate - string - 4', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('12345', '123456');
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - 5', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate('12345', 123456);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - schema object - 1', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'string',
            equals: '123456'
        },
        '123456'
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate - string - schema object - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'string',
            equals: '123456'
        },
        '12345'
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - schema object - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'string',
            equals: '123456'
        },
        1234
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - length control - 1', async () => {
    const validator = new SchemaRegistry();
    let result = await validator.validate(
        {
            type: 'string',
            minLength: 2,
            maxLength: 3
        },
        'U'
    );
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(
        {
            type: 'string',
            minLength: 2,
            maxLength: 3
        },
        'US'
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'string',
            minLength: 2,
            maxLength: 3
        },
        'USA'
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'string',
            minLength: 2,
            maxLength: 3
        },
        'USA'
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'string',
            minLength: 2,
            maxLength: 3
        },
        'United States of America'
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - array - 1', async () => {
    const validator = new SchemaRegistry();
    let result = await validator.validate('array', []);
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate('array', 123);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - array - size control - 1', async () => {
    const validator = new SchemaRegistry();
    let result = await validator.validate(
        {
            type: 'array',
            minLength: 1,
            maxLength: 3
        },
        []
    );
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(
        {
            type: 'array',
            minLength: 1,
            maxLength: 3
        },
        [1]
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'array',
            minLength: 1,
            maxLength: 3
        },
        [1, 2]
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'array',
            minLength: 1,
            maxLength: 3
        },
        [1, 2, 3]
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'array',
            minLength: 1,
            maxLength: 3
        },
        [1, 2, 3, 4]
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - array - ofType - 1', async () => {
    const validator = new SchemaRegistry();
    let result = await validator.validate(
        {
            type: 'array',
            ofType: 'number'
        },
        ['1', 2, 3]
    );
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(
        {
            type: 'array',
            ofType: 'number'
        },
        [1, 2, 3]
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'array',
            ofType: {
                type: 'number',
                min: 10
            }
        },
        [-1, 12, 13]
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - array - unknown preprocessor - 1', async () => {
    expect(async () => {
        const validator = new SchemaRegistry();
        await validator.validate(
            {
                type: 'array',
                ofType: 'number',
                preprocessor: 'DDD'
            },
            [1, 2, 3]
        );
    }).rejects.toThrow();
});

test('Validate - array - not required - 1', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        {
            type: 'array',
            ofType: 'number',
            isRequired: false
        },
        undefined
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate - object - 1', async () => {
    const validator = new SchemaRegistry().addSchema('user', getUserSchema());
    const user = {
        id: 1,
        name: {
            first: 'Andrew',
            last: 'Zolotukhin'
        },
        incomePerMonth: 134234
    };

    let result = await validator.validate('user', user);

    expect(result).toHaveProperty('valid', true);

    result = await validator.validate('user', 10);

    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(
        {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    maxLength: 5
                },
                address: {
                    type: 'object',
                    properties: {
                        street: 'string',
                        house: {
                            type: 'number',
                            isRequired: false
                        }
                    }
                }
            }
        },
        {
            name: 'Andr',
            address: {
                street: 'something'
            }
        }
    );

    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'object',
            properties: {
                a: 'number',
                b: 'number'
            },
            validators: [
                (value: { a: number; b: number }) => {
                    if (value.a + value.b === 5) {
                        return {
                            valid: true
                        };
                    }
                    return {
                        valid: false,
                        error: ['some error']
                    };
                }
            ]
        },
        {
            a: 1,
            b: 3
        }
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - object - 2', async () => {
    const validator = new SchemaRegistry().addSchema(
        'user',
        deepExtend(getUserSchema(), {
            validators: [
                (value): ValidationResult => {
                    if (value.bornAt < new Date(1990, 0, 1)) {
                        return {
                            valid: true
                        };
                    }
                    return {
                        valid: false,
                        errors: [`bornAt should be before Jan 1 1990`]
                    };
                }
            ]
        }) as any as ObjectSchema<any>
    );
    const user: User = {
        id: 1,
        name: {
            first: 'Andrew',
            last: 'Zolotukhin'
        },
        bornAt: new Date(1996, 4, 30),
        incomePerMonth: 134234,
        aliases: []
    };

    const result = await validator.validate('user', user);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - one of - 1', async () => {
    const validator = new SchemaRegistry();

    let result = await validator.validate(['number', 'object'], 'something');
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(['number', 'string'], 'something');
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        [
            'number',
            'string',
            {
                type: 'object',
                properties: {
                    first: 'string',
                    last: 'string'
                }
            }
        ],
        {
            first: 'something',
            last: 'another'
        }
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate schema - 1', async () => {
    const authorsReportSpecificationSchema = {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                equals: 'author'
            },
            start: 'Date',
            end: 'Date',
            selectionStart: 'Date',
            selectionEnd: 'Date',
            granularity: ['day', 'week', 'month'],
            metrics: {
                type: 'array',
                ofType: [
                    'articlesPublished',
                    'searchReferrers',
                    'socialReferrers',
                    'views',
                    'visitors',
                    'newVisitors'
                ]
            },
            filters: {
                type: 'object',
                properties: {
                    author: 'AuthorFilter'
                    // publication: 'PublicationFilter',
                    // article: 'ArticleFilter'
                }
            }
        },
        validators: [
            (value) =>
                value.start <= value.end &&
                value.selectionStart <= value.selectionEnd &&
                value.selectionStart >= value.start &&
                value.selectionStart <= value.end &&
                value.selectionEnd >= value.start &&
                value.selectionEnd <= value.end
                    ? {
                          valid: true
                      }
                    : {
                          valid: false,
                          errors: [
                              'selectionStart <=> selectionEnd should be inside the start <=> end interval'
                          ]
                      }
        ]
    };

    const validator = new SchemaRegistry()
        .addSchema('Date', {
            type: 'object',
            validators: [
                (value) =>
                    value instanceof Date && !Number.isNaN(value)
                        ? {
                              valid: true
                          }
                        : {
                              valid: false,
                              errors: ['should be a valid Date object']
                          }
            ]
        })
        .addSchema('EqualsFilterCondition', {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    equals: 'equals'
                },
                value: ['object', 'string', 'number']
            }
        })
        .addSchema('GreaterThanFilterCondition', {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    equals: 'greater_than'
                },
                value: 'number'
            }
        })
        .addSchema('LessThanFilterCondition', {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    equals: 'less_than'
                },
                value: 'number'
            }
        })
        .addSchema('ContainsFilterCondition', {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    equals: 'contains'
                },
                value: [
                    'string',
                    'number',
                    {
                        type: 'array',
                        ofType: ['string', 'number']
                    }
                ]
            }
        })
        .addSchema('LikeFilterCondition', {
            type: 'object',
            properties: {
                operation: 'like',
                value: 'string'
            }
        })
        .addSchema('BetweenFilterCondition', {
            type: 'object',
            properties: {
                operation: 'between',
                from: 'number',
                to: 'number'
            },
            validators: [
                (value) =>
                    value.from <= value.to
                        ? { valid: true }
                        : { valid: false, error: ['from must be <= to'] }
            ]
        })
        .addSchema('StringFilterCondition', [
            'EqualsFilterCondition',
            'LikeFilterCondition'
        ])
        .addSchema('AuthorFilter', {
            type: 'object',
            properties: {
                fullName: 'StringFilterCondition'
            }
        })
        .addSchema(
            'AuthorsReportSpecification',
            authorsReportSpecificationSchema as ObjectSchema<any>
        );

    /**
     * @type {import('smg-iq/editorial-analytics.reports').AuthorsReportSpecification}
     */
    let reportSpec = {
        type: 'author',
        start: new Date(2021, 0, 1),
        end: new Date(),
        selectionStart: new Date(2022, 0, 1),
        selectionEnd: new Date(2022, 2, 1),
        granularity: 'day',
        metrics: [
            'articlesPublished',
            'searchReferrers',
            'socialReferrers',
            'views',
            'visitors',
            'newVisitors'
        ],
        filters: {
            author: {
                fullName: {
                    operation: 'between',
                    value: 'some name'
                }
            }
        }
    };

    let result = await validator.schemas.AuthorsReportSpecification.validate(
        reportSpec
    );

    expect(result).toHaveProperty('valid', false);

    reportSpec = {
        type: 'author',
        start: new Date(2021, 0, 1),
        end: new Date(),
        selectionStart: new Date(2022, 0, 1),
        selectionEnd: new Date(2022, 2, 1),
        granularity: 'day',
        metrics: [
            'articlesPublished',
            'searchReferrers',
            'socialReferrers',
            'views',
            'visitors',
            'newVisitors'
        ],
        filters: {
            author: {
                fullName: {
                    operation: 'equals',
                    value: 'some name'
                }
            }
        }
    };

    result = await validator.schemas.AuthorsReportSpecification.validate(
        reportSpec
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate schema - 2', async () => {
    const validator = new SchemaRegistry()
        .addSchema('Date', {
            type: 'object',
            validators: [
                (value) =>
                    value instanceof Date && !Number.isNaN(value)
                        ? {
                              valid: true
                          }
                        : {
                              valid: false,
                              errors: ['should be a valid Date object']
                          }
            ]
        })
        .addSchema('Module.Schema1', {
            type: 'object',
            properties: {
                a: 'string'
            }
        })
        .addSchema('Module.Schema2', {
            type: 'object',
            properties: {
                b: 'number'
            }
        });

    const result = await validator.validate(
        {
            type: 'object',
            properties: {
                date: {
                    type: 'alias',
                    schemaName: 'Date',
                    isRequired: false
                }
            }
        },
        {}
    );

    expect(result).toHaveProperty('valid', true);
});

test('Not required alternative schema alias', async () => {
    const validator = new SchemaRegistry()
        .addSchema('Alternate1', {
            properties: {
                a1: 'string'
            }
        })
        .addSchema('Alternate2', {
            properties: {
                a2: 'string'
            }
        })
        .addSchema('Alternate', ['Alternate1', 'Alternate2']);

    let result = await validator.validate(
        {
            type: 'alias',
            isRequired: false,
            schemaName: 'Alternate'
        },
        undefined
    );

    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'alias',
            isRequired: false,
            schemaName: 'Alternate'
        },
        {
            a2: 'something'
        }
    );

    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'alias',
            isRequired: false,
            schemaName: 'Alternate'
        },
        'invalid'
    );

    expect(result).toHaveProperty('valid', false);
});

test('Nullable alias', async () => {
    const validator = new SchemaRegistry().addSchema('Alias1', {
        properties: {
            a2: 'string'
        }
    });

    let result = await validator.validate(
        {
            type: 'alias',
            isNullable: true,
            schemaName: 'Alias1'
        },
        null
    );

    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        {
            type: 'object',
            properties: {
                prop: {
                    type: 'alias',
                    isNullable: true,
                    schemaName: 'Alias1'
                }
            }
        },
        {
            prop: null
        }
    );

    expect(result).toHaveProperty('valid', true);
});

test('Preprocessors - 1', async () => {
    const validator = new SchemaRegistry().addSchema('Date', {
        type: 'object',
        validators: [
            (value) =>
                value instanceof Date && !Number.isNaN(value)
                    ? {
                          valid: true
                      }
                    : {
                          valid: false,
                          errors: ['should be a valid Date object']
                      }
        ]
    });

    const schema: Schema<{ name: string; bornAt: Date }> = {
        type: 'object',
        properties: {
            bornAt: {
                type: 'alias',
                schemaName: 'Date'
            }
        },
        preprocessors: {
            bornAt: (value: any): Date | undefined => {
                const time = Date.parse(
                    (value as Record<string, unknown>).toString()
                );
                if (Number.isNaN(time)) return undefined;
                return new Date(time);
            }
        }
    } as any;

    const result = await validator.validate(schema as Schema, {
        bornAt: new Date().toJSON()
    });
    expect(result).toHaveProperty('valid', true);
});

test('Preprocessors - 2', async () => {
    const validator = new SchemaRegistry().addSchema('Date', {
        validators: [
            (value) =>
                value instanceof Date && !Number.isNaN(value)
                    ? {
                          valid: true
                      }
                    : {
                          valid: false,
                          errors: ['should be a valid Date object']
                      }
        ]
    });

    let schema: Schema<{ bornAt: Date; diedAt?: Date }> = {
        type: 'object',
        properties: {
            bornAt: 'Date'
        },
        preprocessors: {
            bornAt: 'StringToDate'
        }
    } as any;

    validator.addPreprocessor(
        'StringToDate',
        (value: unknown): Date | undefined => {
            const time = Date.parse(
                (value as Record<string, unknown>).toString()
            );
            if (Number.isNaN(time)) return undefined;
            return new Date(time);
        }
    );

    expect(() =>
        validator.addPreprocessor(
            'StringToDate',
            (value: unknown): Date | undefined => {
                const time = Date.parse(
                    (value as Record<string, unknown>).toString()
                );
                if (Number.isNaN(time)) return undefined;
                return new Date(time);
            }
        )
    ).toThrow();

    const result = await validator.validate(schema as Schema, {
        bornAt: new Date().toJSON()
    });
    expect(result).toHaveProperty('valid', true);

    schema = {
        type: 'object',
        properties: {
            bornAt: 'Date',
            diedAt: 'Date'
        },
        preprocessors: {
            bornAt: 'StringToDate',
            diedAt: 'Unregistered'
        }
    } as any;
    expect(async () => {
        await validator.validate(schema as Schema, {
            bornAt: new Date().toJSON()
        });
    }).rejects.toBeInstanceOf(Error);
});

test('Preprocessors - 3', async () => {
    const validator = new SchemaRegistry().addSchema('Date', {
        validators: [
            (value: any) =>
                value instanceof Date && !Number.isNaN(value)
                    ? {
                          valid: true
                      }
                    : {
                          valid: false,
                          errors: ['should be a valid Date object']
                      }
        ]
    });

    validator.addPreprocessor(
        'StringToDate',
        (value: unknown): Date | undefined => {
            const time = Date.parse(
                (value as Record<string, unknown>).toString()
            );
            if (Number.isNaN(time)) return undefined;
            return new Date(time);
        }
    );

    let obj = [new Date().toJSON()];

    let result = await validator.validate(
        {
            preprocessor: 'StringToDate',
            type: 'array',
            ofType: 'Date'
        },
        obj
    );
    expect(result).toHaveProperty('valid', true);

    obj = [new Date().toJSON()];
    result = await validator.validate(
        {
            preprocessor: (value: unknown): Date | undefined => {
                const time = Date.parse(
                    (value as Record<string, unknown>).toString()
                );
                if (Number.isNaN(time)) return undefined;
                return new Date(time);
            },
            type: 'array',
            ofType: 'Date'
        },
        obj
    );
    expect(result).toHaveProperty('valid', true);

    obj = ['sdfsdf12', new Date().toJSON()];
    result = await validator.validate(
        {
            preprocessor: (value: unknown): Date | undefined => {
                const time = Date.parse(
                    (value as Record<string, unknown>).toString()
                );
                if (Number.isNaN(time)) return undefined;
                return new Date(time);
            },
            type: 'array',
            ofType: 'Date'
        },
        obj
    );
    expect(result).toHaveProperty('valid', false);
});

test('Preprocessors - 3', async () => {
    const validator = new SchemaRegistry();

    type SomeType = { age: number; marriedAt: number };

    const schema: Schema<SomeType> = {
        type: 'object',
        properties: {
            age: 'number',
            marriedAt: 'number'
        },
        preprocessors: {
            age: (): number => 40,
            '*': (value: SomeType): void => {
                if (value.marriedAt > value.age) {
                    value.marriedAt = value.age;
                }
            }
        }
    } as any;

    const obj = {
        age: 50,
        marriedAt: 80
    };
    await validator.validate(schema as Schema, obj);
    expect(obj).toHaveProperty('marriedAt', 40);
});

test('Preprocessors - 4', async () => {
    const validator = new SchemaRegistry().addSchema('Date', {
        validators: [
            (value: any) =>
                value instanceof Date && !Number.isNaN(value)
                    ? {
                          valid: true
                      }
                    : {
                          valid: false,
                          errors: ['should be a valid Date object']
                      }
        ]
    });

    validator.addPreprocessor(
        'StringToDate',
        (value: unknown): Date | undefined => {
            const time = Date.parse(
                (value as Record<string, unknown>).toString()
            );
            if (Number.isNaN(time)) return undefined;
            return new Date(time);
        }
    );

    let obj = [new Date().toJSON()];

    let result = await validator.validate(
        {
            preprocessor: 'StringToDate',
            type: 'array',
            ofType: 'Date'
        },
        obj
    );
    expect(result).toHaveProperty('valid', true);

    obj = [new Date().toJSON()];
    result = await validator.validate(
        {
            preprocessor: (value: unknown): Date | undefined => {
                const time = Date.parse(
                    (value as Record<string, unknown>).toString()
                );
                if (Number.isNaN(time)) return undefined;
                return new Date(time);
            },
            type: 'array',
            ofType: 'Date'
        },
        obj
    );
    expect(result).toHaveProperty('valid', true);

    obj = ['sdfsdf12', new Date().toJSON()];
    result = await validator.validate(
        {
            preprocessor: (value: unknown): Date | undefined => {
                const time = Date.parse(
                    (value as Record<string, unknown>).toString()
                );
                if (Number.isNaN(time)) return undefined;
                return new Date(time);
            },
            type: 'array',
            ofType: 'Date'
        },
        obj
    );
    expect(result).toHaveProperty('valid', false);
});

test('Preprocessors - 5', async () => {
    const validator = new SchemaRegistry().addSchema('Date', {
        type: 'object',
        validators: [
            (value) =>
                value instanceof Date && !Number.isNaN(value)
                    ? {
                          valid: true
                      }
                    : {
                          valid: false,
                          errors: ['should be a valid Date object']
                      }
        ]
    });

    const schema: Schema<{ name: string; bornAt: Date }> = {
        type: 'object',
        properties: {
            bornAt: {
                type: 'alias',
                schemaName: 'Date',
                isRequired: false
            }
        },
        preprocessors: {
            bornAt: () => undefined
        },
        validators: [
            (value) => {
                expect('bornAt' in value).toEqual(false);
                return { valid: true };
            }
        ]
    } as any;

    const result = await validator.validate(schema as Schema, {});
    expect(result).toHaveProperty('valid', true);
});

test('Preprocessors - 6', async () => {
    const validator = new SchemaRegistry()
        .addSchema('Date', {
            type: 'object',
            validators: [
                (value) =>
                    value instanceof Date && !Number.isNaN(value)
                        ? {
                              valid: true
                          }
                        : {
                              valid: false,
                              errors: ['should be a valid Date object']
                          }
            ]
        })
        .addPreprocessor('BornAt', () => undefined);

    const schema: Schema<{ name: string; bornAt: Date }> = {
        type: 'object',
        properties: {
            bornAt: {
                type: 'alias',
                schemaName: 'Date',
                isRequired: false
            }
        },
        preprocessors: {
            bornAt: 'BornAt'
        },
        validators: [
            (value) => {
                expect('bornAt' in value).toEqual(false);
                return { valid: true };
            }
        ]
    } as any;

    const result = await validator.validate(schema as Schema, {});
    expect(result).toHaveProperty('valid', true);
});

test('Preprocessors - 7', async () => {
    expect(() => {
        new SchemaRegistry().addPreprocessor('BornAt', 123 as any);
    }).toThrow();
});

test('Submodules - 1', async () => {
    const validator = new SchemaRegistry().addSchema('Module1.Schema1', {});

    const result = validator.schemas;

    expect(result).toHaveProperty('Module1');
    expect(result).toHaveProperty('Module1.Schema1');
});

test('Submodules - 2', async () => {
    const validator = new SchemaRegistry()
        .addSchema('Module1.Schema1', {})
        .addSchema('Module1.Schema2', {
            type: 'object',
            properties: {
                a: 'number'
            }
        });

    const result = validator.schemas;

    expect(result).toHaveProperty('Module1');
    expect(result).toHaveProperty('Module1.Schema1');
    expect(result).toHaveProperty('Module1.Schema2');

    const result2 = await validator.schemas.Module1.Schema2.validate({
        a: 234
    });
    expect(result2).toHaveProperty('valid', true);
});

test('Submodules - 3', async () => {
    const validator = new SchemaRegistry()
        .addSchema('Module1.Schema1', {
            type: 'object',
            properties: {
                b: 'number'
            }
        })
        .addSchema('Module1.Schema2', {
            type: 'object',
            properties: {
                a: {
                    type: 'alias',
                    schemaName: 'Module1.Schema1'
                }
            }
        });

    const result2 = await validator.schemas.Module1.Schema2.validate({
        a: {
            b: 20
        }
    });
    expect(result2).toHaveProperty('valid', true);
});

test('Submodules - 4', async () => {
    const validator = new SchemaRegistry()
        .addSchema('Module1.Schema1', {
            properties: {
                b: 'number'
            }
        })
        .addSchema('Module1.Schema2', {
            properties: {
                a: {
                    type: 'alias',
                    schemaName: 'Module1.Schema3'
                }
            }
        });

    await validator.schemas.Module1.Schema2.validate({
        a: {
            b: 20
        }
    }).catch((e) => expect(e).toBeInstanceOf(Error));
});

test('No unknown fields - 1', async () => {
    const validator = new SchemaRegistry().addSchema('Schema1', {
        type: 'object',
        properties: {
            b: 'number'
        },
        noUnknownProperties: true
    });

    const result = await validator.schemas.Schema1.validate({
        b: 20,
        c: 'something'
    });
    expect(result).toHaveProperty('valid', false);
});

test('No unknown fields - 2', async () => {
    const validator = new SchemaRegistry().addSchema('Schema1', {
        type: 'object',
        properties: {
            b: 'number'
        },
        noUnknownProperties: false
    });

    const result = await validator.schemas.Schema1.validate({
        b: 20,
        c: 'something'
    });
    expect(result).toHaveProperty('valid', true);
});
