import { describe, expect, it } from 'vitest';
import { oidcScheme } from './OidcScheme.js';

describe('oidcScheme', () => {
    it('returns a scheme with default name "oidc"', () => {
        const scheme = oidcScheme({
            openIdConnectUrl:
                'https://auth.example.com/.well-known/openid-configuration',
            authenticate: async () => ({ succeeded: false as const })
        });
        expect(scheme.name).toBe('oidc');
    });

    it('allows overriding the scheme name', () => {
        const scheme = oidcScheme({
            openIdConnectUrl:
                'https://auth.example.com/.well-known/openid-configuration',
            name: 'my-oidc',
            authenticate: async () => ({ succeeded: false as const })
        });
        expect(scheme.name).toBe('my-oidc');
    });

    it('exposes openIdConnectUrl property', () => {
        const scheme = oidcScheme({
            openIdConnectUrl:
                'https://auth.example.com/.well-known/openid-configuration',
            authenticate: async () => ({ succeeded: false as const })
        });
        expect((scheme as any).openIdConnectUrl).toBe(
            'https://auth.example.com/.well-known/openid-configuration'
        );
    });

    it('delegates authenticate to the provided callback', async () => {
        const scheme = oidcScheme({
            openIdConnectUrl:
                'https://auth.example.com/.well-known/openid-configuration',
            authenticate: async () => ({
                succeeded: true as const,
                value: { sub: 'user-1' }
            })
        });
        const result = await scheme.authenticate({
            headers: {},
            cookies: {},
            items: new Map()
        });
        expect(result).toEqual({ succeeded: true, value: { sub: 'user-1' } });
    });

    it('challenge returns Bearer', () => {
        const scheme = oidcScheme({
            openIdConnectUrl:
                'https://auth.example.com/.well-known/openid-configuration',
            authenticate: async () => ({ succeeded: false as const })
        });
        expect(scheme.challenge!()).toEqual({
            headerName: 'WWW-Authenticate',
            headerValue: 'Bearer'
        });
    });
});
