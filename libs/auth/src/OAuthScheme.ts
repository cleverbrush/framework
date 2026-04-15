import type {
    AuthenticationContext,
    AuthenticationResult,
    AuthenticationScheme
} from './AuthenticationScheme.js';

// ---------------------------------------------------------------------------
// OAuth Flow Types
// ---------------------------------------------------------------------------

/**
 * A single OAuth 2.0 flow as defined by the OpenAPI specification.
 */
export interface OAuthFlow {
    readonly authorizationUrl?: string;
    readonly tokenUrl?: string;
    readonly refreshUrl?: string;
    readonly scopes: Record<string, string>;
}

/**
 * Map of OAuth 2.0 grant-type flows.
 *
 * @see {@link https://spec.openapis.org/oas/v3.1.0#oauth-flows-object OpenAPI OAuth Flows Object}
 */
export interface OAuthFlows {
    readonly authorizationCode?: OAuthFlow;
    readonly clientCredentials?: OAuthFlow;
    readonly password?: OAuthFlow;
    readonly implicit?: OAuthFlow;
}

// ---------------------------------------------------------------------------
// Per-flow option types
// ---------------------------------------------------------------------------

/**
 * Configuration for {@link authorizationCodeScheme}.
 *
 * @template T - The type of the principal value produced by `authenticate`.
 */
export interface AuthorizationCodeSchemeOptions<T> {
    /** OAuth authorization endpoint URL. */
    authorizationUrl: string;
    /** OAuth token endpoint URL. */
    tokenUrl: string;
    /** Optional token refresh URL. */
    refreshUrl?: string;
    /** Available scopes with descriptions (default: `{}`). */
    scopes?: Record<string, string>;
    /** Validate the incoming request and return the principal or a failure. */
    authenticate: (
        context: AuthenticationContext
    ) => Promise<AuthenticationResult<T>>;
    /** Custom scheme name (default: `'oauth2'`). */
    name?: string;
}

/**
 * Configuration for {@link clientCredentialsScheme}.
 *
 * @template T - The type of the principal value produced by `authenticate`.
 */
export interface ClientCredentialsSchemeOptions<T> {
    /** OAuth token endpoint URL. */
    tokenUrl: string;
    /** Optional token refresh URL. */
    refreshUrl?: string;
    /** Available scopes with descriptions (default: `{}`). */
    scopes?: Record<string, string>;
    /** Validate the incoming request and return the principal or a failure. */
    authenticate: (
        context: AuthenticationContext
    ) => Promise<AuthenticationResult<T>>;
    /** Custom scheme name (default: `'oauth2'`). */
    name?: string;
}

// ---------------------------------------------------------------------------
// OAuth Authentication Scheme
// ---------------------------------------------------------------------------

class OAuthAuthenticationScheme<T> implements AuthenticationScheme<T> {
    readonly name: string;
    readonly flows: OAuthFlows;
    readonly #authenticate: (
        context: AuthenticationContext
    ) => Promise<AuthenticationResult<T>>;

    constructor(
        name: string,
        flows: OAuthFlows,
        authenticate: (
            context: AuthenticationContext
        ) => Promise<AuthenticationResult<T>>
    ) {
        this.name = name;
        this.flows = flows;
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
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Create an OAuth 2.0 Authorization Code authentication scheme.
 *
 * The returned scheme exposes a `flows` property that the OpenAPI generator
 * uses to automatically emit the correct `oauth2` security scheme.
 *
 * @example
 * ```ts
 * const oauth = authorizationCodeScheme({
 *     authorizationUrl: 'https://auth.example.com/authorize',
 *     tokenUrl: 'https://auth.example.com/token',
 *     scopes: { 'read:items': 'Read items' },
 *     authenticate: async (ctx) => {
 *         // validate Bearer token from ctx.headers.authorization
 *         return { succeeded: false };
 *     }
 * });
 * ```
 */
export function authorizationCodeScheme<T>(
    options: AuthorizationCodeSchemeOptions<T>
): AuthenticationScheme<T> {
    return new OAuthAuthenticationScheme(
        options.name ?? 'oauth2',
        {
            authorizationCode: {
                authorizationUrl: options.authorizationUrl,
                tokenUrl: options.tokenUrl,
                ...(options.refreshUrl !== undefined && {
                    refreshUrl: options.refreshUrl
                }),
                scopes: options.scopes ?? {}
            }
        },
        options.authenticate
    );
}

/**
 * Create an OAuth 2.0 Client Credentials authentication scheme.
 *
 * Used for machine-to-machine (M2M) authentication. The returned scheme
 * exposes a `flows` property for automatic OpenAPI security scheme detection.
 *
 * @example
 * ```ts
 * const m2m = clientCredentialsScheme({
 *     tokenUrl: 'https://auth.example.com/token',
 *     scopes: { 'service:read': 'Read service data' },
 *     authenticate: async (ctx) => {
 *         // validate Bearer token
 *         return { succeeded: false };
 *     }
 * });
 * ```
 */
export function clientCredentialsScheme<T>(
    options: ClientCredentialsSchemeOptions<T>
): AuthenticationScheme<T> {
    return new OAuthAuthenticationScheme(
        options.name ?? 'oauth2',
        {
            clientCredentials: {
                tokenUrl: options.tokenUrl,
                ...(options.refreshUrl !== undefined && {
                    refreshUrl: options.refreshUrl
                }),
                scopes: options.scopes ?? {}
            }
        },
        options.authenticate
    );
}
