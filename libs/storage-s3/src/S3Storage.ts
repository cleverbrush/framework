import { PassThrough, Readable } from 'node:stream';
import {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CopyObjectCommand,
    CreateMultipartUploadCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    type HeadObjectCommandOutput,
    S3Client
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
    type ObjectMetadata,
    type ObjectStorage,
    type PutOptions,
    prefixedObjectKey,
    publicObjectUrl,
    type StorageBody,
    StorageError,
    type StorageOptions,
    type StorageReadResult,
    type StoredObject,
    validateObjectKey,
    validatePublicBaseUrl
} from '@cleverbrush/storage';
import { storageError } from './errors.js';

/** Explicit credentials for the configured S3 service; no ambient AWS lookup. */
export interface S3Credentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
}

/** One adapter targets one bucket. Create separate instances for other providers. */
export interface S3StorageOptions {
    endpoint: string;
    region: string;
    bucket: string;
    credentials: S3Credentials;
    /** Defaults to true for self-hosted endpoints. */
    forcePathStyle?: boolean;
    keyPrefix?: string;
    /** Public bucket/proxy root; the encoded key prefix is appended automatically. */
    publicBaseUrl?: string;
    /** Multipart buffer size, at least 5 MiB. Defaults to 5 MiB. */
    partSize?: number;
    /** Number of concurrently buffered parts. Defaults to four. */
    queueSize?: number;
    /** Per-request network timeout, including cleanup requests. Defaults to 30 seconds. */
    requestTimeoutMs?: number;
    requestChecksumCalculation?: 'WHEN_REQUIRED' | 'WHEN_SUPPORTED';
    responseChecksumValidation?: 'WHEN_REQUIRED' | 'WHEN_SUPPORTED';
}

type Operation = {
    controller: AbortController;
    done: Promise<void>;
    release(): void;
    retained: boolean;
};

/** S3 protocol adapter for custom endpoints, with bounded uploads and owned streams. */
export class S3Storage implements ObjectStorage {
    readonly #client: S3Client;
    readonly #options: S3StorageOptions;
    readonly #active = new Set<Operation>();
    #closed = false;
    #closing?: Promise<void>;

