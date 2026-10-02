import { once } from 'node:events';
import { PassThrough, Readable } from 'node:stream';
import {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CopyObjectCommand,
    CreateMultipartUploadCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
    UploadPartCommand
} from '@aws-sdk/client-s3';
import type { ObjectStorage } from '@cleverbrush/storage';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { S3Storage, type S3StorageOptions } from './S3Storage.js';

const options: S3StorageOptions = {
    endpoint: 'http://localhost:3900',
    region: 'garage',
    bucket: 'assets',
    credentials: { accessKeyId: 'test', secretAccessKey: 'secret' },
    keyPrefix: 'prefix/',
    publicBaseUrl: 'https://cdn.example.test/bucket',
    queueSize: 1
};
const stores: S3Storage[] = [];
function create(extra: Partial<S3StorageOptions> = {}) {
    const storage = new S3Storage({ ...options, ...extra });
    stores.push(storage);
    return storage;
}
afterEach(async () => {
    await Promise.all(stores.splice(0).map(store => store.close()));
    vi.restoreAllMocks();
});

describe('S3 storage', () => {
    it('uses explicit connection and compatibility options without changing public URLs', async () => {
        let client: S3Client;
        const send = vi
            .spyOn(S3Client.prototype, 'send')
            .mockImplementation(async function (this: S3Client) {
                client = this;
                return { ContentLength: 0 };
            } as any);
        const storage = create({ forcePathStyle: false });
        await storage.stat('a b');
        expect(client!.config.forcePathStyle).toBe(false);
        expect(await client!.config.region()).toBe('garage');
        expect(await client!.config.credentials()).toMatchObject(
            options.credentials
        );
        expect(await client!.config.requestChecksumCalculation()).toBe(
            'WHEN_REQUIRED'
        );
        expect(await client!.config.responseChecksumValidation()).toBe(
            'WHEN_REQUIRED'
        );
        expect(send.mock.calls[0][0].input).toMatchObject({
            Bucket: 'assets',
            Key: 'prefix/a b'
        });
        expect(storage.publicUrl('a b')).toBe(
            'https://cdn.example.test/bucket/prefix/a%20b'
        );
        expect(
            create({ publicBaseUrl: undefined }).publicUrl('a')
        ).toBeUndefined();
    });
    it('keeps upload input bounded while the provider is slow', async () => {
        let start!: () => void;
        const ready = new Promise<void>(resolve => {
            start = resolve;
        });
        let parts = 0;
        vi.spyOn(S3Client.prototype, 'send').mockImplementation(
            async (command: any, request: any) => {
                if (command instanceof CreateMultipartUploadCommand)
                    return { UploadId: 'upload' };
                if (command instanceof UploadPartCommand) {
                    if (++parts === 2) start();
                    await new Promise((_, reject) =>
                        request.abortSignal.addEventListener(
                            'abort',
                            () => reject({ name: 'AbortError' }),
                            { once: true }
                        )
                    );
                }
                return {};
            }
        );
        let consumed = 0;
        const chunk = Buffer.alloc(64 * 1024);
        const input = Readable.from(
            (function* () {
                for (let i = 0; i < 1600; i++) {
                    consumed += chunk.length;
                    yield chunk;
                }
            })()
        );
        const storage = create({ queueSize: 2 });
        const writing = storage.put('bounded', input);
        const rejected = expect(writing).rejects.toMatchObject({
            code: 'aborted'
        });
        await ready;
        expect(consumed).toBeLessThan(4 * 5 * 1024 * 1024);
        await storage.close();
        await rejected;
        expect(input.destroyed).toBe(true);
    });
    it.each([
        'normal exit',
        'exception',
        'explicit close'
    ])('await using closes unread downloads exactly once on %s', async exit => {
        const source = new PassThrough();
        vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({
            Body: source,
            ContentLength: 20
        } as never);
        const destroy = vi.spyOn(S3Client.prototype, 'destroy');
        const storage = create();
        const failure = new Error('scope failed');
        let body: Readable | undefined;
        const scoped = (async () => {
            await using owned: ObjectStorage = storage;
            body = (await owned.get('unread')).body;
            if (exit === 'explicit close') await owned.close();
            if (exit === 'exception') throw failure;
        })();
        if (exit === 'exception') await expect(scoped).rejects.toBe(failure);
        else await scoped;
        expect(source.destroyed).toBe(true);
        expect(body?.destroyed).toBe(true);
        await expect(storage.stat('after-disposal')).rejects.toMatchObject({
            code: 'closed'
        });
        await storage.close();
        expect(destroy).toHaveBeenCalledTimes(1);
    });
    it('normalizes failed input streams and aborts their multipart state', async () => {
        const source = new PassThrough();
        const send = vi
            .spyOn(S3Client.prototype, 'send')
            .mockImplementation(async (command: any) => {
                if (command instanceof CreateMultipartUploadCommand)
                    return { UploadId: 'upload' };
                if (command instanceof UploadPartCommand) {
                    source.destroy(new Error('private source details'));
                    return { ETag: 'part' };
                }
                return {};
            });
        const writing = create().put('source-error', source);
        source.write(Buffer.alloc(6 * 1024 * 1024));
        await expect(writing).rejects.toMatchObject({ code: 'provider_error' });
        expect(send.mock.calls.at(-1)![0]).toBeInstanceOf(
            AbortMultipartUploadCommand
        );
    });
    it('owns source errors even when rejected before starting an upload', async () => {
        const body = new Readable({
            read() {},
            destroy(_error, callback) {
                callback(new Error('private pending open failure'));
            }
        });
        const closed = new Promise<void>(resolve =>
            body.once('close', resolve)
        );
        await expect(
            create().put('key', body, { signal: AbortSignal.abort() })
        ).rejects.toMatchObject({ code: 'aborted' });
        await closed;
        expect(body.destroyed).toBe(true);
        expect(body.listenerCount('error')).toBe(0);
    });
    it('releases malformed read responses even when destruction emits an error', async () => {
        const source = new Readable({
            read() {},
            destroy(_error, callback) {
                callback(new Error('private provider details'));
            }
        });
        const closed = new Promise<void>(resolve =>
            source.once('close', resolve)
        );
        vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({
            Body: source
        } as never);
        await expect(create().get('invalid')).rejects.toMatchObject({
            code: 'provider_error'
        });
        await closed;
        expect(source.destroyed).toBe(true);
    });
    it('copies prefixed reserved keys within one bucket, preserving metadata', async () => {
        const send = vi
            .spyOn(S3Client.prototype, 'send')
            .mockImplementation(async (command: any) =>
                command instanceof HeadObjectCommand
                    ? { ContentLength: 7 }
                    : { CopyObjectResult: { ETag: 'opaque' } }
            );
        expect(await create().copy('a #?.txt', 'b')).toEqual({
            key: 'b',
            size: 7,
            etag: 'opaque'
        });
        expect(send.mock.calls[1][0]).toBeInstanceOf(CopyObjectCommand);
        expect(send.mock.calls[1][0].input).toMatchObject({
            CopySource: 'assets/prefix/a%20%23%3F.txt',
            Key: 'prefix/b',
            MetadataDirective: 'COPY'
        });
    });
    it('validates size and binary input without committing truncated data', async () => {
        const send = vi.spyOn(S3Client.prototype, 'send');
        for (const [body, size] of [
            [Buffer.from('abc'), 2],
            [Buffer.from('abc'), 4],
            [Readable.from(['text']), undefined]
        ] as const) {
            await expect(
                create().put('key', body, { size })
            ).rejects.toMatchObject({ code: 'invalid_argument' });
        }
        expect(send).not.toHaveBeenCalled();
    });
    it('cleans up multipart uploads when completion fails', async () => {
        const send = vi
            .spyOn(S3Client.prototype, 'send')
            .mockImplementation(async (command: any) => {
                if (command instanceof CreateMultipartUploadCommand)
                    return { UploadId: 'upload' };
                if (command instanceof UploadPartCommand)
                    return { ETag: 'part' };
                if (command instanceof CompleteMultipartUploadCommand)
                    throw new Error('secret request');
                return {};
            });
        await expect(
            create().put('key', Buffer.alloc(6 * 1024 * 1024))
        ).rejects.toMatchObject({ code: 'provider_error' });
        expect(send.mock.calls.at(-1)![0]).toBeInstanceOf(
            AbortMultipartUploadCommand
        );
    });
    it('aborts in-flight S3 requests and awaits multipart cleanup', async () => {
        let started!: () => void;
        const ready = new Promise<void>(resolve => {
            started = resolve;
        });
        let cleaned = false;
        vi.spyOn(S3Client.prototype, 'send').mockImplementation(
            async (command: any, request: any) => {
                if (command instanceof CreateMultipartUploadCommand)
                    return { UploadId: 'upload' };
                if (command instanceof UploadPartCommand) {
                    started();
                    await new Promise((_, reject) =>
                        request.abortSignal.addEventListener(
                            'abort',
                            () => reject({ name: 'AbortError' }),
                            { once: true }
                        )
                    );
                }
                if (command instanceof AbortMultipartUploadCommand) {
                    expect(request.abortSignal.aborted).toBe(false);
                    cleaned = true;
                }
                return {};
            }
        );
        const controller = new AbortController();
        const body = Readable.from([Buffer.alloc(6 * 1024 * 1024)]);
        const write = create().put('key', body, { signal: controller.signal });
        const rejected = expect(write).rejects.toMatchObject({
            code: 'aborted'
        });
        await ready;
        controller.abort();
        await rejected;
        expect(cleaned).toBe(true);
        expect(body.destroyed).toBe(true);
    });
    it('await using waits for multipart cleanup before leaving the scope', async () => {
        let started!: () => void;
        const ready = new Promise<void>(resolve => {
            started = resolve;
        });
        let cleaning!: () => void;
        const cleanupStarted = new Promise<void>(resolve => {
            cleaning = resolve;
        });
        let finishCleanup!: () => void;
        const cleanupFinished = new Promise<void>(resolve => {
            finishCleanup = resolve;
        });
        vi.spyOn(S3Client.prototype, 'send').mockImplementation(
            async (command: any, request: any) => {
                if (command instanceof CreateMultipartUploadCommand)
                    return { UploadId: 'upload' };
                if (command instanceof UploadPartCommand) {
                    started();
                    await new Promise((_, reject) =>
                        request.abortSignal.addEventListener(
                            'abort',
                            () => reject({ name: 'AbortError' }),
                            { once: true }
                        )
                    );
                }
                if (command instanceof AbortMultipartUploadCommand) {
                    expect(request.abortSignal.aborted).toBe(false);
                    cleaning();
                    await cleanupFinished;
                }
                return {};
            }
        );
        const destroy = vi.spyOn(S3Client.prototype, 'destroy');
        const storage = create();
        const body = Readable.from([Buffer.alloc(6 * 1024 * 1024)]);
        let rejected!: Promise<void>;
        let exited = false;
        const scoped = (async () => {
            await using owned: ObjectStorage = storage;
            rejected = expect(owned.put('key', body)).rejects.toMatchObject({
                code: 'aborted'
            });
            await ready;
        })().finally(() => {
            exited = true;
        });
        try {
            await cleanupStarted;
            await new Promise<void>(resolve => setImmediate(resolve));
            expect(exited).toBe(false);
            expect(destroy).not.toHaveBeenCalled();
        } finally {
            finishCleanup();
            await scoped;
            await rejected;
        }
        expect(exited).toBe(true);
        expect(body.destroyed).toBe(true);
        expect(destroy).toHaveBeenCalledTimes(1);
    });
    it('cleans up a stalled input when closed and rejects subsequent operations', async () => {
        const storage = create();
        const source = new PassThrough();
        const writing = storage.put('key', source);
        const rejected = expect(writing).rejects.toMatchObject({
            code: 'aborted'
        });
        await storage.close();
        await rejected;
        expect(source.destroyed).toBe(true);
        await expect(storage.stat('key')).rejects.toMatchObject({
            code: 'closed'
        });
        await storage.close();
    });
    it('propagates source errors safely and releases abandoned download streams', async () => {
        const source = new PassThrough();
        vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({
            Body: source,
            ContentLength: 20
        } as never);
        const storage = create();
        const result = await storage.get('key');
        const error = once(result.body, 'error');
        source.destroy(new Error('secret provider details'));
        expect((await error)[0]).toMatchObject({ code: 'provider_error' });
        await storage.close();
        expect(source.destroyed).toBe(true);
    });
    it('cancels returned reads and closes the source when the consumer destroys the body', async () => {
        const sources: PassThrough[] = [];
        vi.spyOn(S3Client.prototype, 'send').mockImplementation(
            async (command: any) => {
                expect(command).toBeInstanceOf(GetObjectCommand);
                const source = new PassThrough();
                sources.push(source);
                return { Body: source, ContentLength: 20 };
            }
        );
        const storage = create();
        const controller = new AbortController();
        const read = await storage.get('a', { signal: controller.signal });
        const failure = once(read.body, 'error');
        controller.abort();
        expect((await failure)[0]).toMatchObject({ code: 'aborted' });
        const other = await storage.get('b');
        other.body.destroy();
        await storage.close();
        expect(sources.every(source => source.destroyed)).toBe(true);
    });
    it('never treats denied stat as missing or leaks provider errors', async () => {
        vi.spyOn(S3Client.prototype, 'send').mockRejectedValue({
            $metadata: { httpStatusCode: 403 },
            request: { secret: 'secret' }
        });
        await expect(create().stat('a')).rejects.toMatchObject({
            code: 'access_denied'
        });
    });
    it('validates config and keys without making requests', async () => {
        expect(() =>
            create({ endpoint: 'https://user:secret@example.test' })
        ).toThrow('Invalid storage argument');
        expect(() => create({ partSize: 1 })).toThrow(
            'Invalid storage argument'
        );
        const send = vi.spyOn(S3Client.prototype, 'send');
        await expect(
            create().put('../a', Buffer.from('x'))
        ).rejects.toMatchObject({ code: 'invalid_argument' });
        expect(send).not.toHaveBeenCalled();
    });
    it('preserves empty writes and normalizes metadata names', async () => {
        const send = vi
            .spyOn(S3Client.prototype, 'send')
            .mockResolvedValue({ ETag: 'opaque' } as never);
        expect(
            await create().put('empty', new Uint8Array(), {
                metadata: { Owner: 'test' }
            })
        ).toEqual({ key: 'empty', size: 0, etag: 'opaque' });
        expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
        expect(send.mock.calls[0][0].input).toMatchObject({
            Metadata: { owner: 'test' }
        });
    });
});
