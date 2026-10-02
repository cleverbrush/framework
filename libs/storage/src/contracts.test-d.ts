import type { Readable } from 'node:stream';
import { expectTypeOf, it } from 'vitest';
import type { ObjectStorage, StorageBody } from './index.js';

it('accepts Node streams and bytes without provider types', () => {
    expectTypeOf<Buffer>().toExtend<StorageBody>();
    expectTypeOf<Readable>().toExtend<StorageBody>();
    expectTypeOf<ObjectStorage['get']>()
        .returns.resolves.toHaveProperty('body')
        .toEqualTypeOf<Readable>();
    // @ts-expect-error Browser blobs are not server storage bodies.
    const _blob: StorageBody = new Blob();
});
