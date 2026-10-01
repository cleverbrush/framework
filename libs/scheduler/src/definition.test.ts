import { any, number, object } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { testJob } from '../testing/repository-contract.js';
import { jsonValue } from './definition.js';
import { defineJob, InMemoryJobRepository, JobScheduler } from './index.js';

describe('durable boundaries', () => {
    it.each([
        undefined,
        NaN,
        Infinity,
        1n,
        new Date(),
        () => 0,
        // biome-ignore lint/suspicious/noSparseArray: deliberate invalid payload
        [, 1],
        { x: undefined }
    ])('rejects lossy JSON %s', value => {
        expect(() => jsonValue(value, 1024)).toThrow();
    });
    it('rejects cycles, accessors and oversized payloads', () => {
        const array = [1];
        Object.defineProperty(array, '0', {
            get() {
                throw new Error('must not execute');
            }
        });
        expect(() => jsonValue(array, 1024)).toThrow('Unsupported');
        const cyclic: any = {};
        cyclic.self = cyclic;
        expect(() => jsonValue(cyclic, 1024)).toThrow('Cyclic');
        const getter = Object.defineProperty({}, 'value', {
            get() {
                throw new Error('must not execute');
            },
            enumerable: true
        });
        expect(() => jsonValue(getter, 1024)).toThrow('Unsupported');
        expect(() => jsonValue('four', 3)).toThrow('size');
    });
    it('validates schema before persistence and rejects invalid policies', async () => {
        const scheduler = new JobScheduler({
            repository: new InMemoryJobRepository()
        });
        await expect(
            scheduler.enqueue(testJob(), { id: 1 } as any)
        ).rejects.toThrow('validation');
        expect((await scheduler.health()).counts).toEqual({});
        expect(() => testJob({ retry: { maxAttempts: 0 } })).toThrow();
        expect(() =>
            defineJob({
                name: '',
                version: 1,
                input: any(),
                progress: number(),
                output: object({})
            })
        ).toThrow();
    });
});
