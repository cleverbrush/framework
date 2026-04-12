import type { Principal } from './Principal.js';

// ---------------------------------------------------------------------------
// Authentication Context — transport-agnostic credential source
// ---------------------------------------------------------------------------

/**
 * Transport-agnostic context passed to authentication schemes.
 * HTTP middleware builds this from `RequestContext`; future transports
 * (WebSocket, gRPC) provide the same shape.
 */
export interface AuthenticationContext {
    readonly headers: Record<string, string>;
    readonly cookies: Record<string, string>;
    readonly items: Map<string, unknown>;
}

// ---------------------------------------------------------------------------
// Authentication Result
// ---------------------------------------------------------------------------

export type AuthenticationResult<T = unknown> =
    | { succeeded: true; principal: Principal<T> }
    | { succeeded: false; failure?: string };

// ---------------------------------------------------------------------------
// Authentication Scheme
// ---------------------------------------------------------------------------

/**
 * An authentication scheme extracts and validates credentials from the
 * transport-agnostic `AuthenticationContext`.
 */
export interface AuthenticationScheme<T = unknown> {
    /** Unique name for this scheme (e.g. "jwt", "cookie"). */
    readonly name: string;

    /**
     * Attempt to authenticate the request.
     * Returns a successful result with a `Principal<T>` or a failure.
     */
    authenticate(
        context: AuthenticationContext
    ): Promise<AuthenticationResult<T>>;

    /**
     * Optional challenge header for 401 responses.
     * E.g. `{ headerName: 'WWW-Authenticate', headerValue: 'Bearer' }`
     */
    challenge?(): { headerName: string; headerValue: string };
}
