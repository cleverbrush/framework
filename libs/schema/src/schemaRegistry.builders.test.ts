import { deepEqual } from '@cleverbrush/deep';
import { InferType, Schema } from './schema.js';
import { object } from './builders/ObjectSchemaBuilder.js';
import { number } from './builders/NumberSchemaBuilder.js';
import { string } from './builders/StringSchemaBuilder.js';
import { array } from './builders/ArraySchemaBuilder.js';

import SchemaRegistry from './schemaRegistry.js';
import { union } from './builders/UnionSchemaBuilder.js';
import { boolean } from './builders/BooleanSchemaBuilder.js';
import { alias } from './builders/AliasSchemaBuilder.js';

const getUserSchema = () =>
    object().hasProperties({
        id: number(),
        name: object().hasProperties({
            first: string().hasMinLength(1).hasMaxLength(100),
            last: string().hasMinLength(1).hasMaxLength(100)
        }),
        incomePerMonth: number().hasMinValue(0),
        bornAt: object(),
        aliases: array()
    });

test('Can add schema', () => {
    const validator = new SchemaRegistry().addSchema(
        'something',
        ({ object, string }) =>
            object().hasProperties({
                a: string()
            })
    );
    expect(validator.schemas.something).toBeDefined();
});

test('Error thrown on adding a schema with duplicate name', () => {
    expect(() =>
        new SchemaRegistry()
            .addSchema('smth', {} as any)
            .addSchema('smth', {} as any)
    ).toThrow();
});

test('Receiving the same schema after add', () => {
    const schema = object().hasProperties({
        name: string()
    });
    const validator = new SchemaRegistry().addSchema('something', schema);

    expect(
        deepEqual({ ...schema._schema }, validator.schemas.something.schema)
    ).toEqual(true);
});

test('Union - Array as schema type', async () => {
    const validator = new SchemaRegistry()
        .addSchema('name', ({ object, string }) =>
            object().hasProperties({
                name: string()
            })
        )
        .addSchema('number_or_string', ({ number, string, alias, union }) =>
            union(number()).or(string()).or(alias('name'))
        );

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
    const validator = new SchemaRegistry().addSchema(
        'address',
        ({ object, union, number, string }) =>
            object().hasProperties({
                first: union(number().hasMinValue(10).hasMaxValue(20)).or(
                    string().hasMinLength(2)
                )
            })
    );

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
    const validator = new SchemaRegistry().addSchema(
        'address',
        ({ object, number, string, union }) =>
            object().hasProperties({
                first: union(number().hasMinValue(10).hasMaxValue(20))
                    .or(string().hasMinLength(2))
                    .optional()
                    .nullable()
            })
    );
    let result = await validator.schemas.address.validate({});
    expect(result).toHaveProperty('valid', true);
    result = await validator.schemas.address.validate({
        first: null
    });
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number(), 10);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - not number passed', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number(), 'str');
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - min', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().hasMinValue(1000), 10);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - min 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().hasMinValue(1000), 10000);
    expect(result).toEqual({
        valid: true
    });
});

test('Validate - number by schema - min 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().hasMinValue(1000), 1000);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - min 4', async () => {
    const validator = new SchemaRegistry();
    const mk = jest.fn();
    validator
        .validate(number().hasMinValue('wdd' as any), 10)
        .catch(mk)
        .then(() => {
            expect(mk).toBeCalled();
        });
});

test('Validate - number by schema - max', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().hasMaxValue(1000), 20000);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - max 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().hasMaxValue(40000), 10000);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - max 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().hasMaxValue(1000), 1000);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - max 4', async () => {
    const validator = new SchemaRegistry();
    const mk = jest.fn();
    validator
        .validate(number().hasMaxValue('string' as any), 10)
        .catch(mk)
        .then(() => {
            expect(mk).toBeCalled();
        });
});

test('Validate - number by schema - range', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        number().hasMinValue(1).hasMaxValue(100),
        10
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - range - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        number().hasMinValue(-1).hasMaxValue(100),
        -210
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - range - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        number().hasMinValue(-100).hasMaxValue(100),
        -100
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - range - 4', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        number().hasMinValue(-100).hasMaxValue(100),
        100
    );

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - range - 5', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        number().hasMinValue(-100).hasMaxValue(100),
        200
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - range - 6', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        number().hasMinValue(-100).hasMaxValue(100),
        200
    );

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - NaN', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        number().hasMinValue(-100).hasMaxValue(100),
        0 / 0
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - NaN - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().canBeNaN(), 0 / 0);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - Infinity', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number(), 100 / 0);

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - Infinity - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().canBeInfinite(), 100 / 0);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - custom validators - 1', async () => {
    const validator = new SchemaRegistry();
    const schema = number().addValidator(async (value) => {
        if ((value & 0xb01) === 0)
            return {
                valid: false,
                errors: ['value should be odd!']
            };
        return {
            valid: true
        };
    });
    let result = await validator.validate(schema, 101);

    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(schema, 100);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - custom validators - 2', async () => {
    const validator = new SchemaRegistry();
    const schema = number()
        .addValidator((value) => {
            if ((value & 0xb01) === 0)
                return {
                    valid: false,
                    errors: ['value should be odd!']
                };
            return {
                valid: true
            };
        })
        .addValidator((value) => ({ valid: value > 100 }));
    let result = await validator.validate(schema, 101);

    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(schema, 99);
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(schema, 100);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - boolean - 1', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(boolean(), 300);

    expect(result).toHaveProperty('valid', false);
});

