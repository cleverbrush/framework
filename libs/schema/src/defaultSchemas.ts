import { DefaultSchemaType, Schema } from './schema.js';

export const defaultSchemas: { [key in DefaultSchemaType]?: Schema } = {
    alias: {
        type: 'alias',
        // TODO: remove
        schemaName: '',
        isRequired: true,
        isNullable: false
    },
    number: {
        type: 'number',
        isRequired: true,
        isNullable: false,
        ensureNotNaN: true,
        ensureIsFinite: true
    },
    boolean: {
        type: 'boolean',
        isRequired: true,
        isNullable: false
    },
    string: {
        type: 'string',
        isRequired: true,
        isNullable: false
    },
    array: {
        type: 'array',
        isRequired: true,
        isNullable: false
    },
    object: {
        type: 'object',
        noUnknownProperties: true,
        isNullable: false,
        isRequired: true
    },
    function: {
        type: 'function',
        isRequired: true,
        isNullable: false
    }
};
