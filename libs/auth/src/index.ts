// Core

export type {
    AuthenticationContext,
    AuthenticationResult,
    AuthenticationScheme
} from './AuthenticationScheme.js';
export {
    type AuthorizationPolicy,
    type AuthorizationRequirement,
    type AuthorizationResult,
    AuthorizationService,
    PolicyBuilder,
    requireRole
} from './Authorization.js';
export { type CookieSchemeOptions, cookieScheme } from './CookieScheme.js';

// Cookie utilities
export {
    type CookieOptions,
    parseCookies,
    serializeCookie
} from './cookies.js';

// Built-in schemes
export {
    type JwtPayload,
    type JwtSchemeOptions,
    jwtScheme,
    signJwt
} from './JwtScheme.js';
export { Principal } from './Principal.js';

// Helpers

/**
 * Define application roles as a typed constant object.
 * The returned object is frozen and its values form the role
 * string-literal union used by `createEndpoints()`.
 *
 * @example
 * ```ts
 * const Roles = defineRoles({ admin: 'admin', editor: 'editor' });
 * const ep = createEndpoints(Roles);
 * ep.get('/api/admin').authorize(IPrincipal, 'admin'); // ✓
 * ```
 */
export function defineRoles<const T extends Record<string, string>>(
    roles: T
): Readonly<T> {
    return Object.freeze(roles);
}
