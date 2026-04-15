import type {
    AuthenticationContext,
    AuthenticationResult,
    AuthenticationScheme
} from './AuthenticationScheme.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Configuration for {@link oidcScheme}.
 *
 * @template T - The type of the principal value produced by `authenticate`.
 */
export interface OidcSchemeOptions<T> {
    /** OpenID Connect discovery URL (e.g. `https://auth.example.com/.well-known/openid-configuration`). */
    openIdConnectUrl: string;
    /** Validate the incoming request and return the principal or a failure. */
    authenticate: (
        context: AuthenticationContext
    ) => Promise<AuthenticationResult<T>>;
    /** Custom scheme name (default: `'oidc'`). */
    name?: string;
}

// ---------------------------------------------------------------------------
// OIDC Authentication Scheme
// ---------------------------------------------------------------------------

class OidcAuthenticationScheme<T> implements AuthenticationScheme<T> {
    readonly name: string;
    readonly openIdConnectUrl: string;
    readonly #authenticate: (
        context: AuthenticationContext
    ) => Promise<AuthenticationResult<T>>;

    constructor(
        name: string,
        openIdConnectUrl: string,
        authenticate: (
            context: AuthenticationContext
        ) => Promise<AuthenticationResult<T>>
    ) {
        this.name = name;
        this.openIdConnectUrl = openIdConnectUrl;
        this.#authenticate = authenticate;
    }

    authenticate(
        context: AuthenticationContext
    ): Promise<AuthenticationResult<T>> {
        return this.#authenticate(context);
    }

    challenge(): { headerName: string; headerValue: string } {
        return {
            headerName: 'WWW-Authenticate',
            headerValue: 'Bearer'
        };
    }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an OpenID Connect authentication scheme.
 *
 * The returned scheme exposes an `openIdConnectUrl` property that the OpenAPI
 * generator uses to automatically emit the correct `openIdConnect` security
 * scheme.
 *
 * @example
 * ```ts
 * const oidc = oidcScheme({
 *     openIdConnectUrl: 'https://auth.example.com/.well-known/openid-configuration',
 *     authenticate: async (ctx) => {
 *         // validate token from ctx.headers.authorization
 *         return { succeeded: false };
 *     }
 * });
 * ```
 */
export function oidcScheme<T>(
    options: OidcSchemeOptions<T>
): AuthenticationScheme<T> {
    return new OidcAuthenticationScheme(
        options.name ?? 'oidc',
        options.openIdConnectUrl,
        options.authenticate
    );
}
