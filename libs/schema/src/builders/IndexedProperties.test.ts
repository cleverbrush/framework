import { expect, test } from 'vitest';
import { array } from './ArraySchemaBuilder.js';
import { object } from './ObjectSchemaBuilder.js';
import { SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR as key } from './SchemaBuilder.js';
import { string } from './StringSchemaBuilder.js';

const schema = object({
    addresses: array(object({ city: string().minLength(2) })),
    tags: array(string().minLength(2)),
    matrix: array(array(string().minLength(2)))
});
test('indexed descriptors are stable, lazy, typed and preserve arrays when setting', () => {
    const tree = object.getPropertiesFor(schema);
    expect(tree.addresses[0]).toBe(tree.addresses[0]);
    expect(tree.addresses[0].city[key].toJsonPointer()).toBe(
        '/addresses/0/city'
    );
    expect(tree.tags[1][key].toJsonPointer()).toBe('/tags/1');
    expect(tree.matrix[1][0][key].toJsonPointer()).toBe('/matrix/1/0');
    const value: any = {};
    expect(tree.addresses[0].city[key].setValue(value, 'Paris')).toBe(false);
    expect(
        tree.addresses[0].city[key].setValue(value, 'Paris', {
            createMissingStructure: true
        })
    ).toBe(true);
    expect(value).toEqual({ addresses: [{ city: 'Paris' }] });
    expect(tree.addresses[0].city[key].getValue(value)).toEqual({
        success: true,
        value: 'Paris'
    });
    expect(
        tree.matrix[0][0][key].setValue(value, 'ok', {
            createMissingStructure: true
        })
    ).toBe(true);
    expect(value.matrix).toEqual([['ok']]);
    expect((tree.addresses as any)[-1]).toBeUndefined();
    expect((tree.addresses as any)['01']).toBeUndefined();
    expect((tree.addresses as any)[1.5]).toBeUndefined();
});
test.each(['sync', 'async'] as const)(
    'indexed errors use precise descriptors (%s)',
    async mode => {
        const value = {
            addresses: [{ city: '' }, { city: 'Paris' }],
            tags: [''],
            matrix: [['']]
        };
        const result = await (mode === 'sync'
            ? schema.validate(value, { doNotStopOnFirstError: true })
            : schema.validateAsync(value, { doNotStopOnFirstError: true }));
        expect(result.valid).toBe(false);
        expect(result.getErrorsFor(t => t.addresses[0].city).isValid).toBe(
            false
        );
        expect(result.getErrorsFor(t => t.addresses[1].city).isValid).toBe(
            true
        );
        expect(result.getErrorsFor(t => t.tags[0]).isValid).toBe(false);
        expect(result.getErrorsFor(t => t.matrix[0][0]).isValid).toBe(false);
        expect(
            result.getInvalidProperties().map(p => p.descriptor.toJsonPointer())
        ).toEqual(
            expect.arrayContaining([
                '/addresses',
                '/addresses/0/city',
                '/tags',
                '/tags/0',
                '/matrix/0/0'
            ])
        );
    }
);
test('indexed validation works below a nested object and with escaped keys', () => {
    const nested = object({
        profile: object({
            'a/b': array(object({ 'x~y': string().minLength(2) }))
        })
    });
    const result = nested.validate(
        { profile: { 'a/b': [{ 'x~y': '' }] } },
        { doNotStopOnFirstError: true }
    );
    expect(result.getErrorsFor(t => t.profile['a/b'][0]['x~y']).isValid).toBe(
        false
    );
    expect(
        result.getInvalidProperties().map(p => p.descriptor.toJsonPointer())
    ).toContain('/profile/a~1b/0/x~0y');
});
