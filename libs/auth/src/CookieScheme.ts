import type {
    AuthenticationContext,
    AuthenticationResult,
    AuthenticationScheme
} from './AuthenticationScheme.js';
import { parseCookies } from './cookies.js';
import { Principal } from './Principal.js';

// ---------------------------------------------------------------------------
// Cookie Scheme Config
// ---------------------------------------------------------------------------

/**
 * Configuration for {@link cookieScheme}.
 *
 * @template T - The type of the principal value returned by `validate`.
 */
export interface CookieSchemeOptions<T> {
    /** Name of the cookie to read (e.g. "session", "sid"). */
    cookieName: string;
    /**
     * Validate the cookie value and return the principal data, or `null`
     * if the cookie is invalid / session expired.
     *
     * The implementer is responsible for session lookup, signature
     * verification, etc.
     */
    validate: (cookieValue: string) => Promise<T | null>;
    /** Custom scheme name (default: "cookie"). */
    name?: string;
}

// ---------------------------------------------------------------------------
// Cookie Authentication Scheme
// ---------------------------------------------------------------------------

class CookieAuthenticationScheme<T> implements AuthenticationScheme<T> {
    readonly name: string;
    readonly #options: CookieSchemeOptions<T>;

    constructor(options: CookieSchemeOptions<T>) {
        this.name = options.name ?? 'cookie';
        this.#options = options;
    }

    async authenticate(
        context: AuthenticationContext
    ): Promise<AuthenticationResult<T>> {
        // Try pre-parsed cookies first, fall back to header parsing
        let cookieValue: string | undefined =
            context.cookies[this.#options.cookieName];

        if (cookieValue === undefined) {
            const cookieHeader = context.headers['cookie'];
            if (cookieHeader) {
                const parsed = parseCookies(cookieHeader);
                cookieValue = parsed[this.#options.cookieName];
            }
        }

        if (cookieValue === undefined || cookieValue === '') {
            return {
                succeeded: false,
                failure: `Cookie "${this.#options.cookieName}" not found`
            };
        }

        const value = await this.#options.validate(cookieValue);
        if (value === null) {
            return {
                succeeded: false,
                failure: 'Cookie validation failed'
            };
        }

        const principal = new Principal(true, value);
        return { succeeded: true, principal };
    }
}

/**
 * Create a cookie-based authentication scheme.
 */
export function cookieScheme<T>(
    options: CookieSchemeOptions<T>
): AuthenticationScheme<T> {
    return new CookieAuthenticationScheme(options);
}
