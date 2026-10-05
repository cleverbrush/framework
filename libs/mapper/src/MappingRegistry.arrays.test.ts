import { array, number, object, string } from '@cleverbrush/schema';
import { expect, it } from 'vitest';
import { Mapper, MappingRegistry } from './MappingRegistry.js';

it('maps nested primitive arrays synchronously and asynchronously', async () => {
    const schema = object({ rows: array(array(number())).optional() });
    const mapping = new Mapper(schema, schema)
        .for(t => t.rows)
        .from(s => s.rows);
    const asyncMap = mapping.getMapper();
    const syncMap = mapping.getSyncMapper();
    for (const input of [{}, { rows: null }, { rows: [[1, 2], [], null, 7] }]) {
        expect(await asyncMap(input as any)).toEqual(syncMap(input as any));
    }
    expect(syncMap({ rows: [[1, 2], []] })).toEqual({ rows: [[1, 2], []] });
    await expect(asyncMap({ rows: 'invalid' } as any)).rejects.toThrow(
        'Expected array'
    );
    expect(() => syncMap({ rows: 'invalid' } as any)).toThrow('Expected array');
});

it('skips missing nested source descriptors in both executors', async () => {
    const source = object({ child: object({ name: string() }) });
    const target = object({ name: string() });
    const mapping = new Mapper(source, target)
        .for(t => t.name)
        .from(s => s.child.name);
    expect(await mapping.getMapper()({} as any)).toEqual({});
    expect(mapping.getSyncMapper()({} as any)).toEqual({});
});

it('ignores explicitly excluded target fields in both executors', async () => {
    const source = object({ id: number() });
    const target = object({ id: number(), ignored: string().optional() });
    const mapping = new Mapper(source, target)
        .for(t => t.id)
        .from(s => s.id)
        .for(t => t.ignored)
        .ignore();
    expect(await mapping.getMapper()({ id: 1 })).toEqual({ id: 1 });
    expect(mapping.getSyncMapper()({ id: 1 })).toEqual({ id: 1 });
});

it('copies object arrays without requiring a registry', async () => {
    const schema = object({ items: array(object({ id: number() })) });
    const mapping = new Mapper(schema, schema)
        .for(t => t.items)
        .from(s => s.items);
    const input = { items: [{ id: 1 }, { id: 2 }] };
    expect(await mapping.getMapper()(input)).toEqual(input);
    expect(mapping.getSyncMapper()(input)).toEqual(input);
});

it('copies assignable arrays without projecting away extra source fields', async () => {
    const from = object({
        items: array(object({ id: number(), name: string() }))
    });
    const to = object({ items: array(object({ id: number() })) });
    const mapping = new Mapper(from, to).for(t => t.items).from(s => s.items);
    const input = { items: [{ id: 1, name: 'Example' }] };
    expect(await mapping.getMapper()(input)).toEqual(input);
    expect(mapping.getSyncMapper()(input)).toEqual(input);
});

it('awaits asynchronous element mappings through nested arrays', async () => {
    const item = object({ id: number() });
    const dto = object({ label: string() });
    const from = object({ items: array(array(item)) });
    const to = object({ items: array(array(dto)) });
    const registry = new MappingRegistry()
        .configure(item, dto, mapper =>
            mapper.for(t => t.label).compute(async s => String(s.id))
        )
        .configure(from, to, mapper => mapper);
    expect(
        await registry.getMapper(from, to)({ items: [[{ id: 2 }], []] })
    ).toEqual({ items: [[{ label: '2' }], []] });
    expect(() => (registry as any).getSyncMapper(from, to)).toThrow();
});

it('skips unavailable nested array paths in both executors', async () => {
    const from = object({ parent: object({ items: array(number()) }) });
    const to = object({ items: array(number()).optional() });
    const mapping = new Mapper(from, to)
        .for(t => t.items)
        .from(s => s.parent.items);
    expect(await mapping.getMapper()({} as any)).toEqual({});
    expect(mapping.getSyncMapper()({} as any)).toEqual({});
});

