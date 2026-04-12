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
