import type { Readable } from 'node:stream';

/** Byte sources are consumed once; Node Buffers are Uint8Arrays. */
export type StorageBody = Uint8Array | Readable;

/** Cancellation remains active until a returned read stream is closed. */
export interface StorageOptions {
    signal?: AbortSignal;
}

/** Portable HTTP and application metadata stored with an object. */
export interface ObjectHeaders {
    contentType?: string;
    cacheControl?: string;
    contentDisposition?: string;
    /** Names are case-insensitive and returned in lowercase. */
    metadata?: Readonly<Record<string, string>>;
}

/** An optional size must match the number of bytes consumed. */
export interface PutOptions extends StorageOptions, ObjectHeaders {
    size?: number;
}

/** Receipt for a completed write or copy. ETags are not content checksums. */
export interface StoredObject {
    key: string;
    size: number;
    etag?: string;
}

/** Metadata describes the current object, without opening a body stream. */
export interface ObjectMetadata extends StoredObject, ObjectHeaders {
    lastModified?: Date;
}

/** The caller must consume or destroy body, even when inspecting only metadata. */
export interface StorageReadResult extends ObjectMetadata {
    body: Readable;
}

/**
 * Server-side, provider-neutral object storage. Keys are relative logical names;
 * provider prefixes never appear in results. Operations on one key replace its
 * current value; they do not provide database transactions or version history.
 */
export interface ObjectStorage {
    put(
        key: string,
        body: StorageBody,
        options?: PutOptions
    ): Promise<StoredObject>;
    /** A missing object throws StorageError with code not_found. */
    get(key: string, options?: StorageOptions): Promise<StorageReadResult>;
    /** Only a confirmed missing object returns undefined; other failures throw. */
    stat(
        key: string,
        options?: StorageOptions
    ): Promise<ObjectMetadata | undefined>;
    /** Copy within this storage instance, replacing the destination and preserving metadata. */
    copy(
        source: string,
        destination: string,
        options?: StorageOptions
    ): Promise<StoredObject>;
    /** Deleting a missing object succeeds. */
    delete(key: string, options?: StorageOptions): Promise<void>;
    /** Stable URL only when a public base URL was explicitly configured. */
    publicUrl(key: string): string | undefined;
    /** Cancel active work, release resources and permanently close this instance. */
    close(): Promise<void>;
}