it('rejects primitive/object mixed array element types instead of copying them', () => {
    const from = object({ items: array(number()) });
    const to = object({ items: array(object({ id: number() })) });
    expect(() =>
        (new MappingRegistry() as any).configure(from, to, (m: any) => m)
    ).toThrow(/not mapped/);
});

it('rejects asymmetric object, primitive and nested array element shapes', () => {
    for (const [left, right] of [
        [object({ id: number() }), number()],
        [array(number()), number()],
        [number(), array(number())],
        [object({ id: number(), name: string() }), object({ id: number() })]
    ]) {
        const from = object({ items: array(left) });
        const to = object({ items: array(right) });
        expect(() =>
            (new MappingRegistry() as any).configure(from, to, (m: any) => m)
        ).toThrow(/not mapped/);
    }
});

it('requires explicit mappings for incompatible nested object shapes', () => {
    const from = object({ child: object({ id: number(), name: string() }) });
    for (const child of [
        object({ id: number() }),
        object({ id: number(), label: string() })
    ]) {
        const to = object({ child });
        expect(() =>
            (new MappingRegistry() as any).configure(from, to, (m: any) => m)
        ).toThrow(/not mapped/);
    }
});

it('does not configure incompatible array elements automatically', () => {
    const source = object({ rows: array(array(number())) });
    const target = object({ rows: array(array(string())) });
    const registry = new MappingRegistry();
    expect(() =>
        (registry as any).configure(source, target, (mapper: any) => mapper)
    ).toThrow(/not mapped/);
    const objectSource = object({ rows: array(object({ id: number() })) });
    const objectTarget = object({ rows: array(object({ name: string() })) });
    expect(() =>
        (registry as any).configure(
            objectSource,
            objectTarget,
            (mapper: any) => mapper
        )
    ).toThrow(/not mapped/);
});

it('copies equivalent object array elements and preserves missing optional nested objects', async () => {
    const item = object({ id: number() });
    const schema = object({ rows: array(item), child: item.optional() });
    const registry = new MappingRegistry().configure(
        schema,
        schema,
        mapper => mapper
    );
    const syncMap = registry.getSyncMapper(schema, schema);
    expect(syncMap({ rows: [{ id: 1 }] })).toEqual({ rows: [{ id: 1 }] });
    expect(
        await registry.getMapper(schema, schema)({ rows: [{ id: 1 }] })
    ).toEqual({ rows: [{ id: 1 }] });
    expect(syncMap({ rows: [{ id: 2 }], child: { id: 3 } })).toEqual({
        rows: [{ id: 2 }],
        child: { id: 3 }
    });
});

it('maps nested registered arrays and skips unavailable optional source paths', async () => {
    const sourceItem = object({ id: number() });
    const targetItem = object({ label: string() });
    const source = object({
        child: sourceItem,
        rows: array(array(sourceItem))
    });
    const target = object({
        child: targetItem,
        rows: array(array(targetItem))
    });
    const registry = new MappingRegistry()
        .configure(sourceItem, targetItem, mapper =>
            mapper.for(t => t.label).compute(s => String(s.id))
        )
        .configure(source, target, mapper => mapper);
    const syncMap = registry.getSyncMapper(source, target);
    expect(syncMap({ child: undefined, rows: [] } as any)).toEqual({
        rows: []
    });
    expect(
        await registry.getMapper(
            source,
            target
        )({ child: undefined, rows: [] } as any)
    ).toEqual({ rows: [] });
    expect(syncMap({ rows: [[{ id: 2 }]] } as any)).toEqual({
        rows: [[{ label: '2' }]]
    });
    expect(
        await registry.getMapper(source, target)({ rows: [[{ id: 2 }]] } as any)
    ).toEqual({ rows: [[{ label: '2' }]] });
});
