import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ObjectStorage } from '../src/index.js';

/** Shared behavioral suite; intentionally not part of the published package. */
export function storageContract(create: () => ObjectStorage) {
    describe('object storage contract', () => {
        let storage: ObjectStorage;
        let keys: Set<string>;
        const key = (name: string) => {
            keys.add(name);
            return name;
        };
        beforeEach(() => {
            storage = create();
            keys = new Set();
        });
        afterEach(async () => {
            try {
                for (const name of keys) await storage.delete(name);
            } finally {
                await storage.close();
            }
        });
        it('round trips bytes and headers without treating ETags as checksums', async () => {
            const name = key('folder/雪 #?%2F.bin');
            const bytes = Buffer.from([0, 1, 255, 42]);
            expect(
                await storage.put(name, bytes, {
                    contentType: 'application/x-test',
                    cacheControl: 'public, max-age=3600',
                    contentDisposition: 'inline',
                    metadata: { Owner: 'test' },
                    size: bytes.length
                })
            ).toMatchObject({ key: name, size: bytes.length });
            const expected = {
                key: name,
                size: bytes.length,
                contentType: 'application/x-test',
                cacheControl: 'public, max-age=3600',
                contentDisposition: 'inline',
                metadata: { owner: 'test' }
            };
            expect(await storage.stat(name)).toMatchObject(expected);
            const read = await storage.get(name);
            expect(read).toMatchObject(expected);
            const chunks = [];
            for await (const chunk of read.body) chunks.push(chunk);
            expect(Buffer.concat(chunks)).toEqual(bytes);
        });
        it('supports empty bodies and replaces existing objects', async () => {
            const name = key('replace');
            await storage.put(name, Buffer.from('old'));
            await storage.put(name, new Uint8Array());
            expect(await storage.stat(name)).toMatchObject({ size: 0 });
            const read = await storage.get(name);
            const chunks = [];
            for await (const chunk of read.body) chunks.push(chunk);
            expect(Buffer.concat(chunks)).toHaveLength(0);
        });
        it('consumes unknown-length streams and preserves copied metadata', async () => {
            const from = key('source #?.txt');
            const to = key('copy/result');
            const body = Readable.from([
                Buffer.from('first'),
                Buffer.from('second')
            ]);
            await storage.put(from, body, {
                contentType: 'text/plain',
                metadata: { label: 'copy' }
            });
            expect(body.destroyed).toBe(true);
            await storage.put(to, Buffer.from('replaced'));
            expect(await storage.copy(from, to)).toMatchObject({
                key: to,
                size: 11
            });
            expect(await storage.stat(to)).toMatchObject({
                contentType: 'text/plain',
                metadata: { label: 'copy' }
            });
            const read = await storage.get(to);
            const chunks = [];
            for await (const chunk of read.body) chunks.push(chunk);
            expect(Buffer.concat(chunks).toString()).toBe('firstsecond');
        });
        it('distinguishes missing reads from stat and idempotent deletion', async () => {
            const name = key('missing');
            expect(await storage.stat(name)).toBeUndefined();
            await expect(storage.get(name)).rejects.toMatchObject({
                code: 'not_found'
            });
            await expect(
                storage.copy(name, key('copy-missing'))
            ).rejects.toMatchObject({ code: 'not_found' });
            await storage.delete(name);
            await storage.delete(name);
        });
        it('rejects pre-aborted operations and closes supplied streams', async () => {
            const signal = AbortSignal.abort();
            const name = key('aborted');
            const body = new Readable({ read() {} });
            await expect(
                storage.put(name, body, { signal })
            ).rejects.toMatchObject({ code: 'aborted' });
            expect(body.destroyed).toBe(true);
            await expect(storage.get(name, { signal })).rejects.toMatchObject({
                code: 'aborted'
            });
            await expect(storage.stat(name, { signal })).rejects.toMatchObject({
                code: 'aborted'
            });
            await expect(
                storage.copy(name, name, { signal })
            ).rejects.toMatchObject({ code: 'aborted' });
            await expect(
                storage.delete(name, { signal })
            ).rejects.toMatchObject({ code: 'aborted' });
        });
    });
}
