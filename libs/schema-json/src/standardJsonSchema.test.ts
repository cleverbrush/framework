import {
    array,
    boolean,
    number,
    object,
    string,
    union
} from '@cleverbrush/schema';
import type { StandardJSONSchemaV1 } from '@standard-schema/spec';
import { describe, expect, test } from 'vitest';
import { withStandardJsonSchema } from './standardJsonSchema.js';

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe('withStandardJsonSchema', () => {
    test('returns an object with ~standard.jsonSchema converter', () => {
        const schema = string();
        const wrapped = withStandardJsonSchema(schema);
        const std = wrapped['~standard'];
        expect(std.version).toBe(1);
        expect(std.vendor).toBe('@cleverbrush/schema');
        expect(typeof std.validate).toBe('function');
        expect(typeof std.jsonSchema).toBe('object');
        expect(typeof std.jsonSchema.input).toBe('function');
        expect(typeof std.jsonSchema.output).toBe('function');
    });

    // -----------------------------------------------------------------------
    // JSON Schema generation
    // -----------------------------------------------------------------------

    test('input() produces JSON Schema for string', () => {
        const wrapped = withStandardJsonSchema(string().minLength(1));
        const js = wrapped['~standard'].jsonSchema.input({
            target: 'draft-2020-12'
        });
        expect(js).toEqual({ type: 'string', minLength: 1 });
    });

    test('output() produces JSON Schema for string', () => {
        const wrapped = withStandardJsonSchema(string().minLength(1));
        const js = wrapped['~standard'].jsonSchema.output({
            target: 'draft-2020-12'
        });
        expect(js).toEqual({ type: 'string', minLength: 1 });
    });

    test('draft-07 target works', () => {
        const wrapped = withStandardJsonSchema(boolean());
        const js = wrapped['~standard'].jsonSchema.input({
            target: 'draft-07'
        });
        expect(js).toEqual({ type: 'boolean' });
    });

    test('openapi-3.0 target works', () => {
        const wrapped = withStandardJsonSchema(boolean());
        const js = wrapped['~standard'].jsonSchema.input({
            target: 'openapi-3.0'
        });
        expect(js).toEqual({ type: 'boolean' });
    });

    test('unsupported target throws', () => {
        const wrapped = withStandardJsonSchema(string());
        expect(() =>
            wrapped['~standard'].jsonSchema.input({
                target: 'draft-04' as StandardJSONSchemaV1.Target
            })
        ).toThrow('unsupported JSON Schema target');
    });

    test('complex object schema produces correct JSON Schema', () => {
        const schema = object({
            name: string().minLength(1),
            age: number().optional()
        });
        const wrapped = withStandardJsonSchema(schema);
        const js = wrapped['~standard'].jsonSchema.output({
            target: 'draft-2020-12'
        });
        expect(js).toEqual({
            type: 'object',
            properties: {
                name: { type: 'string', minLength: 1 },
                age: { type: 'integer' }
            },
            required: ['name'],
            additionalProperties: false
        });
    });

    test('array schema produces correct JSON Schema', () => {
        const wrapped = withStandardJsonSchema(array(string()));
        const js = wrapped['~standard'].jsonSchema.input({
            target: 'draft-2020-12'
        });
        expect(js).toEqual({ type: 'array', items: { type: 'string' } });
    });

    test('union/enum schema produces correct JSON Schema', () => {
        const schema = union(string('a')).or(string('b')).or(string('c'));
        const wrapped = withStandardJsonSchema(schema);
        const js = wrapped['~standard'].jsonSchema.input({
            target: 'draft-2020-12'
        });
        expect(js).toEqual({ enum: ['a', 'b', 'c'] });
    });

    // -----------------------------------------------------------------------
    // Preserves original schema behaviour
    // -----------------------------------------------------------------------

    test('wrapped schema still validates via ~standard.validate', () => {
        const wrapped = withStandardJsonSchema(string());
        const pass = wrapped['~standard'].validate('hello');
        expect(pass).toEqual({ value: 'hello' });

        const fail = wrapped['~standard'].validate(123);
        expect(fail).toHaveProperty('issues');
    });

    test('wrapped schema still works as a regular schema', () => {
        const wrapped = withStandardJsonSchema(object({ name: string() }));
        const result = wrapped.validate({ name: 'Alice' });
        expect(result.valid).toBe(true);
        expect(result.object).toEqual({ name: 'Alice' });
    });

    test('wrapped schema introspect still works', () => {
        const wrapped = withStandardJsonSchema(string());
        const info = wrapped.introspect();
        expect(info.type).toBe('string');
    });

    // -----------------------------------------------------------------------
    // No $schema header in output (bare JSON Schema body)
    // -----------------------------------------------------------------------

    test('JSON Schema output does not include $schema header', () => {
        const wrapped = withStandardJsonSchema(string());
        const js = wrapped['~standard'].jsonSchema.input({
            target: 'draft-2020-12'
        });
        expect(js).not.toHaveProperty('$schema');
    });
});
