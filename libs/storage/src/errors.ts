/** Portable failure classifications; no SDK request or credential data is exposed. */
export type StorageErrorCode =
    | 'not_found'
    | 'access_denied'
    | 'aborted'
    | 'invalid_argument'
    | 'unavailable'
    | 'closed'
    | 'provider_error';

const messages: Record<StorageErrorCode, string> = {
    not_found: 'Storage object not found',
    access_denied: 'Storage access denied',
    aborted: 'Storage operation aborted',
    invalid_argument: 'Invalid storage argument',
    unavailable: 'Storage service unavailable',
    closed: 'Storage is closed',
    provider_error: 'Storage operation failed'
};

/** Safe to log: raw provider errors and request objects are deliberately omitted. */
export class StorageError extends Error {
    constructor(readonly code: StorageErrorCode) {
        super(messages[code]);
        this.name = 'StorageError';
    }
}
