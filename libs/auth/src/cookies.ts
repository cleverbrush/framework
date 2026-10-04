// ---------------------------------------------------------------------------
// Cookie Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a `Cookie` header into a null-prototype record. First duplicate wins;
 * malformed percent escapes are retained verbatim instead of throwing.
 *
 * @example parseCookies('name1=val1; name2=val2') → { name1: 'val1', name2: 'val2' }
 */
export function parseCookies(header: string): Record<string, string> {
    const cookies: Record<string, string> = Object.create(null);
    if (!header) return cookies;

    const pairs = header.split(';');
    for (const pair of pairs) {
        const idx = pair.indexOf('=');
        if (idx < 0) continue;
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (key.length > 0 && !Object.hasOwn(cookies, key)) {
            try {
                cookies[key] = decodeURIComponent(value);
            } catch {
                cookies[key] = value;
            }
        }
    }
    return cookies;
}

// ---------------------------------------------------------------------------
// Cookie Serialization
// ---------------------------------------------------------------------------

/**
 * Options for the `Set-Cookie` header, controlling cookie lifetime,
 * scope, and security attributes.
 */
export interface CookieOptions {
    /** Max lifetime in seconds. */
    maxAge?: number;
    /** Absolute expiry date. */
    expires?: Date;
    /** Cookie path. Omitted by default (the browser uses the request path). */
    path?: string;
    /** Cookie domain. */
    domain?: string;
    /** HTTPS only. */
    secure?: boolean;
    /** Prevent client-side JS access. */
    httpOnly?: boolean;
    /** SameSite attribute. */
    sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Serialize a `Set-Cookie` header value.
 * @throws {TypeError} For invalid expiry/maxAge or unsafe attribute values.
 */
export function serializeCookie(
    name: string,
    value: string,
    options?: CookieOptions
): string {
    for (const key of ['path', 'domain'] as const) {
        const attribute = options?.[key];
        if (
            attribute !== undefined &&
            !/^[\x20-\x3A\x3C-\x7E]*$/.test(attribute)
        ) {
            throw new TypeError(`Invalid cookie ${key}`);
        }
    }
    if (
        options?.maxAge !== undefined &&
        !Number.isSafeInteger(options.maxAge)
    ) {
        throw new TypeError('Cookie maxAge must be a safe integer');
    }
    if (
        options?.expires !== undefined &&
        !Number.isFinite(options.expires.getTime())
    ) {
        throw new TypeError('Invalid cookie expiry');
    }
    if (
        options?.sameSite !== undefined &&
        !['Strict', 'Lax', 'None'].includes(options.sameSite)
    ) {
        throw new TypeError('Invalid cookie sameSite');
    }
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (options?.maxAge !== undefined) {
        cookie += `; Max-Age=${options.maxAge}`;
    }
    if (options?.expires) {
        cookie += `; Expires=${options.expires.toUTCString()}`;
    }
    if (options?.path) {
        cookie += `; Path=${options.path}`;
    }
    if (options?.domain) {
        cookie += `; Domain=${options.domain}`;
    }
    if (options?.secure) {
        cookie += '; Secure';
    }
    if (options?.httpOnly) {
        cookie += '; HttpOnly';
    }
    if (options?.sameSite) {
        cookie += `; SameSite=${options.sameSite}`;
    }

    return cookie;
}
