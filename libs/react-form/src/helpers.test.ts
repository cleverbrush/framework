import { object, string } from '@cleverbrush/schema';
import { expect, it } from 'vitest';
import {
    buildDescriptorPathMap,
    buildSelectorFromPath,
    ensureNestedStructure,
    getDescriptorPath,
    getSchemaType,
    isErrorPathMatch
} from './helpers.js';

it('handles absent descriptor paths and incomplete external descriptor trees', () => {
    const schema = object({
        name: string(),
        nested: object({ city: string() })
    });
    expect(buildDescriptorPathMap({} as any, schema).size).toBe(0);
    expect(getDescriptorPath({} as any, new Map())).toBe('');
    expect(buildSelectorFromPath('nested.city')({})).toBeUndefined();
    expect(
        buildSelectorFromPath('nested.city')({ nested: { city: 'Paris' } })
    ).toBe('Paris');
    expect(getSchemaType({ introspect: () => ({}) } as any)).toBe('unknown');
    expect(ensureNestedStructure(null, schema)).toEqual({ nested: {} });
});

it('matches only the field itself, its validators and nested fields', () => {
    for (const path of ['$.name', '$.name.child', '$.name($validators[0])'])
        expect(isErrorPathMatch(path, '$.name')).toBe(true);
    expect(isErrorPathMatch('$.names', '$.name')).toBe(false);
});

it('handles introspection adapters without object properties', () => {
    const external = { introspect: () => ({ type: 'object' }) } as any;
    expect(buildDescriptorPathMap({} as any, external).size).toBe(0);
    expect(ensureNestedStructure(null, external)).toEqual({});
    expect(ensureNestedStructure(undefined, external)).toEqual({});
    const values = { name: 'Ada' };
    expect(ensureNestedStructure(values, external)).toBe(values);
});
