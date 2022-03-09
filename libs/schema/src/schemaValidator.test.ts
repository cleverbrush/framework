import { deepEqual, deepExtend } from '@cleverbrush/deep';
import { ValidationResult } from '../dist/index.js';

import {
    NumberSchemaDefinition,
    ObjectSchemaDefinitionParam,
    Schema
} from './index';
import SchemaValidator from './schemaValidator';

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

const getUserSchema = (): ObjectSchemaDefinitionParam<User> => ({
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
});

test('Can add schema', () => {
    const validator = new SchemaValidator().addSchemaType(
        'something',
        getUserSchema()
    );
    expect(validator.schemas.something).toBeDefined();
});

test('Error thrown on adding a schema with duplicate name', () => {
    expect(() =>
        new SchemaValidator()
            .addSchemaType('smth', {})
            .addSchemaType('smth', {})
    ).toThrow();
});

test('Receiving the same schema after add', () => {
    const schema: ObjectSchemaDefinitionParam<{ name: string }> = {
        properties: {
            name: 'string'
        }
    };
    const validator = new SchemaValidator().addSchemaType('something', schema);

    expect(
        deepEqual(
            { ...schema, type: 'object' },
            validator.schemas.something.schema
        )
    ).toEqual(true);
});

test('Schemas property is cached when reading', () => {
    const validator = new SchemaValidator().addSchemaType('something', {});
    expect(validator.schemas).toEqual(validator.schemas);
});

test('Schemas property is updated after adding a new schema', () => {
    let validator = new SchemaValidator().addSchemaType('something', {});
    const s = validator.schemas;
    validator = validator.addSchemaType('another', {});
    expect(s).not.toEqual(validator.schemas);
});

test('Trows when trying to add a schema with name = "number"', () => {
    const validator = new SchemaValidator();
    expect(() => validator.addSchemaType('number', {})).toThrow();
});

test('Trows when trying to add a schema with name = "array"', () => {
    const validator = new SchemaValidator();
    expect(() => validator.addSchemaType('array', {})).toThrow();
});

test('Trows when trying to add a schema with name = "date"', () => {
    const validator = new SchemaValidator();
    expect(() => validator.addSchemaType('date', {})).toThrow();
});

test('Trows when trying to add a schema with name = "string"', () => {
    const validator = new SchemaValidator();
    expect(() => validator.addSchemaType('string', {})).toThrow();
});

test('Throws if schema name is empty', () => {
    const validator = new SchemaValidator();
    expect(() => validator.addSchemaType('', {})).toThrow();
});

test('Throws if schema name is not a string', () => {
    const validator = new SchemaValidator();
    expect(() =>
        validator.addSchemaType(new Date() as any as string, {})
    ).toThrow();
});

test('Throws if schema is not an object', () => {
    const validator = new SchemaValidator();
    expect(() =>
        validator.addSchemaType(
            'string',
            'string' as any as ObjectSchemaDefinitionParam<any>
        )
    ).toThrow();
});

test('Array as schema type', async () => {
    const validator = new SchemaValidator()
        .addSchemaType('name', {
            properties: {
                name: 'string'
            }
        })
        .addSchemaType('number_or_string', ['number', 'string', 'name']);

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

test('Validate - no schema', async () => {
    const validator = new SchemaValidator();
    const cth = jest.fn();
    validator
        .validate(null, 10)
        .catch(cth)
        .then(() => {
            expect(cth).toBeCalled();
        });
});

test('Validate - no schema type', async () => {
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
    const result = await validator.validate(10, 0);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by value - 2', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate(10, 10);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by value - 3', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate(10, {});
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by value - 4', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate(10, 15);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by name: object', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate('number', {});
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by name: string', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate('number', '10');
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by name - correct', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate('number', 10);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate(
        {
            type: 'number'
        },
        10
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - not number passed', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate(
        {
            type: 'number'
        },
        'str'
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - min', async () => {
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
    const result = await validator.validate(
        {
            type: 'number'
        },
        100 / 0
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - Infinity - 2', async () => {
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
    const schema: NumberSchemaDefinition<any> = {
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
    const validator = new SchemaValidator();
    const schema: NumberSchemaDefinition<any> = {
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

test('Validate - string - 1', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate('string', '12345');
    expect(result).toHaveProperty('valid', true);
});

test('Validate - string - 2', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate('string', 12345);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - 3', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate('12345', '12345');
    expect(result).toHaveProperty('valid', true);
});

test('Validate - string - 4', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate('12345', '123456');
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - 5', async () => {
    const validator = new SchemaValidator();
    const result = await validator.validate('12345', 123456);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - schema object - 1', async () => {
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
    let result = await validator.validate('array', []);
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate('array', 123);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - array - size control - 1', async () => {
    const validator = new SchemaValidator();
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
    const validator = new SchemaValidator();
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

test('Validate - object - 1', async () => {
    const validator = new SchemaValidator().addSchemaType(
        'user',
        getUserSchema()
    );
    const user: User = {
        id: 1,
        name: {
            first: 'Andrew',
            last: 'Zolotukhin'
        },
        bornAt: new Date(1986, 4, 30),
        incomePerMonth: 134234,
        aliases: []
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
                (value) => {
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
    const validator = new SchemaValidator().addSchemaType(
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
        })
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
    const validator = new SchemaValidator();

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

test('Validate schema', async () => {
    const authorsReportSpecificationSchema = {
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

    const validator = new SchemaValidator()
        .addSchemaType('Date', {
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
        .addSchemaType('EqualsFilterCondition', {
            properties: {
                operation: {
                    type: 'string',
                    equals: 'equals'
                },
                value: ['object', 'string', 'number']
            }
        })
        .addSchemaType('GreaterThanFilterCondition', {
            properties: {
                operation: {
                    type: 'string',
                    equals: 'greater_than'
                },
                value: 'number'
            }
        })
        .addSchemaType('LessThanFilterCondition', {
            properties: {
                operation: {
                    type: 'string',
                    equals: 'less_than'
                },
                value: 'number'
            }
        })
        .addSchemaType('ContainsFilterCondition', {
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
        .addSchemaType('LikeFilterCondition', {
            properties: {
                operation: 'like',
                value: 'string'
            }
        })
        .addSchemaType('BetweenFilterCondition', {
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
        .addSchemaType('StringFilterCondition', [
            'EqualsFilterCondition',
            'LikeFilterCondition'
        ])
        .addSchemaType('AuthorFilter', {
            properties: {
                fullName: 'StringFilterCondition'
            }
        })
        .addSchemaType(
            'AuthorsReportSpecification',
            authorsReportSpecificationSchema as ObjectSchemaDefinitionParam<any>
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
