import type { AuthenticationConfig } from '@cleverbrush/server';
import { describe, expect, it } from 'vitest';
import { mapOperationSecurity, mapSecuritySchemes } from './securityMapper.js';

function makeJwtScheme() {
    return {
        name: 'jwt',
        authenticate: async () => ({
            succeeded: false as const,
            failure: 'test'
        }),
        challenge: () => ({
            headerName: 'WWW-Authenticate',
            headerValue: 'Bearer'
        })
    };
}

function makeCookieScheme() {
    return {
        name: 'cookie',
        cookieName: 'sid',
        authenticate: async () => ({
            succeeded: false as const,
            failure: 'test'
        })
    };
}

describe('mapSecuritySchemes', () => {
    it('maps JWT scheme to bearer security scheme', () => {
        const config: AuthenticationConfig = {
            defaultScheme: 'jwt',
            schemes: [makeJwtScheme()]
        };
        const result = mapSecuritySchemes(config);
        expect(result['jwt']).toEqual({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
        });
    });

    it('maps cookie scheme to apiKey security scheme', () => {
        const config: AuthenticationConfig = {
            defaultScheme: 'cookie',
            schemes: [makeCookieScheme()]
        };
        const result = mapSecuritySchemes(config);
        expect(result['cookie']).toEqual({
            type: 'apiKey',
            in: 'cookie',
            name: 'sid'
        });
    });

    it('returns empty object when no auth config', () => {
        expect(mapSecuritySchemes(null)).toEqual({});
        expect(mapSecuritySchemes(undefined)).toEqual({});
    });

    it('maps OAuth authorization code scheme to oauth2 security scheme', () => {
        const scheme = {
            name: 'oauth2',
            flows: {
                authorizationCode: {
                    authorizationUrl: 'https://auth.example.com/authorize',
                    tokenUrl: 'https://auth.example.com/token',
                    scopes: { 'read:items': 'Read items' }
                }
            },
            authenticate: async () => ({
                succeeded: false as const,
                failure: 'test'
            }),
            challenge: () => ({
                headerName: 'WWW-Authenticate',
                headerValue: 'Bearer'
            })
        };
        const config: AuthenticationConfig = {
            defaultScheme: 'oauth2',
            schemes: [scheme]
        };
        const result = mapSecuritySchemes(config);
        expect(result['oauth2']).toEqual({
            type: 'oauth2',
            flows: {
                authorizationCode: {
                    authorizationUrl: 'https://auth.example.com/authorize',
                    tokenUrl: 'https://auth.example.com/token',
                    scopes: { 'read:items': 'Read items' }
                }
            }
        });
    });

    it('maps OAuth client credentials scheme to oauth2 security scheme', () => {
        const scheme = {
            name: 'oauth2',
            flows: {
                clientCredentials: {
                    tokenUrl: 'https://auth.example.com/token',
                    scopes: { 'service:read': 'Read service data' }
                }
            },
            authenticate: async () => ({
                succeeded: false as const,
                failure: 'test'
            }),
            challenge: () => ({
                headerName: 'WWW-Authenticate',
                headerValue: 'Bearer'
            })
        };
        const config: AuthenticationConfig = {
            defaultScheme: 'oauth2',
            schemes: [scheme]
        };
        const result = mapSecuritySchemes(config);
        expect(result['oauth2']).toEqual({
            type: 'oauth2',
            flows: {
                clientCredentials: {
                    tokenUrl: 'https://auth.example.com/token',
                    scopes: { 'service:read': 'Read service data' }
                }
            }
        });
    });

    it('maps OIDC scheme to openIdConnect security scheme', () => {
        const scheme = {
            name: 'oidc',
            openIdConnectUrl:
                'https://auth.example.com/.well-known/openid-configuration',
            authenticate: async () => ({
                succeeded: false as const,
                failure: 'test'
            }),
            challenge: () => ({
                headerName: 'WWW-Authenticate',
                headerValue: 'Bearer'
            })
        };
        const config: AuthenticationConfig = {
            defaultScheme: 'oidc',
            schemes: [scheme]
        };
        const result = mapSecuritySchemes(config);
        expect(result['oidc']).toEqual({
            type: 'openIdConnect',
            openIdConnectUrl:
                'https://auth.example.com/.well-known/openid-configuration'
        });
    });
});

describe('mapOperationSecurity', () => {
    it('maps authRoles to operation security', () => {
        const result = mapOperationSecurity(['admin', 'user'], ['jwt']);
        expect(result).toEqual([{ jwt: ['admin', 'user'] }]);
    });

    it('maps empty authRoles to empty scopes', () => {
        const result = mapOperationSecurity([], ['jwt']);
        expect(result).toEqual([{ jwt: [] }]);
    });

    it('returns empty array for null authRoles', () => {
        const result = mapOperationSecurity(null, ['jwt']);
        expect(result).toEqual([]);
    });

    it('returns empty array when no security scheme names', () => {
        const result = mapOperationSecurity(['admin'], []);
        expect(result).toEqual([]);
    });

    it('includes all scheme names as alternatives', () => {
        const result = mapOperationSecurity(['admin'], ['jwt', 'cookie']);
        expect(result).toEqual([{ jwt: ['admin'] }, { cookie: ['admin'] }]);
    });
});

describe('mapSecuritySchemes — generic challenge and fallback branches', () => {
    it('maps a custom scheme with a non-bearer challenge header (else-if-challenge branch)', () => {
        const config: AuthenticationConfig = {
            defaultScheme: 'basic',
            schemes: [
                {
                    name: 'basic',
                    authenticate: async () => ({
                        succeeded: false as const,
                        failure: 'test'
                    }),
                    challenge: () => ({
                        headerName: 'WWW-Authenticate',
                        headerValue: 'Basic realm="My App"'
                    })
                }
            ]
        };
        const result = mapSecuritySchemes(config);
        expect(result['basic']).toEqual({ type: 'http', scheme: 'basic' });
    });

    it('maps a scheme with no challenge and no known type to fallback http scheme', () => {
        const config: AuthenticationConfig = {
            defaultScheme: 'apikey',
            schemes: [
                {
                    name: 'apikey',
                    authenticate: async () => ({
                        succeeded: false as const,
                        failure: 'test'
                    })
                } as any
            ]
        };
        const result = mapSecuritySchemes(config);
        expect(result['apikey']).toEqual({ type: 'http', scheme: 'apikey' });
    });
});
