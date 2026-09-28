import { object, schemaRef, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { withStandardJsonSchema } from './standardJsonSchema.js';
import { toJsonSchema } from './toJsonSchema.js';

describe('named reference JSON Schema', () => {
    it.each([
        '2020-12',
        '07'
    ] as const)('keeps annotations outside the definition in draft %s', draft => {
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

    it('keeps final local default and nullability modifiers', () => {
        const target = string().nullable().schemaName('Name');
        const ref = schemaRef(target).notNullable().optional().default('new');
        const schema = object({ name: ref });
        const json = toJsonSchema(schema) as any;
        expect(schema.parse({})).toEqual({ name: 'new' });
        expect(json.required).toEqual(['name']);
        expect(json.properties.name.default).toBe('new');
        expect(json.properties.name.allOf).toEqual([
            { type: ['string', 'null'] },
            { not: { type: 'null' } }
        ]);
        const nullableAgain = toJsonSchema(ref.nullable());
        expect(nullableAgain.anyOf).toBeDefined();
        expect(toJsonSchema(ref.readonly()).readOnly).toBe(true);
    });

    it('retains identical Standard JSON Schema views', () => {
        const ref = schemaRef(string().schemaName('Name'))
            .optional()
            .describe('A name');
        const standard = withStandardJsonSchema(ref)['~standard'].jsonSchema;
        expect(standard.input({ target: 'draft-2020-12' })).toEqual(
            standard.output({ target: 'draft-2020-12' })
        );
    });
});
