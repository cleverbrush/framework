import { describe, expect, it, vi } from 'vitest';
import { cookieScheme } from './CookieScheme.js';
import { parseCookies, serializeCookie } from './cookies.js';

describe('cookie parsing boundaries', () => {
    it('retains malformed escapes without breaking unrelated cookies', () => {
        expect(parseCookies('bad=%E0%A4%A; sid=valid')).toEqual({
            bad: '%E0%A4%A',
            sid: 'valid'
        });
    });

    it('uses own keys, including prototype names, and the first duplicate', () => {
        const cookies = parseCookies(
            '__proto__=a; constructor=b; sid=first; sid=second'
        );
        expect(Object.getPrototypeOf(cookies)).toBeNull();
        expect(
            Object.getOwnPropertyDescriptor(cookies, '__proto__')?.value
        ).toBe('a');
        expect(cookies.constructor).toBe('b');
        expect(cookies.sid).toBe('first');
    });

    it('does not authenticate inherited cookie properties', async () => {
        const validate = vi.fn(async () => ({}));
        const scheme = cookieScheme({ cookieName: 'constructor', validate });
        expect(
            await scheme.authenticate({
                headers: {},
                cookies: {},
                items: new Map()
            })
        ).toMatchObject({ succeeded: false });
        expect(validate).not.toHaveBeenCalled();
    });
});

describe('cookie serialization boundaries', () => {
    it.each(['path', 'domain'])(
        'rejects header and attribute injection through %s',
        key => {
            for (const value of [
                '/; Secure',
                'host\r\nX-Injected: yes',
                'host\u0000'
            ]) {
                expect(() =>
                    serializeCookie('sid', 'v', { [key]: value })
                ).toThrow(TypeError);
            }
        }
    );

    it.each([NaN, Infinity, 1.5])('rejects invalid maxAge %s', maxAge => {
        expect(() => serializeCookie('sid', 'v', { maxAge })).toThrow(
            TypeError
        );
    });

    it('rejects invalid dates and retains deliberate cookie deletion', () => {
        expect(() =>
            serializeCookie('sid', 'v', { expires: new Date(NaN) })
        ).toThrow(TypeError);
        expect(serializeCookie('sid', '', { maxAge: -1 })).toContain(
            'Max-Age=-1'
        );
    });
});
