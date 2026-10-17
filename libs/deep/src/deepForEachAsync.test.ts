import { describe, expect, it } from 'vitest';
import { deepForEachAsync } from './deepForEachAsync.js';

type Node = { id: string; children?: Node[]; other?: Node[] };
describe('deepForEachAsync', () => {
    it('awaits each parent and child before starting the next sibling', async () => {
        const events: string[] = [];
        const input = [{ id: 'a', children: [{ id: 'b' }] }, [{ id: 'c' }]];
        await deepForEachAsync<Node>(input, async node => {
            events.push('start:' + node.id);
            await Promise.resolve();
            events.push('end:' + node.id);
        });
        expect(events).toEqual([
            'start:a',
            'end:a',
            'start:b',
            'end:b',
            'start:c',
            'end:c'
        ]);
        expect(input[0]).toEqual({ id: 'a', children: [{ id: 'b' }] });
    });
    it('uses only the selected own child array and binds context', async () => {
        const context = { ids: [] as string[] };
        await deepForEachAsync(
            { id: 'a', children: [{ id: 'b' }], other: [{ id: 'c' }] },
            function (this: typeof context, node: Node) {
                this.ids.push(node.id);
            },
            context,
            { optimizer: 'children' }
        );
        expect(context.ids).toEqual(['a', 'b']);
    });
    it('skips filtered subtrees but keeps visiting later siblings', async () => {
        const ids: string[] = [];
        await deepForEachAsync<Node>(
            [{ id: 'skip', children: [{ id: 'hidden' }] }, { id: 'keep' }],
            node => ids.push(node.id),
            undefined,
            { validation: node => node.id !== 'skip' }
        );
        expect(ids).toEqual(['keep']);
    });
    it('ignores primitives, null, dates and custom objects', async () => {
        const seen: object[] = [];
        class Opaque {}
        await deepForEachAsync(
            [
                1,
                null,
                undefined,
                'text',
                new Date(),
                new Opaque(),
                { id: 'ok' }
            ],
            node => seen.push(node)
        );
        expect(seen).toEqual([{ id: 'ok' }]);
    });
    it('ignores ordinary object-valued properties and inherited arrays', async () => {
        const input = { id: 'root', nested: { id: 'not-a-child' } };
        const ids: string[] = [];
        await deepForEachAsync<Node>(
            input,
            node => ids.push(node.id),
            undefined,
            { optimizer: 'children' }
        );
        expect(ids).toEqual(['root']);
        const inherited = Object.create({ children: [{ id: 'inherited' }] });
        await deepForEachAsync(inherited, () => {
            throw new Error('opaque prototype');
        });
    });
    it('visits null-prototype records and repeated references', async () => {
        const shared = Object.assign(Object.create(null), { id: 'shared' });
        const ids: string[] = [];
        await deepForEachAsync<Node>([shared, shared], node =>
            ids.push(node.id)
        );
        expect(ids).toEqual(['shared', 'shared']);
    });
    it('rejects record and array cycles', async () => {
        const record: Node = { id: 'cycle' };
        record.children = [record];
        const array: unknown[] = [];
        array.push(array);
        for (const input of [record, array]) {
            await expect(deepForEachAsync(input, () => {})).rejects.toThrow(
                TypeError
            );
        }
    });
    it('propagates synchronous and asynchronous visitor failures', async () => {
        const failure = new Error('visitor failed');
        for (const visitor of [
            () => {
                throw failure;
            },
            async () => {
                throw failure;
            }
        ]) {
            await expect(deepForEachAsync([{}], visitor)).rejects.toBe(failure);
        }
    });
    it('propagates validation failures', async () => {
        const failure = new Error('validation failed');
        await expect(
            deepForEachAsync({}, () => {}, undefined, {
                validation: () => {
                    throw failure;
                }
            })
        ).rejects.toBe(failure);
    });
});
