import { InferType, Schema } from './schema.js';
import { object } from './builders/ObjectSchemaBuilder.js';
import { number } from './builders/NumberSchemaBuilder.js';
import { string } from './builders/StringSchemaBuilder.js';
import { array } from './builders/ArraySchemaBuilder.js';
import { union } from './builders/UnionSchemaBuilder.js';
import { boolean } from './builders/BooleanSchemaBuilder.js';

import SchemaRegistry from './schemaRegistry.js';

const getUserSchema = () =>
    object({
        id: number(),
        name: object().addProps({
            first: string().minLength(1).maxLength(100),
            last: string().minLength(1).maxLength(100)
        }),
        incomePerMonth: number().min(0),
        bornAt: object(),
        aliases: array()
    });

test('Can add schema', () => {
    const validator = new SchemaRegistry().addSchema(
        'something',
        ({ object, string }) =>
            object().addProps({
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

test('Union - Array as schema type', async () => {
    const validator = new SchemaRegistry()
        .addSchema('name', ({ object, string }) =>
            object().addProps({
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
            object().addProps({
                first: union(number().min(10).max(20)).or(string().minLength(2))
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
            object({
                first: union(number().min(10).max(20))
                    .or(string().minLength(2))
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
    const result = await validator.validate(number().min(1000), 10);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - min 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().min(1000), 10000);
    expect(result).toEqual({
        valid: true
    });
});

test('Validate - number by schema - min 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().min(1000), 1000);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - min 4', async () => {
    const validator = new SchemaRegistry();
    const mk = jest.fn();
    validator
        .validate(number().min('wdd' as any), 10)
        .catch(mk)
        .then(() => {
            expect(mk).toBeCalled();
        });
});

test('Validate - number by schema - max', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().max(1000), 20000);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - max 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().max(40000), 10000);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - max 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().max(1000), 1000);
    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - max 4', async () => {
    const validator = new SchemaRegistry();
    const mk = jest.fn();
    validator
        .validate(number().max('string' as any), 10)
        .catch(mk)
        .then(() => {
            expect(mk).toBeCalled();
        });
});

test('Validate - number by schema - range', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().min(1).max(100), 10);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - range - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().min(-1).max(100), -210);

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - range - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().min(-100).max(100), -100);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - range - 4', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().min(-100).max(100), 100);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - number by schema - range - 5', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().min(-100).max(100), 200);

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - range - 6', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().min(-100).max(100), 200);

    expect(result).toHaveProperty('valid', false);
});

test('Validate - number by schema - NaN', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(number().min(-100).max(100), 0 / 0);
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
    const result = await validator.validate(boolean().equals(true), false);

    expect(result).toHaveProperty('valid', false);
});

test('Validate - boolean - 5', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(boolean().equals(false), false);

    expect(result).toHaveProperty('valid', true);
});

test('Validate - string - schema object - 1', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(
        string().equals('123456'),
        '123456'
    );
    expect(result).toHaveProperty('valid', true);
});

test('Validate - string - schema object - 2', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(string().equals('123456'), '12345');
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - schema object - 3', async () => {
    const validator = new SchemaRegistry();
    const result = await validator.validate(string().equals('123456'), 1234);
    expect(result).toHaveProperty('valid', false);
});

test('Validate - string - length control - 1', async () => {
    const validator = new SchemaRegistry();
    let result = await validator.validate(
        string().minLength(2).maxLength(3),
        'U'
    );
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(string().minLength(2).maxLength(3), 'US');
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        string().minLength(2).maxLength(3),
        'USA'
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        string().minLength(2).maxLength(3),
        'USA'
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        string().minLength(2).maxLength(3),
        'United States of America'
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - array - size control - 1', async () => {
    const validator = new SchemaRegistry();
    let result = await validator.validate(
        array().minLength(1).maxLength(3),
        []
    );
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(array().minLength(1).maxLength(3), [1]);
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        array().minLength(1).maxLength(3),
        [1, 2]
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        array().minLength(1).maxLength(3),
        [1, 2, 3]
    );
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        array().minLength(1).maxLength(3),
        [1, 2, 3, 4]
    );
    expect(result).toHaveProperty('valid', false);
});

