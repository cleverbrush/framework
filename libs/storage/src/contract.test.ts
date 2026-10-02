import { Readable } from 'node:stream';
import { storageContract } from '../testing/contract.js';
import {
    type ObjectMetadata,
    type ObjectStorage,
    publicObjectUrl,
    StorageError,
    type StorageOptions,
    validateObjectKey
} from './index.js';

// Test-only reference adapter demonstrates that the contract needs no S3 SDK.
function memoryStorage(): ObjectStorage {
    const values = new Map<string, { bytes: Buffer; info: ObjectMetadata }>();
    let closed = false;
    const check = (key: string, options: StorageOptions = {}) => {
        if (closed) throw new StorageError('closed');
        if (options.signal?.aborted) throw new StorageError('aborted');
        validateObjectKey(key);
    };
    return {
        async put(key, body, options = {}) {
            try {
                check(key, options);
                const chunks: Uint8Array[] = [];
                if (body instanceof Uint8Array) chunks.push(body);
                else
                    for await (const chunk of body) {
                        check(key, options);
                        chunks.push(chunk);
                    }
                const bytes = Buffer.concat(chunks);
                const { signal: _signal, ...headers } = options;
                const info = {
                    ...headers,
                    key,
                    size: bytes.length,
                    metadata: Object.fromEntries(
                        Object.entries(options.metadata ?? {}).map(([k, v]) => [
                            k.toLowerCase(),
                            v
                        ])
                    )
                };
                values.set(key, { bytes, info });
                return { key, size: bytes.length };
            } finally {
                if (body instanceof Readable) body.destroy();
            }
        },
        async get(key, options) {
            check(key, options);
            const value = values.get(key);
            if (!value) throw new StorageError('not_found');
            return {
                ...structuredClone(value.info),
                body: Readable.from([Buffer.from(value.bytes)])
            };
        },
        async stat(key, options) {
            check(key, options);
            return structuredClone(values.get(key)?.info);
        },
        async copy(source, destination, options) {
            check(source, options);
            check(destination, options);
            const value = values.get(source);
            if (!value) throw new StorageError('not_found');
            const info = { ...structuredClone(value.info), key: destination };
            values.set(destination, { bytes: Buffer.from(value.bytes), info });
            return info;
        },
        async delete(key, options) {
            check(key, options);
            values.delete(key);
        },
        publicUrl(key) {
            return publicObjectUrl('https://cdn.example.test', key);
        },
        async close() {
            closed = true;
        },
        [Symbol.asyncDispose]() {
            return this.close();
        }
    };
}
storageContract(memoryStorage);
