import {
    array,
    decode,
    lazy,
    number,
    object,
    record,
    schemaRef,
    string,
    tuple,
    union
} from '@cleverbrush/schema';
import { describe, expect, it, vi } from 'vitest';
import { withStandardJsonSchema } from './standardJsonSchema.js';
import { toJsonSchema } from './toJsonSchema.js';

describe('boundary JSON Schema views', () => {
    it('does not transfer output nullability or output defaults to input', () => {
        const schema = decode(string(), number().nullable(), () => null);
        expect(toJsonSchema(schema, { $schema: false, mode: 'input' })).toEqual(
            { allOf: [{ type: 'string' }] }
        );
        expect(toJsonSchema(schema, { $schema: false }).allOf).toEqual([
            { type: ['integer', 'null'] }
        ]);
        const withDefault = decode(string(), number(), Number).default(3);
        expect(
            toJsonSchema(withDefault, { mode: 'input' }).default
        ).toBeUndefined();
        expect(toJsonSchema(withDefault).default).toBe(3);
    });
    it('exports declared input/output without running converters', () => {
        const converter = vi.fn(Number);
        const size = decode(
            string().minLength(1),
            number().isInteger().min(1),
            converter
        );
        expect(toJsonSchema(size, { $schema: false, mode: 'input' })).toEqual({
            allOf: [{ type: 'string', minLength: 1 }]
        });
        expect(toJsonSchema(size, { $schema: false })).toEqual({
            allOf: [{ type: 'integer', minimum: 1 }]
        });
        const standard = withStandardJsonSchema(size)['~standard'].jsonSchema;
        expect(standard.input({ target: 'draft-2020-12' })).not.toEqual(
            standard.output({ target: 'draft-2020-12' })
        );
        expect(converter).not.toHaveBeenCalled();
    });

    it('tracks input defaults separately from required output', () => {
        const size = decode(string().default('1'), number(), Number);
        const schema = object({ size, title: string().default('new') });
        expect(
            toJsonSchema(schema, { mode: 'input' }).required
        ).toBeUndefined();
        expect(toJsonSchema(schema).required).toEqual(['size', 'title']);
    });

    it.each([
        '2020-12',
        '07'
    ] as const)('keeps ref annotations outside the definition in draft %s', draft => {
        const user = object({ name: string() }).schemaName('User');
        const schema = object({
            user: schemaRef(user),
            previous: schemaRef(user)
                .nullable()
                .optional()
                .describe('Previous user')
                .example(null)
        });
        const json = toJsonSchema(schema, {
            draft,
            $schema: false,
            nameResolver: s => (s === user ? 'User' : null)
        }) as any;
        expect(json.required).toEqual(['user']);
        expect(json.properties.user).toEqual({
            allOf: [{ $ref: '#/components/schemas/User' }]
        });
        expect(json.properties.previous).toMatchObject({
            description: 'Previous user',
            examples: [null],
            anyOf: [
                { allOf: [{ $ref: '#/components/schemas/User' }] },
                { type: 'null' }
            ]
        });
        expect(user.introspect().description).toBeUndefined();
    });

    it('projects nested containers and lazy wrappers', () => {
        const size = decode(string(), number(), Number);
        const schema = object({
            list: array(size),
            pair: tuple([size]),
            values: record(string(), size),
            option: union(size).or(string()),
            later: lazy(() => size)
        });
        const input = JSON.stringify(toJsonSchema(schema, { mode: 'input' }));
        const output = JSON.stringify(toJsonSchema(schema));
        expect(input).not.toContain('"type":"integer"');
        expect(output).toContain('"type":"integer"');
    });
});
