import { describe, expect, test } from 'vitest';
import { string } from '../index.js';

describe('string extensions', () => {
    // -----------------------------------------------------------------------
    // email()
    // -----------------------------------------------------------------------
    describe('email()', () => {
        test('accepts a valid email', async () => {
            const schema = string().email();
            const result = schema.validate('user@example.com');
            expect(result.valid).toBe(true);
            expect(result.object).toBe('user@example.com');
        });

        test('rejects a string without @', async () => {
            const result = string().email().validate('not-an-email');
            expect(result.valid).toBe(false);
            expect(result.errors?.length).toBeGreaterThan(0);
        });

        test('rejects an empty string', async () => {
            const result = string().email().validate('');
            expect(result.valid).toBe(false);
        });

        test('stores extension metadata', () => {
            const schema = string().email();
            const meta = schema.introspect();
            expect(meta.extensions?.email).toBe(true);
        });

        test('uses custom error message', async () => {
            const result = string()
                .email('Invalid email address')
                .validate('bad');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('Invalid email address');
        });

        test('uses function error message', async () => {
            const result = string()
                .email((val) => `"${val}" is not a valid email`)
                .validate('bad');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe(
                '"bad" is not a valid email'
            );
        });

        test('chains with built-in methods', async () => {
            const schema = string().email().minLength(10);
            // valid email but too short
            const r1 = schema.validate('a@b.co');
            expect(r1.valid).toBe(false);

            // valid email and long enough
            const r2 = schema.validate('longuser@example.com');
            expect(r2.valid).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // url()
    // -----------------------------------------------------------------------
    describe('url()', () => {
        test('accepts a valid https URL', async () => {
            const result = string().url().validate('https://example.com');
            expect(result.valid).toBe(true);
        });

        test('accepts a valid http URL', async () => {
            const result = string().url().validate('http://example.com');
            expect(result.valid).toBe(true);
        });

        test('rejects a non-URL string', async () => {
            const result = string().url().validate('not a url');
            expect(result.valid).toBe(false);
        });

        test('rejects a disallowed protocol', async () => {
            const result = string().url().validate('ftp://example.com');
            expect(result.valid).toBe(false);
        });

        test('accepts custom protocols', async () => {
            const schema = string().url({ protocols: ['ftp'] });
            const result = schema.validate('ftp://files.example.com');
            expect(result.valid).toBe(true);
        });

        test('stores extension metadata', () => {
            const meta = string().url().introspect();
            expect(meta.extensions?.url).toBeDefined();
        });

        test('uses custom error message', async () => {
            const result = string()
                .url(undefined, 'Enter a valid URL')
                .validate('nope');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('Enter a valid URL');
        });

        test('accepts errorMessage as first argument (string)', async () => {
            const result = await string().url('Not a URL').validate('bad');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('Not a URL');
        });

        test('accepts errorMessage as first argument (function)', async () => {
            const result = await string()
                .url((val) => `"${val}" is not a URL`)
                .validate('nope');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('"nope" is not a URL');
        });

        test('errorMessage-only overload still validates correctly', async () => {
            const result = await string()
                .url('bad url')
                .validate('https://example.com');
            expect(result.valid).toBe(true);
        });

        test('throws for empty protocols array', () => {
            expect(() => string().url({ protocols: [] })).toThrow(
                'url: opts.protocols must be a non-empty array of non-empty strings'
            );
        });

        test('throws for protocols containing an empty string', () => {
            expect(() => string().url({ protocols: [''] })).toThrow(
                'url: opts.protocols must be a non-empty array of non-empty strings'
            );
        });

        test('throws for protocols containing a whitespace-only string', () => {
            expect(() => string().url({ protocols: ['  '] })).toThrow(
                'url: opts.protocols must be a non-empty array of non-empty strings'
            );
        });
    });

    // -----------------------------------------------------------------------
    // uuid()
    // -----------------------------------------------------------------------
    describe('uuid()', () => {
        test('accepts a valid v4 UUID', async () => {
            const result = string()
                .uuid()
                .validate('550e8400-e29b-41d4-a716-446655440000');
            expect(result.valid).toBe(true);
        });

        test('rejects a non-UUID string', async () => {
            const result = string().uuid().validate('not-a-uuid');
            expect(result.valid).toBe(false);
        });

        test('rejects truncated UUID', async () => {
            const result = string().uuid().validate('550e8400-e29b-41d4-a716');
            expect(result.valid).toBe(false);
        });

        test('stores extension metadata', () => {
            const meta = string().uuid().introspect();
            expect(meta.extensions?.uuid).toBe(true);
        });

        test('uses custom error message', async () => {
            const result = string().uuid('Invalid identifier').validate('nope');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('Invalid identifier');
        });
    });

    // -----------------------------------------------------------------------
    // ip()
    // -----------------------------------------------------------------------
    describe('ip()', () => {
        test('accepts a valid IPv4 address', async () => {
            const result = string().ip().validate('192.168.1.1');
            expect(result.valid).toBe(true);
        });

        test('accepts a valid IPv6 address', async () => {
            const result = string()
                .ip()
                .validate('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
            expect(result.valid).toBe(true);
        });

        test('rejects an invalid IP', async () => {
            const result = string().ip().validate('999.999.999.999');
            expect(result.valid).toBe(false);
        });

        test('rejects IPv6 when version is v4', async () => {
            const result = string().ip({ version: 'v4' }).validate('::1');
            expect(result.valid).toBe(false);
        });

        test('rejects IPv4 when version is v6', async () => {
            const result = string().ip({ version: 'v6' }).validate('127.0.0.1');
            expect(result.valid).toBe(false);
        });

        test('accepts IPv6 when version is v6', async () => {
            const result = string()
                .ip({ version: 'v6' })
                .validate('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
            expect(result.valid).toBe(true);
        });

        test('stores extension metadata', () => {
            const meta = string().ip({ version: 'v4' }).introspect();
            expect(meta.extensions?.ip).toEqual({ version: 'v4' });
        });

        test('uses custom error message', async () => {
            const result = string().ip(undefined, 'Bad IP').validate('nope');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('Bad IP');
        });
    });

    // -----------------------------------------------------------------------
    // trim()
    // -----------------------------------------------------------------------
    describe('trim()', () => {
        test('trims whitespace from input', async () => {
            const result = string().trim().validate('  hello  ');
            expect(result.valid).toBe(true);
            expect(result.object).toBe('hello');
        });

        test('works before minLength validation', async () => {
            const schema = string().trim().minLength(5);
            // "  hi  " trims to "hi" which is 2 chars — should fail
            const r1 = schema.validate('  hi  ');
            expect(r1.valid).toBe(false);

            // "  hello  " trims to "hello" which is 5 chars — should pass
            const r2 = schema.validate('  hello  ');
            expect(r2.valid).toBe(true);
            expect(r2.object).toBe('hello');
        });

        test('stores extension metadata', () => {
            const meta = string().trim().introspect();
            expect(meta.extensions?.trim).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // toLowerCase()
    // -----------------------------------------------------------------------
    describe('toLowerCase()', () => {
        test('lowercases the input', async () => {
            const result = string().toLowerCase().validate('HELLO');
            expect(result.valid).toBe(true);
            expect(result.object).toBe('hello');
        });

        test('works before equals validation', async () => {
            const schema = string().toLowerCase().equals('hello');
            const result = schema.validate('HELLO' as 'hello');
            expect(result.valid).toBe(true);
            expect(result.object).toBe('hello');
        });

        test('stores extension metadata', () => {
            const meta = string().toLowerCase().introspect();
            expect(meta.extensions?.toLowerCase).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // nonempty()
    // -----------------------------------------------------------------------
    describe('nonempty()', () => {
        test('rejects an empty string', async () => {
            const result = string().nonempty().validate('');
            expect(result.valid).toBe(false);
            expect(result.errors?.length).toBeGreaterThan(0);
        });

        test('accepts a non-empty string', async () => {
            const result = string().nonempty().validate('a');
            expect(result.valid).toBe(true);
        });

        test('stores extension metadata', () => {
            const meta = string().nonempty().introspect();
            expect(meta.extensions?.nonempty).toBe(true);
        });

        test('uses custom error message', async () => {
            const result = string().nonempty('Required field').validate('');
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('Required field');
        });
    });

    // -----------------------------------------------------------------------
    // chaining multiple extensions
    // -----------------------------------------------------------------------
    describe('chaining', () => {
        test('multiple extensions can be chained', async () => {
            const schema = string().trim().toLowerCase().nonempty();
            const result = schema.validate('  HELLO  ');
            expect(result.valid).toBe(true);
            expect(result.object).toBe('hello');
        });

        test('multiple extensions metadata preserved', () => {
            const meta = string().trim().toLowerCase().nonempty().introspect();
            expect(meta.extensions?.trim).toBe(true);
            expect(meta.extensions?.toLowerCase).toBe(true);
            expect(meta.extensions?.nonempty).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // type safety — non-string inputs must not crash
    // -----------------------------------------------------------------------
    describe('type safety', () => {
        test('email rejects non-string without throwing', async () => {
            const result = string()
                .email()
                .validate(123 as any);
            expect(result.valid).toBe(false);
            expect(result.errors?.length).toBeGreaterThan(0);
        });

        test('email uses custom error for non-string', async () => {
            const result = string()
                .email('bad value')
                .validate(null as any);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('bad value');
        });

        test('url rejects non-string without throwing', async () => {
            const result = string()
                .url()
                .validate(42 as any);
            expect(result.valid).toBe(false);
        });

        test('uuid rejects non-string without throwing', async () => {
            const result = string()
                .uuid()
                .validate({} as any);
            expect(result.valid).toBe(false);
        });

        test('ip rejects non-string without throwing', async () => {
            const result = string()
                .ip()
                .validate(true as any);
            expect(result.valid).toBe(false);
        });

        test('nonempty rejects non-string without throwing', async () => {
            const result = string()
                .nonempty()
                .validate(0 as any);
            expect(result.valid).toBe(false);
        });

        test('nonempty uses custom error for non-string', async () => {
            const result = string()
                .nonempty('required')
                .validate(undefined as any);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0].message).toBe('required');
        });

        test('trim does not throw on non-string', async () => {
            const result = string()
                .trim()
                .validate(99 as any);
            expect(result.valid).toBe(false);
        });

        test('toLowerCase does not throw on non-string', async () => {
            const result = string()
                .toLowerCase()
                .validate([] as any);
            expect(result.valid).toBe(false);
        });
    });
});
