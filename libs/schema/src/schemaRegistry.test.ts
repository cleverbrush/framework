import { deepEqual } from '@cleverbrush/deep';

import { ObjectSchema } from './schema.js';
import SchemaRegistry from './schemaRegistry.js';

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

test('Preprocessors - 1', async () => {
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
