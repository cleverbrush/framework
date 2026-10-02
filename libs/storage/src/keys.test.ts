import { describe, expect, it } from 'vitest';
import { StorageError } from './errors.js';
import {
    prefixedObjectKey,
    publicObjectUrl,
    validateObjectKey
} from './keys.js';

describe('object keys and public URLs', () => {
    it('preserves opaque names and encodes reserved and Unicode characters once', () => {
        expect(prefixedObjectKey('assets/', 'photo/雪 #?%2F.png')).toBe(
            'assets/photo/雪 #?%2F.png'
        );
        expect(
            publicObjectUrl(
                'https://cdn.example.test/bucket/',
                'assets/photo/雪 #?%2F.png'
            )
        ).toBe(
            'https://cdn.example.test/bucket/assets/photo/%E9%9B%AA%20%23%3F%252F.png'
        );
        expect(publicObjectUrl('https://cdn.example.test', 'a//b')).toBe(
            'https://cdn.example.test/a//b'
        );
        expect(prefixedObjectKey('', 'a')).toBe('a');
    });
    it.each([
        '',
        '/absolute',
        '.',
        '..',
        'a/../b',
        'a/./b',
        'a\\b',
        'a\0b',
        '\ud800'
    ])('rejects ambiguous key %j', key => {
        expect(() => validateObjectKey(key)).toThrow(StorageError);
    });
    it.each([
        'ftp://example.test',
        'https://user:secret@example.test',
        'https://example.test?token=secret',
        'https://example.test/#x',
        'not a URL'
    ])('rejects unsafe base URL %j', url => {
        expect(() => publicObjectUrl(url, 'asset')).toThrow(StorageError);
        try {
            publicObjectUrl(url, 'asset');
        } catch (error) {
            expect(String(error)).not.toContain('secret');
        }
    });
});
