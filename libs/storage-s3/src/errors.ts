import { StorageError } from '@cleverbrush/storage';

/** Never retain a raw SDK/source error: it can contain signed URLs or credentials. */
export function storageError(
    error: unknown,
    signal?: AbortSignal
): StorageError {
    if (signal?.aborted) return new StorageError('aborted');
    if (error instanceof StorageError) return error;
    const value = error as
        | {
              name?: string;
              code?: string;
              $metadata?: { httpStatusCode?: number };
          }
        | undefined;
    const status = value?.$metadata?.httpStatusCode;
    if (value?.name === 'AbortError') return new StorageError('aborted');
    if (
        status === 404 ||
        value?.name === 'NoSuchKey' ||
        value?.name === 'NotFound'
    )
        return new StorageError('not_found');
    if (
        status === 401 ||
        status === 403 ||
        [
            'AccessDenied',
            'InvalidAccessKeyId',
            'SignatureDoesNotMatch'
        ].includes(value?.name ?? '')
    )
        return new StorageError('access_denied');
    if (
        (status !== undefined && status >= 500) ||
        status === 429 ||
        ['TimeoutError', 'RequestTimeout', 'SlowDown'].includes(
            value?.name ?? ''
        ) ||
        ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(
            value?.code ?? ''
        )
    )
        return new StorageError('unavailable');
    return new StorageError('provider_error');
}
