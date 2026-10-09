import { object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { withStandardJsonSchema } from './standardJsonSchema.js';
import { toJsonSchema } from './toJsonSchema.js';

describe('named reference JSON Schema', () => {
    it.each(['2020-12', '07'] as const)(
        'keeps annotations outside the definition in draft %s',
        draft => {
            const user = object({ name: string() }).schemaName('User');
            const schema = object({
                user: user,
                previous: user
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
                $ref: '#/components/schemas/User'
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
        }
    );

    it('keeps final local default and nullability modifiers', () => {
        const target = string().nullable().schemaName('Name');
        const ref = target.notNullable().optional().default('new');
        const schema = object({ name: ref });
        const json = toJsonSchema(schema) as any;
        expect(schema.parse({})).toEqual({ name: 'new' });
        expect(json.required).toBeUndefined();
        expect(json.properties.name.default).toBe('new');
        expect(json.properties.name.type).toBe('string');
        expect(json.properties.name.allOf).toBeUndefined();
        const nullableAgain = toJsonSchema(ref.nullable());
        expect(nullableAgain.type).toEqual(['string', 'null']);
        expect(toJsonSchema(ref.readonly()).readOnly).toBe(true);
    });

    it('retains identical Standard JSON Schema views', () => {
        const ref = string().schemaName('Name').optional().describe('A name');
        const standard = withStandardJsonSchema(ref)['~standard'].jsonSchema;
        expect(standard.input({ target: 'draft-2020-12' })).toEqual(
            standard.output({ target: 'draft-2020-12' })
        );
    });

    it.each(['2020-12', '07'] as const)(
        'retains local modifiers before name resolution in draft %s',
        draft => {
            const target = string()
                .nullable()
                .describe('Canonical')
                .schemaName('Name');
            const local = target
                .notNullable()
                .describe('Use')
                .example('Ada')
                .readonly();
            const nameResolver = (s: typeof target) =>
                s.introspect().schemaName ?? null;
            expect(
                toJsonSchema(local, { draft, $schema: false, nameResolver })
            ).toEqual({
                allOf: [
                    { $ref: '#/components/schemas/Name' },
                    { not: { type: 'null' } }
                ],
                description: 'Use',
                examples: ['Ada'],
                readOnly: true
            });
            expect(
                toJsonSchema(local, { draft, $schema: false }).allOf
            ).toEqual([
                { type: ['string', 'null'], description: 'Canonical' },
                { not: { type: 'null' } }
            ]);
            expect(
                toJsonSchema(local.nullable(), {
                    draft,
                    $schema: false,
                    nameResolver
                }).allOf
            ).toEqual([{ $ref: '#/components/schemas/Name' }]);
            expect(target.introspect().description).toBe('Canonical');
        }
    );

    it('exports shape/rule derivatives inline while keeping nested named children', () => {
        const name = string().schemaName('Name');
        const user = object({ name }).schemaName('User');
        const partial = user.partial().describe('Patch');
        const json = toJsonSchema(partial, {
            $schema: false,
            nameResolver: s => s.introspect().schemaName ?? null
        }) as any;
        expect(json.type).toBe('object');
        expect(json.required).toBeUndefined();
        expect(json.properties.name.allOf).toEqual([
            { $ref: '#/components/schemas/Name' }
        ]);
        expect(
            toJsonSchema(name.maxLength(3), {
                $schema: false,
                nameResolver: s => s.introspect().schemaName ?? null
            })
        ).toEqual({ type: 'string', maxLength: 3 });
    });
});
