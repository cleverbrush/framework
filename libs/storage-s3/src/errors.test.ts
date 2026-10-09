import { expect, it } from 'vitest';
import { storageError } from './errors.js';

it.each([
    [{ $metadata: { httpStatusCode: 404 } }, 'not_found'],
    [{ name: 'NoSuchKey' }, 'not_found'],
    [{ $metadata: { httpStatusCode: 403 } }, 'access_denied'],
    [{ name: 'SignatureDoesNotMatch' }, 'access_denied'],
    [{ $metadata: { httpStatusCode: 503 } }, 'unavailable'],
    [{ code: 'ECONNRESET' }, 'unavailable'],
    [{ name: 'TimeoutError' }, 'unavailable'],
    [{ name: 'AbortError' }, 'aborted'],
    [
        { message: 'https://user:secret@example.test/?signature=secret' },
        'provider_error'
    ]
])('normalizes provider failures safely', (input, code) => {
    const error = storageError(input);
    expect(error.code).toBe(code);
    expect(error.cause).toBeUndefined();
    expect(JSON.stringify(error) + error.stack).not.toContain('secret');
});
