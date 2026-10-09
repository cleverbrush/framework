import { StorageError } from './errors.js';

/** Validate a logical key without normalizing or decoding its contents. */
export function validateObjectKey(key: string): void {
    if (
        typeof key !== 'string' ||
        !key ||
        key.startsWith('/') ||
        key.includes('\\') ||
        Array.from(key).some(
            char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127
        ) ||
        key.split('/').some(part => part === '.' || part === '..')
    )
        throw new StorageError('invalid_argument');
    try {
        encodeURIComponent(key);
    } catch {
        throw new StorageError('invalid_argument');
    }
}

/** Join a configured prefix and a logical key exactly once. */
export function prefixedObjectKey(prefix: string, key: string): string {
    validateObjectKey(key);
    if (!prefix) return key;
    validateObjectKey(prefix);
    return `${prefix.endsWith('/') ? prefix : `${prefix}/`}${key}`;
}

/** Validate a public HTTP(S) base URL without exposing credentials in failures. */
export function validatePublicBaseUrl(baseUrl: string): void {
    let url: URL;
    try {
        url = new URL(baseUrl);
    } catch {
        throw new StorageError('invalid_argument');
    }
    if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
    )
        throw new StorageError('invalid_argument');
}

/** Encode each object-key segment while retaining intentional slash separators. */
export function publicObjectUrl(baseUrl: string, key: string): string {
    validatePublicBaseUrl(baseUrl);
    validateObjectKey(key);
    const base = new URL(baseUrl).href.replace(/\/$/, '');
    return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