test('Validate - array - ofType - 1', async () => {
    const validator = new SchemaRegistry();
    let result = await validator.validate(array().ofType(number()), [
        '1',
        2,
        3
    ]);
    expect(result).toHaveProperty('valid', false);

    result = await validator.validate(array().ofType(number()), [1, 2, 3]);
    expect(result).toHaveProperty('valid', true);

    result = await validator.validate(
        array().ofType(number().min(10)),
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
        object({
            name: string().maxLength(5),
            address: object({
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
        object({
            a: number(),
            b: number()
        }).addValidator((value: { a: number; b: number }) => {
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
                object({
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
                object({
                    operation: string().equals('equals'),
                    value: union(object()).or(string()).or(number())
                })
        )
        .addSchema('LikeFilterCondition', ({ object, string }) =>
            object({
                operation: string().equals('like'),
                value: string()
            })
        )
        .addSchema('StringFilterCondition', ({ union, alias }) =>
            union(alias('EqualsFilterCondition')).or(
                alias('LikeFilterCondition')
            )
        )
        .addSchema('AuthorFilter', ({ alias, object }) =>
            object({
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
                object({
                    type: string().equals('author'),
                    start: alias('Date'),
                    end: alias('Date'),
                    selectionStart: alias('Date'),
                    selectionEnd: alias('Date'),
                    granularity: union(string().equals('day'))
                        .or(string().equals('week'))
                        .or(string().equals('month')),
                    metrics: array().ofType(
                        union(string().equals('articlesPublished'))
                            .or(string().equals('searchReferrers'))
                            .or(string().equals('socialReferrers'))
                            .or(string().equals('views'))
                            .or(string().equals('visitors'))
                            .or(string().equals('newVisitors'))
                    ),
                    filters: object({
                        author: alias('AuthorFilter')
                    })
                }).addValidator((value) =>
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
            object({
                a: string()
            })
        )
        .addSchema('Module.Schema2', ({ object, number }) =>
            object({
                b: number()
            })
        );

    const result = await validator.validate(
        object({
            date: validator.schemas.Date.schema.optional()
        }),
        {}
    );

    expect(result).toHaveProperty('valid', true);
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

    const schema = object({
        bornAt: validator.schemas.Date.schema
    }).setPropPreprocessor('bornAt', (value: any): Date | undefined => {
        const time = Date.parse((value as Record<string, unknown>).toString());
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

    let schema = object({
        bornAt: validator.schemas.Date.schema
    }).setPropPreprocessor('bornAt', 'StringToDate');

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

    schema = object({
        bornAt: validator.schemas.Date.schema,
        diedAt: validator.schemas.Date.schema
    })
        .setPropPreprocessor('bornAt', 'StringToDate')
        .setPropPreprocessor('diedAt', 'Unregistered') as any;

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
        array()
            .ofType(validator.schemas.Date.schema)
            .addPreprocessor('StringToDate'),
        obj
    );
    expect(result).toHaveProperty('valid', true);

    obj = [new Date().toJSON()];
    result = await validator.validate(
        array()
            .ofType(validator.schemas.Date.schema)
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
            .ofType(validator.schemas.Date.schema)
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

    const schema = object({
        age: number(),
        marriedAt: number()
    })
        .setPropPreprocessor('age', (): number => 40)
        .setPropPreprocessor('*', (value: SomeType): void => {
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
        array()
            .ofType(validator.schemas.Date.schema)
            .addPreprocessor('StringToDate'),
        obj
    );
    expect(result).toHaveProperty('valid', true);

    obj = [new Date().toJSON()];
    result = await validator.validate(
        array()
            .ofType(validator.schemas.Date.schema)
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
            .ofType(validator.schemas.Date.schema)
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
            object({
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
            object({
                b: number()
            })
        )
        .addSchema('Module1.Schema2', ({ object, alias }) =>
            object({
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
    try {
        new SchemaRegistry()
            .addSchema('Module1.Schema1', ({ object, number }) =>
                object({
                    b: number()
                })
            )
            .addSchema('Module1.Schema2', ({ object, alias }) =>
                object({
                    a: alias('Module1.Schema3' as any)
                })
            );
    } catch (e) {
        expect(e).toBeInstanceOf(Error);
    }
});

test('No unknown fields - 1', async () => {
    const validator = new SchemaRegistry().addSchema(
        'Schema1',
        ({ object, number }) =>
            object({
                b: number()
            }).noUnknownProps()
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
            object({
                b: number()
            }).canHaveUnknownProps()
    );

    const result = await validator.schemas.Schema1.validate({
        b: 20,
        c: 'something'
    });
    expect(result).toHaveProperty('valid', true);
});

test('addSchemaFrom - 1', async () => {
    const registry = new SchemaRegistry()
        .addSchema('Person', ({ string, object }) =>
            object({
                first: string(),
                last: string()
            })
        )
        .addSchemaFrom('Person', 'PersonWithEmail', ({ base, string }) =>
            base.addProps({
                email: string()
            })
        );
    expect(
        registry.schemas.Person === registry.schemas.PersonWithEmail
    ).toEqual(false);
});

test('Object returned - 1', async () => {
    const registry = new SchemaRegistry().addSchema(
        'Person',
        ({ object, string }) =>
            object({
                first: string(),
                last: string()
            })
    );
    const p = {
        first: 'John',
        last: 'Smith'
    };
    const { valid, object } = await registry.schemas.Person.validate(p);

    expect(valid).toEqual(true);
    expect(object === p).toEqual(true);
});

test('makeAllPropsOptional - 1', async () => {
    const registry = new SchemaRegistry().addSchema(
        'Schema1',
        ({ object, number }) =>
            object({
                id: number(),
                first: number(),
                second: number()
            })
                .makeAllPropsOptional()
                .makePropRequired('id')
    );

    const { valid } = await registry.schemas.Schema1.validate({
        id: 123
    });

    const { valid: valid2 } = await registry.schemas.Schema1.validate({});

    expect(valid).toEqual(true);
    expect(valid2).toEqual(false);
});

test('no unknown props allowed by default', async () => {
    const registry = new SchemaRegistry().addSchema(
        'User',
        ({ object, string }) =>
            object({
                firstName: string(),
                lastName: string()
            })
    );

    const { valid } = await registry.schemas.User.validate({
        firstName: 'John',
        lastName: 'Smith',
        age: 20
    });

    expect(valid).toEqual(false);

    const registry2 = registry.addSchemaFrom('User', 'UserOpen', ({ base }) =>
        base.canHaveUnknownProps()
    );

    const { valid: valid2 } = await registry2.schemas.UserOpen.validate({
        firstName: 'John',
        lastName: 'Smith',
        age: 20
    });

    expect(valid2).toEqual(true);
});

test('Func - 1', async () => {
    const validator = new SchemaRegistry().addSchema('something', ({ func }) =>
        func()
    );
    expect(validator.schemas.something).toBeDefined();
    expect(await validator.schemas.something.validate(123)).toHaveProperty(
        'valid',
        false
    );
    expect(await validator.schemas.something.validate(() => 10)).toHaveProperty(
        'valid',
        true
    );
});

test('Func - 2', async () => {
    const validator = new SchemaRegistry().addSchema(
        'something',
        ({ func, string, object }) =>
            object({
                name: string(),
                f: func()
            })
    );
    expect(
        await validator.schemas.something.validate({
            name: '123',
            f: 324
        })
    ).toHaveProperty('valid', false);
    expect(
        await validator.schemas.something.validate({
            name: '1234',
            f: () => 10
        })
    ).toHaveProperty('valid', true);
});

test('Func - 3', async () => {
    const validator = new SchemaRegistry().addSchema(
        'something',
        ({ func, string, object }) =>
            object({
                name: string(),
                f: func().optional()
            })
    );

    expect(
        await validator.schemas.something.validate({
            name: '123',
            f: 324
        })
    ).toHaveProperty('valid', false);
    expect(
        await validator.schemas.something.validate({
            name: '1234'
        })
    ).toHaveProperty('valid', true);
});

test('Func - 3', async () => {
    const validator = new SchemaRegistry().addSchema(
        'something',
        ({ func, string, object, union }) =>
            object({
                name: string(),
                f: union(func(), object().canHaveUnknownProps()).optional()
            })
    );

    expect(
        await validator.schemas.something.validate({
            name: '123',
            f: 324
        })
    ).toHaveProperty('valid', false);
    expect(
        await validator.schemas.something.validate({
            name: '1234'
        })
    ).toHaveProperty('valid', true);
    expect(
        await validator.schemas.something.validate({
            name: '1234',
            f: { a: 34 }
        })
    ).toHaveProperty('valid', true);
    expect(
        await validator.schemas.something.validate({
            name: '1234',
            f: () => 20
        })
    ).toHaveProperty('valid', true);
    expect(
        await validator.schemas.something.validate({
            name: '1234',
            f: '2345'
        })
    ).toHaveProperty('valid', false);
});

test('External Schema - 1', async () => {
    const validator1 = new SchemaRegistry().addSchema(
        'person',
        ({ object, number }) =>
            object({
                age: number().min(0),
                marriedAt: number().min(18)
            })
    );

    const validator2 = new SchemaRegistry().addSchema(
        'company',
        ({ object, string }) =>
            object({
                name: string(),
                director: validator1.schemas.person.schema.optional()
            })
    );

    const result = await validator2.schemas.company.validate({
        name: 'Some',
        director: {
            age: 40,
            marriedAt: 22
        }
    });

    expect(result).toHaveProperty('valid', true);

    const result2 = await validator2.schemas.company.validate({
        name: 'Some',
        director: {
            age: -10,
            marriedAt: 22
        }
    });

    expect(result2).toHaveProperty('valid', false);
});

test('External Schema - 2', async () => {
    const validator1 = new SchemaRegistry()
        .addSchema('address', ({ object, string }) =>
            object({
                city: string(),
                street: string().addValidator((v) => ({ valid: v.length > 0 }))
            }).addValidator((val) => ({ valid: val.city.length > 0 }))
        )
        .addSchema('person', ({ object, number, alias }) =>
            object({
                age: number().min(0),
                marriedAt: number()
                    .min(18)
                    .addValidator((v) => ({ valid: v > 10 })),
                address: alias('address')
            }).addValidator((val) => ({ valid: val.marriedAt < val.age }))
        );

    const validator2 = new SchemaRegistry().addSchema(
        'company',
        ({ object, string, external }) =>
            object({
                name: string().addValidator(() => ({ valid: true })),
                director: external(validator1, 'person')
            }).addValidator(() => ({ valid: true }))
    );

    const result = await validator2.schemas.company.validate({
        name: 'Some',
        director: {
            age: 40,
            marriedAt: 22,
            address: {
                city: 'City upon a Hill',
                street: '123 Blossom street'
            }
        }
    });

    expect(result).toHaveProperty('valid', true);

    const result2 = await validator2.schemas.company.validate({
        name: 'Some',
        director: {
            age: -10,
            marriedAt: 22,
            address: {
                city: 'City upon a Hill',
                street: '123 Blossom street'
            }
        }
    });

    expect(result2).toHaveProperty('valid', false);
});

test('Empty Validators Bug', async () => {
    const isValidEmail = (s) => {
        if (typeof s !== 'string') return false;
        const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,8}$/;
        return regex.test(s);
    };
    const validator = new SchemaRegistry().addSchema(
        'Report',
        ({ object, array, string }) =>
            object({
                recepients: array()
                    .ofType(
                        string().addValidator((val) => {
                            if (isValidEmail(val)) {
                                return { valid: true };
                            }
                            return {
                                valid: false,
                                errors: [`${val} is not a valid email`]
                            };
                        })
                    )
                    .addValidator((val) => {
                        if (!Array.isArray(val)) {
                            return {
                                valid: false,
                                errors: ['not an array']
                            };
                        }
                        const map = {};
                        const lowerCased = val.map((v) => v.toLowerCase());
                        for (let i = 0; i < lowerCased.length; i++) {
                            if (lowerCased[i] in map) {
                                return {
                                    valid: false,
                                    errors: ['no duplicates allowed']
                                };
                            }
                            map[lowerCased[i]] = true;
                        }
                        return { valid: true };
                    })
            })
    );

    const result1 = await validator.schemas.Report.validate({
        recepients: ['user1@domain1.com', 'user2@domain1.com']
    });

    expect(result1).toHaveProperty('valid', true);

    const result2 = await validator.schemas.Report.validate({
        recepients: ['user1@domain1.com', 'user1@domain1.com']
    });

    expect(result2).toHaveProperty('valid', false);
});
