import { array, number, object, string } from '@cleverbrush/schema';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Mapper, MapperConfigurationError, mapper } from './index.js';

const Source = object({ id: number(), title: string() });
const Target = object({ id: number(), label: string() });

describe('inferred synchronous mapping', () => {
    it('returns an ordinary value and preserves the async API', async () => {
        const compute = vi.fn((s: { title: string }) => s.title.toUpperCase());
        const registry = mapper().configure(Source, Target, m =>
            m.for(t => t.label).compute(compute)
        );
        const sync = registry.getSyncMapper(Source, Target);
        expect(compute).not.toHaveBeenCalled();
        const result = sync({ id: 1, title: 'hello' });
        expectTypeOf(result).toEqualTypeOf<{ id: number; label: string }>();
        expect(result).toEqual({ id: 1, label: 'HELLO' });
        const asyncResult = registry.getMapper(
            Source,
            Target
        )({ id: 1, title: 'hello' });
        expect(asyncResult).toBeInstanceOf(Promise);
        expect(await asyncResult).toEqual(result);
    });

    it('rejects async computations at compile time and runtime', () => {
        const registry = mapper().configure(Source, Target, m =>
            m.for(t => t.label).compute(async s => s.title)
        );
        expect(() => {
            // @ts-expect-error asynchronous mapping cannot be retrieved synchronously
            registry.getSyncMapper(Source, Target);
        }).toThrow(MapperConfigurationError);
    });

    it('tracks nested objects and arrays including explicit from', () => {
        const Parent = object({ child: Source, children: array(Source) });
        const Dto = object({ child: Target, children: array(Target) });
        const registry = mapper()
            .configure(Source, Target, m =>
                m.for(t => t.label).compute(s => s.title)
            )
            .configure(Parent, Dto, m =>
                m.for(t => t.children).from(s => s.children)
            );
        expect(
            registry.getSyncMapper(
                Parent,
                Dto
            )({
                child: { id: 1, title: 'one' },
                children: [{ id: 2, title: 'two' }]
            })
        ).toEqual({
            child: { id: 1, label: 'one' },
            children: [{ id: 2, label: 'two' }]
        });
        const asyncRegistry = mapper()
            .configure(Source, Target, m =>
                m.for(t => t.label).compute(async s => s.title)
            )
            .configure(Parent, Dto, m => m);
        expect(() => {
            // @ts-expect-error nested async mapping makes the parent async
            asyncRegistry.getSyncMapper(Parent, Dto);
        }).toThrow(MapperConfigurationError);
    });

    it('uses final overrides, not discarded async computations', () => {
        const registry = mapper().configure(Source, Target, m =>
            m
                .for(t => t.label)
                .compute(async s => s.title)
                .for(t => t.label)
                .compute(s => s.title)
        );
        expect(
            registry.getSyncMapper(Source, Target)({ id: 3, title: 'three' })
        ).toEqual({ id: 3, label: 'three' });
    });

    it('guards functions returning disguised thenables without probing them', () => {
        const registry = mapper().configure(Source, Target, m =>
            m
                .for(t => t.label)
                // biome-ignore lint/suspicious/noThenProperty: test a deliberately disguised thenable
                .compute(() => ({ then() {} }) as unknown as string)
        );
        expect(() =>
            registry.getSyncMapper(Source, Target)({ id: 1, title: '' })
        ).toThrow(/thenable.*label/);
    });

    it('retains completeness checks for direct builders', () => {
        const direct = new Mapper(Source, Target)
            .for(t => t.id)
            .from(s => s.id)
            .for(t => t.label)
            .compute(s => s.title);
        expect(direct.getSyncMapper()({ id: 1, title: 'one' })).toEqual({
            id: 1,
            label: 'one'
        });
        expect(() => {
            // @ts-expect-error both target properties are still unmapped
            new Mapper(Source, Target).getSyncMapper();
        }).toThrow(/not mapped/);
    });

    it('rejects conditional promises and async nested arrays without probing callbacks', () => {
        const compute = vi.fn((s: { title: string }) =>
            s.title ? s.title : Promise.resolve('fallback')
        );
        const registry = mapper().configure(Source, Target, m =>
            m.for(t => t.label).compute(compute)
        );
        const Parent = object({ groups: array(array(Source)) });
        const Dto = object({ groups: array(array(Target)) });
        const nested = registry.configure(Parent, Dto, m => m);
        expect(compute).not.toHaveBeenCalled();
        // Non-native async functions cannot be recognized without invoking them;
        // the type system rejects retrieval, and invocation guards the false branch.
        // @ts-expect-error a conditional Promise is still asynchronous
        const unsafe = nested.getSyncMapper(Parent, Dto);
        expect(() => unsafe({ groups: [[{ id: 1, title: '' }]] })).toThrow(
            /thenable/
        );
    });

    it('matches async values and errors for optional arrays and thrown computations', async () => {
        const From = object({ items: array(Source).optional() });
        const To = object({ items: array(Target).optional() });
        const registry = mapper()
            .configure(Source, Target, m =>
                m
                    .for(t => t.label)
                    .compute(s => {
                        if (!s.title) throw new Error('missing title');
                        return s.title;
                    })
            )
            .configure(From, To, m => m);
        const sync = registry.getSyncMapper(From, To);
        const async = registry.getMapper(From, To);
        for (const value of [
            {},
            { items: [] },
            { items: [{ id: 1, title: 'one' }] }
        ])
            expect(sync(value)).toEqual(await async(value));
        const invalid = { items: [{ id: 1, title: '' }] };
        expect(() => sync(invalid)).toThrow('missing title');
        await expect(async(invalid)).rejects.toThrow('missing title');
    });
});
