import { randomUUID } from 'node:crypto';
import { PassThrough, Readable } from 'node:stream';
import {
    GetObjectCommand,
    ListMultipartUploadsCommand,
    S3Client
} from '@aws-sdk/client-s3';
import { S3Storage, type S3StorageOptions } from '@cleverbrush/storage-s3';
import { describe, expect, it } from 'vitest';
import { storageContract } from '../../storage/testing/contract.js';

function configuration(): S3StorageOptions {
    const env = process.env;
    for (const name of [
        'STORAGE_TEST_ENDPOINT',
        'STORAGE_TEST_REGION',
        'STORAGE_TEST_BUCKET',
        'STORAGE_TEST_ACCESS_KEY_ID',
        'STORAGE_TEST_SECRET_ACCESS_KEY'
    ])
        if (!env[name])
            throw new Error(
                `${name} is required; use npm run test:storage:integration`
            );
    return {
        endpoint: env.STORAGE_TEST_ENDPOINT!,
        region: env.STORAGE_TEST_REGION!,
        bucket: env.STORAGE_TEST_BUCKET!,
        credentials: {
            accessKeyId: env.STORAGE_TEST_ACCESS_KEY_ID!,
            secretAccessKey: env.STORAGE_TEST_SECRET_ACCESS_KEY!
        },
        forcePathStyle: env.STORAGE_TEST_FORCE_PATH_STYLE !== 'false',
        keyPrefix: `framework-storage-tests/${randomUUID()}`,
        publicBaseUrl:
            env.STORAGE_TEST_PUBLIC_BASE_URL ??
            'https://cdn.example.test/bucket',
        requestTimeoutMs: 5000
    };
}
function rawClient(config: S3StorageOptions) {
    return new S3Client({
        ...config,
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED'
    });
}

storageContract(() => new S3Storage(configuration()));

describe('S3-compatible transfers', () => {
    it('round trips multipart streams and exposes only logical keys', async () => {
        const config = configuration();
        const storage = new S3Storage(config);
        const client = rawClient(config);
        const key = 'large #?.bin';
        const bytes = Buffer.alloc(12 * 1024 * 1024 + 19);
        for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
        try {
            const input = Readable.from(
                (function* () {
                    for (let i = 0; i < bytes.length; i += 32768)
                        yield bytes.subarray(i, i + 32768);
                })()
            );
            expect(
                await storage.put(key, input, {
                    metadata: { origin: 'stream' }
                })
            ).toMatchObject({ key, size: bytes.length });
            const response = await client.send(
                new GetObjectCommand({
                    Bucket: config.bucket,
                    Key: `${config.keyPrefix}/${key}`
                })
            );
            expect(
                Buffer.from(await response.Body!.transformToByteArray()).equals(
                    bytes
                )
            ).toBe(true);
            expect(storage.publicUrl(key)).toBe(
                `${config.publicBaseUrl}/${config.keyPrefix}/large%20%23%3F.bin`
            );
        } finally {
            await storage.delete(key);
            await storage.close();
            client.destroy();
        }
    });
    it('aborts a multipart transfer without committing an object or leaving parts', async () => {
        const config = configuration();
        const storage = new S3Storage({ ...config, queueSize: 1 });
        const client = rawClient(config);
        const key = 'interrupted';
        const controller = new AbortController();
        const body = new PassThrough();
        const writing = storage.put(key, body, { signal: controller.signal });
        const rejected = expect(writing).rejects.toMatchObject({
            code: 'aborted'
        });
        try {
            body.write(Buffer.alloc(6 * 1024 * 1024));
            await expect
                .poll(
                    async () => {
                        const listed = await client.send(
                            new ListMultipartUploadsCommand({
                                Bucket: config.bucket,
                                Prefix: config.keyPrefix
                            })
                        );
                        return listed.Uploads?.length ?? 0;
                    },
                    { timeout: 10000 }
                )
                .toBe(1);
            controller.abort();
            await rejected;
            expect(body.destroyed).toBe(true);
            expect(await storage.stat(key)).toBeUndefined();
            const listed = await client.send(
                new ListMultipartUploadsCommand({
                    Bucket: config.bucket,
                    Prefix: config.keyPrefix
                })
            );
            expect(listed.Uploads ?? []).toHaveLength(0);
        } finally {
            controller.abort();
            await writing.catch(() => {});
            await storage.delete(key);
            await storage.close();
            client.destroy();
        }
    });
    it('maps rejected credentials without exposing secrets', async () => {
        const config = configuration();
        const storage = new S3Storage({
            ...config,
            credentials: {
                accessKeyId: config.credentials.accessKeyId,
                secretAccessKey: 'invalid-test-secret'
            }
        });
        try {
            await expect(storage.stat('anything')).rejects.toMatchObject({
                code: 'access_denied'
            });
        } finally {
            await storage.close();
        }
    });
});
