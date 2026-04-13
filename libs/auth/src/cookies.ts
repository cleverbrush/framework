// ---------------------------------------------------------------------------
// Cookie Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a `Cookie` header string into a Record.
 *
 * @example parseCookies('name1=val1; name2=val2') → { name1: 'val1', name2: 'val2' }
 */
export function parseCookies(header: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!header) return cookies;

    const pairs = header.split(';');
    for (const pair of pairs) {
        const idx = pair.indexOf('=');
        if (idx < 0) continue;
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (key.length > 0) {
            cookies[key] = decodeURIComponent(value);
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
    /** Cookie path (default "/"). */
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
 */
export function serializeCookie(
    name: string,
    value: string,
    options?: CookieOptions
): string {
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