    constructor(options: S3StorageOptions) {
        validatePublicBaseUrl(options.endpoint);
        if (
            !options.region ||
            !options.bucket ||
            /[/\\\s]/.test(options.bucket) ||
            !options.credentials?.accessKeyId ||
            !options.credentials.secretAccessKey
        )
            throw new StorageError('invalid_argument');
        if (options.keyPrefix) validateObjectKey(options.keyPrefix);
        if (options.publicBaseUrl !== undefined)
            validatePublicBaseUrl(options.publicBaseUrl);
        for (const [value, minimum] of [
            [options.partSize ?? 5 * 1024 * 1024, 5 * 1024 * 1024],
            [options.queueSize ?? 4, 1],
            [options.requestTimeoutMs ?? 30000, 1]
        ]) {
            if (!Number.isSafeInteger(value) || value < minimum)
                throw new StorageError('invalid_argument');
        }
        this.#options = { ...options, credentials: { ...options.credentials } };
        this.#client = new S3Client({
            endpoint: options.endpoint,
            region: options.region,
            credentials: { ...options.credentials },
            forcePathStyle: options.forcePathStyle ?? true,
            requestChecksumCalculation:
                options.requestChecksumCalculation ?? 'WHEN_REQUIRED',
            responseChecksumValidation:
                options.responseChecksumValidation ?? 'WHEN_REQUIRED',
            maxAttempts: 3,
            requestHandler: {
                connectionTimeout: Math.min(
                    options.requestTimeoutMs ?? 30000,
                    10000
                ),
                requestTimeout: options.requestTimeoutMs ?? 30000,
                throwOnRequestTimeout: true
            }
        });
    }

    #key(key: string): string {
        const result = prefixedObjectKey(this.#options.keyPrefix ?? '', key);
        if (Buffer.byteLength(result) > 1024)
            throw new StorageError('invalid_argument');
        return result;
    }

    async #run<T>(
        options: StorageOptions,
        work: (operation: Operation) => Promise<T>
    ): Promise<T> {
        if (this.#closed) throw new StorageError('closed');
        if (options.signal?.aborted) throw new StorageError('aborted');
        const controller = new AbortController();
        const abort = () => controller.abort();
        let resolve!: () => void;
        const operation: Operation = {
            controller,
            retained: false,
            done: new Promise<void>(done => {
                resolve = done;
            }),
            release: () => {
                options.signal?.removeEventListener('abort', abort);
                this.#active.delete(operation);
                resolve();
            }
        };
        options.signal?.addEventListener('abort', abort, { once: true });
        this.#active.add(operation);
        try {
            return await work(operation);
        } catch (error) {
            throw storageError(error, controller.signal);
        } finally {
            if (!operation.retained) operation.release();
        }
    }

    async put(
        key: string,
        body: StorageBody,
        options: PutOptions = {}
    ): Promise<StoredObject> {
        // Ownership starts before argument/abort checks: destroying a file stream
        // can still report a pending open error even when no upload was started.
        if (body instanceof Readable) {
            const ignore = () => {};
            body.on('error', ignore);
            body.once('close', () => body.off('error', ignore));
        }
        try {
            return await this.#run(options, async operation => {
                const physical = this.#key(key);
                if (
                    !(body instanceof Uint8Array) &&
                    !(body instanceof Readable)
                )
                    throw new StorageError('invalid_argument');
                if (
                    options.size !== undefined &&
                    (!Number.isSafeInteger(options.size) || options.size < 0)
                )
                    throw new StorageError('invalid_argument');
                const { signal } = operation.controller;
                const metadata: Record<string, string> = Object.create(null);
                for (const [name, value] of Object.entries(
                    options.metadata ?? {}
                )) {
                    const canonical = name.toLowerCase();
                    if (
                        !/^[a-z0-9][a-z0-9_-]*$/.test(canonical) ||
                        typeof value !== 'string' ||
                        /[^\x20-\x7e]/.test(value) ||
                        Object.hasOwn(metadata, canonical)
                    )
                        throw new StorageError('invalid_argument');
                    metadata[canonical] = value;
                }
                let size = 0;
                let uploadId: string | undefined;
                const source =
                    body instanceof Readable ? body : Readable.from([body]);
                // Own source errors even if cancellation happens before iteration starts.
                const ignore = () => {};
                source.on('error', ignore);
                const input = Readable.from(
                    (async function* () {
                        for await (const chunk of source) {
                            if (!(chunk instanceof Uint8Array))
                                throw new StorageError('invalid_argument');
                            size += chunk.byteLength;
                            if (
                                !Number.isSafeInteger(size) ||
                                (options.size !== undefined &&
                                    size > options.size)
                            )
                                throw new StorageError('invalid_argument');
                            yield chunk;
                        }
                        if (options.size !== undefined && size !== options.size)
                            throw new StorageError('invalid_argument');
                    })(),
                    { objectMode: false }
                );
                input.on('error', ignore);
                const abort = () => {
                    source.destroy(new StorageError('aborted'));
                    input.destroy(new StorageError('aborted'));
                };
                signal.addEventListener('abort', abort, { once: true });
                // Upload does not forward its AbortController to client.send().
                // Use an operation-local facade so every data request is cancellable,
                // while cleanup remains possible after cancellation. Do not race
                // Upload.abort(): await done() so workers and cleanup have settled.
                const client = {
                    config: this.#client.config,
                    send: async (command: any) => {
                        const cleanup =
                            command instanceof AbortMultipartUploadCommand;
                        const result = (await this.#client.send(command, {
                            abortSignal: cleanup
                                ? AbortSignal.timeout(
                                      this.#options.requestTimeoutMs ?? 30000
                                  )
                                : signal
                        })) as any;
                        if (command instanceof CreateMultipartUploadCommand)
                            uploadId = result.UploadId;
                        if (
                            cleanup ||
                            command instanceof CompleteMultipartUploadCommand
                        )
                            uploadId = undefined;
                        return result;
                    }
                } as S3Client;
                try {
                    const result = await new Upload({
                        client,
                        params: {
                            Bucket: this.#options.bucket,
                            Key: physical,
                            Body: input,
                            ContentLength: options.size,
                            ContentType:
                                options.contentType ??
                                'application/octet-stream',
                            CacheControl: options.cacheControl,
                            ContentDisposition: options.contentDisposition,
                            Metadata: metadata
                        },
                        partSize: this.#options.partSize ?? 5 * 1024 * 1024,
                        queueSize: this.#options.queueSize ?? 4,
                        leavePartsOnError: false
                    }).done();
                    return { key, size, etag: result.ETag };
                } finally {
                    signal.removeEventListener('abort', abort);
                    source.destroy();
                    input.destroy();
                    // CompleteMultipartUpload failures are not cleaned up by Upload.
                    if (uploadId) {
                        await this.#client
                            .send(
                                new AbortMultipartUploadCommand({
                                    Bucket: this.#options.bucket,
                                    Key: physical,
                                    UploadId: uploadId
                                }),
                                {
                                    abortSignal: AbortSignal.timeout(
                                        this.#options.requestTimeoutMs ?? 30000
                                    )
                                }
                            )
                            .catch(() => {});
                    }
                }
            });
        } finally {
            if (body instanceof Readable) body.destroy();
        }
    }

    #metadata(key: string, result: HeadObjectCommandOutput): ObjectMetadata {
        if (
            !Number.isSafeInteger(result.ContentLength) ||
            result.ContentLength! < 0
        )
            throw new StorageError('provider_error');
        return {
            key,
            size: result.ContentLength!,
            etag: result.ETag,
            contentType: result.ContentType,
            cacheControl: result.CacheControl,
            contentDisposition: result.ContentDisposition,
            metadata: { ...result.Metadata },
            lastModified: result.LastModified
        };
    }

    async get(
        key: string,
        options: StorageOptions = {}
    ): Promise<StorageReadResult> {
        return this.#run(options, async operation => {
            const { signal } = operation.controller;
            const result = await this.#client.send(
                new GetObjectCommand({
                    Bucket: this.#options.bucket,
                    Key: this.#key(key)
                }),
                { abortSignal: signal }
            );
            const source = result.Body;
            if (!(source instanceof Readable))
                throw new StorageError('provider_error');
            const ignore = () => {};
            source.on('error', ignore);
            source.once('close', () => source.off('error', ignore));
            let metadata: ObjectMetadata;
            try {
                metadata = this.#metadata(key, result);
            } catch (error) {
                source.destroy();
                throw error;
            }
            const body = new PassThrough();
            const abort = () => body.destroy(new StorageError('aborted'));
            body.on('error', () => {});
            source.on('error', error =>
                body.destroy(storageError(error, signal))
            );
            source.on('close', () => {
                if (!source.readableEnded && !body.destroyed)
                    body.destroy(new StorageError('provider_error'));
            });
            body.once('close', () => {
                signal.removeEventListener('abort', abort);
                source.destroy();
                operation.release();
            });
            operation.retained = true;
            signal.addEventListener('abort', abort, { once: true });
            source.pipe(body);
            if (signal.aborted) abort();
            return { ...metadata, body };
        });
    }

    async #head(
        key: string,
        signal: AbortSignal
    ): Promise<ObjectMetadata | undefined> {
        try {
            const result = await this.#client.send(
                new HeadObjectCommand({
                    Bucket: this.#options.bucket,
                    Key: this.#key(key)
                }),
                { abortSignal: signal }
            );
            return this.#metadata(key, result);
        } catch (error) {
            const normalized = storageError(error, signal);
            if (normalized.code === 'not_found') return undefined;
            throw normalized;
        }
    }

    stat(
        key: string,
        options: StorageOptions = {}
    ): Promise<ObjectMetadata | undefined> {
        return this.#run(options, operation =>
            this.#head(key, operation.controller.signal)
        );
    }

    copy(
        source: string,
        destination: string,
        options: StorageOptions = {}
    ): Promise<StoredObject> {
        return this.#run(options, async operation => {
            const from = this.#key(source);
            const to = this.#key(destination);
            const { signal } = operation.controller;
            const metadata = await this.#head(source, signal);
            if (!metadata) throw new StorageError('not_found');
            if (source === destination) return metadata;
            const result = await this.#client.send(
                new CopyObjectCommand({
                    Bucket: this.#options.bucket,
                    Key: to,
                    CopySource: `${encodeURIComponent(this.#options.bucket)}/${from.split('/').map(encodeURIComponent).join('/')}`,
                    MetadataDirective: 'COPY'
                }),
                { abortSignal: signal }
            );
            return {
                key: destination,
                size: metadata.size,
                etag: result.CopyObjectResult?.ETag
            };
        });
    }

    delete(key: string, options: StorageOptions = {}): Promise<void> {
        return this.#run(options, async operation => {
            try {
                await this.#client.send(
                    new DeleteObjectCommand({
                        Bucket: this.#options.bucket,
                        Key: this.#key(key)
                    }),
                    { abortSignal: operation.controller.signal }
                );
            } catch (error) {
                const normalized = storageError(
                    error,
                    operation.controller.signal
                );
                if (normalized.code !== 'not_found') throw normalized;
            }
        });
    }

    publicUrl(key: string): string | undefined {
        const physical = this.#key(key);
        return this.#options.publicBaseUrl === undefined
            ? undefined
            : publicObjectUrl(this.#options.publicBaseUrl, physical);
    }

    close(): Promise<void> {
        if (!this.#closing) {
            this.#closed = true;
            const active = [...this.#active];
            for (const operation of active) operation.controller.abort();
            this.#closing = Promise.all(
                active.map(operation => operation.done)
            ).then(() => this.#client.destroy());
        }
        return this.#closing;
    }

    [Symbol.asyncDispose](): Promise<void> {
        return this.close();
    }
}