test('Validate - boolean - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(boolean(), true);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - boolean - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(boolean(), false);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - boolean - 4', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(boolean().equalsTo(true), false);

    expect(result).toHaveProperty('valid', false);
});

test('Validate - boolean - 5', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(boolean().equalsTo(false), false);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - string - schema object - 1', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        string().equalsTo('123456'),
        '123456'
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate - string - schema object - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        string().equalsTo('123456'),
        '12345'
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - schema object - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(string().equalsTo('123456'), 1234);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - length control - 1', async () => {
    const validator = new SchemaRegistry();
    let result = await validator.validate(
        string().hasMinLength(2).hasMaxLength(3),
        'U'
    );
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(
        string().hasMinLength(2).hasMaxLength(3),
        'US'
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        string().hasMinLength(2).hasMaxLength(3),
        'USA'
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        string().hasMinLength(2).hasMaxLength(3),
        'USA'
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        string().hasMinLength(2).hasMaxLength(3),
        'United States of America'
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - array - size control - 1', async () => {
    const validator = new SchemaRegistry();
    let result = await validator.validate(
        array().hasMinLength(1).hasMaxLength(3),
        []
    );
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(array().hasMinLength(1).hasMaxLength(3), [
        1
    ]);
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        array().hasMinLength(1).hasMaxLength(3),
        [1, 2]
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        array().hasMinLength(1).hasMaxLength(3),
        [1, 2, 3]
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        array().hasMinLength(1).hasMaxLength(3),
        [1, 2, 3, 4]
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - array - ofType - 1', async () => {
    const validator = new SchemaRegistry();
    let result = await validator.validate(array().hasElementOfType(number()), [
        '1',
        2,
        3
    ]);
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(
        array().hasElementOfType(number()),
        [1, 2, 3]
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        array().hasElementOfType(number().hasMinValue(10)),
        [-1, 12, 13]
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - object - 1', async () => {
    const validator = new SchemaRegistry().addSchema('user', getUserSchema());
    const schema = getUserSchema();
    type User = InferType<typeof schema>;
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
        object().hasProperties({
            name: string().hasMaxLength(5),
            address: object().hasProperties({
                street: string(),
                house: number().optional()
            })
        }),
        {
            name: 'Andr',
            address: {
                street: 'something'
            }
        }
    );

    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        object()
            .hasProperties({
                a: number(),
                b: number()
            })
            .addValidator((value: { a: number; b: number }) => {
                if (value.a + value.b === 5) {
                    return {
                        valid: true
                    };
                }
                return {
                    valid: false,
                    error: ['some error']
                };
            }),
        {
            a: 1,
            b: 3
        }
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - one of - 1', async () => {
    const validator = new SchemaRegistry();

    let result = await validator.validate(
        union(number()).or(object()),
        'something'
    );
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(
        union(number()).or(string()),
        'something'
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        union(number())
            .or(string())
            .or(
                object().hasProperties({
                    first: string(),
                    last: string()
                })
            ),
        {
            first: 'something',
            last: 'another'
        }
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate schema - 1', async () => {
    const validator = new SchemaRegistry()
        .addSchema(
            'EqualsFilterCondition',
            ({ object, number, string, union }) =>
                object().hasProperties({
                    operation: string().equalsTo('equals'),
                    value: union(object()).or(string()).or(number())
                })
        )
        .addSchema('LikeFilterCondition', ({ object, string }) =>
            object().hasProperties({
                operation: string().equalsTo('like'),
                value: string()
            })
        )
        .addSchema('StringFilterCondition', ({ union, alias }) =>
            union(alias('EqualsFilterCondition')).or(
                alias('LikeFilterCondition')
            )
        )
        .addSchema('AuthorFilter', ({ alias, object }) =>
            object().hasProperties({
                fullName: alias('StringFilterCondition')
            })
        )
        .addSchema('Date', ({ object }) =>
            object().addValidator((value) =>
                value instanceof Date && !Number.isNaN(value)
                    ? {
                          valid: true
                      }
                    : {
                          valid: false,
                          errors: ['should be a valid Date object']
                      }
            )
        )
        .addSchema(
            'AuthorsReportSpecification',
            ({ object, string, alias, union }) =>
                object()
                    .hasProperties({
                        type: string().equalsTo('author'),
                        start: alias('Date'),
                        end: alias('Date'),
                        selectionStart: alias('Date'),
                        selectionEnd: alias('Date'),
                        granularity: union(string().equalsTo('day'))
                            .or(string().equalsTo('week'))
                            .or(string().equalsTo('month')),
                        metrics: array().hasElementOfType(
                            union(string().equalsTo('articlesPublished'))
                                .or(string().equalsTo('searchReferrers'))
                                .or(string().equalsTo('socialReferrers'))
                                .or(string().equalsTo('views'))
                                .or(string().equalsTo('visitors'))
                                .or(string().equalsTo('newVisitors'))
                        ),
                        filters: object().hasProperties({
                            author: alias('AuthorFilter')
                        })
                    })
                    .addValidator((value) =>
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
                    )
        );

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
        .addSchema('Date', ({ object }) =>
            object().addValidator((value) =>
                value instanceof Date && !Number.isNaN(value)
                    ? {
                          valid: true
                      }
                    : {
                          valid: false,
                          errors: ['should be a valid Date object']
                      }
            )
        )
        .addSchema('Module.Schema1', ({ object, string }) =>
            object().hasProperties({
                a: string()
            })
        )
        .addSchema('Module.Schema2', ({ object, number }) =>
            object().hasProperties({
                b: number()
            })
        );

    const result = await validator.validate(
        object().hasProperties({
            date: alias('Date').optional()
        }),
        {}
    );

    expect(result).toHaveProperty('valid', true);
});

test('Not required alternative schema alias', async () => {
    const validator = new SchemaRegistry()
        .addSchema('Alternate1', ({ object, string }) =>
            object().hasProperties({
                a1: string()
            })
        )
        .addSchema('Alternate2', ({ object, string }) =>
            object().hasProperties({
                a2: string()
            })
        )
        .addSchema('Alternate', ({ union, alias }) =>
            union(alias('Alternate1')).or(alias('Alternate2'))
        );

    const s = alias('Alternate').optional();
    let result = await validator.validate(s, undefined);

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

test('Preprocessors - 1', async () => {
    const validator = new SchemaRegistry().addSchema(
        'Date',
        object().addValidator((value) =>
            value instanceof Date && !Number.isNaN(value)
                ? {
                      valid: true
                  }
                : {
                      valid: false,
                      errors: ['should be a valid Date object']
                  }
        )
    );

    const schema = object()
        .hasProperties({
            bornAt: alias('Date')
        })
        .addFieldPreprocessor('bornAt', (value: any): Date | undefined => {
            const time = Date.parse(
                (value as Record<string, unknown>).toString()
            );
            if (Number.isNaN(time)) return undefined;
            return new Date(time);
        });
    const result = await validator.validate(schema as Schema, {
        bornAt: new Date().toJSON()
    });
    expect(result).toHaveProperty('valid', true);
});

test('Preprocessors - 2', async () => {
    const validator = new SchemaRegistry().addSchema(
        'Date',
        object().addValidator((value) =>
            value instanceof Date && !Number.isNaN(value)
                ? {
                      valid: true
                  }
                : {
                      valid: false,
                      errors: ['should be a valid Date object']
                  }
        )
    );

    let schema = object()
        .hasProperties({
            bornAt: alias('Date')
        })
        .addFieldPreprocessor('bornAt', 'StringToDate');

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

    schema = object()
        .hasProperties({
            bornAt: alias('Date'),
            diedAt: alias('Date')
        })
        .addFieldPreprocessor('bornAt', 'StringToDate')
        .addFieldPreprocessor('diedAt', 'Unregistered') as any;

    expect(async () => {
        await validator.validate(schema as Schema, {
            bornAt: new Date().toJSON()
        });
    }).rejects.toBeInstanceOf(Error);
});

test('Preprocessors - 3', async () => {
    const validator = new SchemaRegistry().addSchema('Date', ({ object }) =>
        object().addValidator((value: any) =>
            value instanceof Date && !Number.isNaN(value)
                ? {
                      valid: true
                  }
                : {
                      valid: false,
                      errors: ['should be a valid Date object']
                  }
        )
    );
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
        array().hasElementOfType(alias('Date')).addPreprocessor('StringToDate'),
        obj
    );
    expect(result).toHaveProperty('valid', true);

    obj = [new Date().toJSON()];
    result = await validator.validate(
        array()
            .hasElementOfType(alias('Date'))
            .addPreprocessor((value: unknown): Date | undefined => {
                const time = Date.parse(
                    (value as Record<string, unknown>).toString()
                );
                if (Number.isNaN(time)) return undefined;
                return new Date(time);
            }),
        obj
    );
    expect(result).toHaveProperty('valid', true);

    obj = ['sdfsdf12', new Date().toJSON()];
    result = await validator.validate(
        array()
            .hasElementOfType(alias('Date'))
            .addPreprocessor((value: unknown): Date | undefined => {
                const time = Date.parse(
                    (value as Record<string, unknown>).toString()
                );
                if (Number.isNaN(time)) return undefined;
                return new Date(time);
            }),
        obj
    );
    expect(result).toHaveProperty('valid', false);
});

test('Preprocessors - 3', async () => {
    const validator = new SchemaRegistry();

    type SomeType = { age: number; marriedAt: number };

    const schema = object()
        .hasProperties({
            age: number(),
            marriedAt: number()
        })
        .addFieldPreprocessor('age', (): number => 40)
        .addFieldPreprocessor('*', (value: SomeType): void => {
            if (value.marriedAt > value.age) {
                value.marriedAt = value.age;
            }
        });

    const obj = {
        age: 50,
        marriedAt: 80
    };
    await validator.validate(schema as Schema, obj);
    expect(obj).toHaveProperty('marriedAt', 40);
});

test('Preprocessors - 4', async () => {
    const validator = new SchemaRegistry().addSchema('Date', ({ object }) =>
        object().addValidator((value: any) =>
            value instanceof Date && !Number.isNaN(value)
                ? {
                      valid: true
                  }
                : {
                      valid: false,
                      errors: ['should be a valid Date object']
                  }
        )
    );

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
        array().hasElementOfType(alias('Date')).addPreprocessor('StringToDate'),
        obj
    );
    expect(result).toHaveProperty('valid', true);

    obj = [new Date().toJSON()];
    result = await validator.validate(
        array()
            .hasElementOfType(alias('Date'))
            .addPreprocessor((value: unknown): Date | undefined => {
                const time = Date.parse(
                    (value as Record<string, unknown>).toString()
                );
                if (Number.isNaN(time)) return undefined;
                return new Date(time);
            }),
        obj
    );
    expect(result).toHaveProperty('valid', true);

    obj = ['sdfsdf12', new Date().toJSON()];
    result = await validator.validate(
        array()
            .hasElementOfType(alias('Date'))
            .addPreprocessor((value: unknown): Date | undefined => {
                const time = Date.parse(
                    (value as Record<string, unknown>).toString()
                );
                if (Number.isNaN(time)) return undefined;
                return new Date(time);
            }),
        obj
    );
    expect(result).toHaveProperty('valid', false);
});
test('Submodules - 2', async () => {
    const validator = new SchemaRegistry()
        .addSchema('Module1.Schema1', ({ object }) => object())
        .addSchema('Module1.Schema2', ({ object, number }) =>
            object().hasProperties({
                a: number()
            })
        );

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
        .addSchema('Module1.Schema1', ({ object, number }) =>
            object().hasProperties({
                b: number()
            })
        )
        .addSchema('Module1.Schema2', ({ object, alias }) =>
            object().hasProperties({
                a: alias('Module1.Schema1')
            })
        );

    const result2 = await validator.schemas.Module1.Schema2.validate({
        a: {
            b: 20
        }
    });
    expect(result2).toHaveProperty('valid', true);
});

test('Submodules - 4', async () => {
    const validator = new SchemaRegistry()
        .addSchema('Module1.Schema1', ({ object, number }) =>
            object().hasProperties({
                b: number()
            })
        )
        .addSchema('Module1.Schema2', ({ object, alias }) =>
            object().hasProperties({
                a: alias('Module1.Schema3' as any)
            })
        );

    await validator.schemas.Module1.Schema2.validate({
        a: {
            b: 20
        }
    }).catch((e) => expect(e).toBeInstanceOf(Error));
});

test('No unknown fields - 1', async () => {
    const validator = new SchemaRegistry().addSchema(
        'Schema1',
        ({ object, number }) =>
            object()
                .hasProperties({
                    b: number()
                })
                .shouldNotHaveUnknownProperties()
    );

    const result = await validator.schemas.Schema1.validate({
        b: 20,
        c: 'something'
    });
    expect(result).toHaveProperty('valid', false);
});

test('No unknown fields - 2', async () => {
    const validator = new SchemaRegistry().addSchema(
        'Schema1',
        ({ object, number }) =>
            object()
                .hasProperties({
                    b: number()
                })
                .canHaveUnknownProperties()
    );

    const result = await validator.schemas.Schema1.validate({
        b: 20,
        c: 'something'
    });
    expect(result).toHaveProperty('valid', true);
});
