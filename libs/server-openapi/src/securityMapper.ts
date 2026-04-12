import type { AuthenticationConfig } from '@cleverbrush/server';

export interface OpenApiSecurityScheme {
    readonly type: string;
    readonly scheme?: string;
    readonly bearerFormat?: string;
    readonly in?: string;
    readonly name?: string;
}

/**
 * Map `@cleverbrush/auth` authentication schemes to OpenAPI security scheme objects.
 */
export function mapSecuritySchemes(
    authConfig: AuthenticationConfig | null | undefined
): Record<string, OpenApiSecurityScheme> {
    if (!authConfig) return {};

    const result: Record<string, OpenApiSecurityScheme> = {};
    for (const scheme of authConfig.schemes) {
        const name = scheme.name;
        const challenge = scheme.challenge?.();

        if (
            challenge?.headerValue?.toLowerCase().startsWith('bearer') ||
            name === 'jwt'
        ) {
            result[name] = {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            };
        } else if (name === 'cookie' || (scheme as any).cookieName) {
            // Cookie scheme — extract cookie name from options if available
            const cookieName =
                (scheme as any).cookieName ??
                (scheme as any)._options?.cookieName ??
                'session';
            result[name] = {
                type: 'apiKey',
                in: 'cookie',
                name: cookieName
            };
        } else if (challenge) {
            // Generic scheme with a challenge header
            result[name] = {
                type: 'http',
                scheme: challenge.headerValue.split(' ')[0].toLowerCase()
            };
        } else {
            // Fallback — treat as generic HTTP scheme
            result[name] = { type: 'http', scheme: name };
        }
    }
    return result;
}

/**
 * Map endpoint `authRoles` to an OpenAPI operation-level `security` array.
 *
 * - `null` → empty array (public endpoint, no security)
 * - `[]` → `[{ <schemeName>: [] }]` (any authenticated user)
 * - `['admin']` → `[{ <schemeName>: ['admin'] }]` (require specific roles)
 */
export function mapOperationSecurity(
    authRoles: readonly string[] | null,
    securitySchemeNames: string[]
): Record<string, string[]>[] {
    if (authRoles === null) return [];
    if (securitySchemeNames.length === 0) return [];

    // Each security scheme listed as an option (OR semantics in OpenAPI)
    return securitySchemeNames.map(name => ({
        [name]: [...authRoles]
    }));
}
