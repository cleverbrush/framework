import { describe, expect, it } from 'vitest';
import {
    authorizationCodeScheme,
    clientCredentialsScheme
} from './OAuthScheme.js';

// -----------------------------------------------------------------------
// authorizationCodeScheme
// -----------------------------------------------------------------------

describe('authorizationCodeScheme', () => {
    it('returns a scheme with default name "oauth2"', () => {
        const scheme = authorizationCodeScheme({
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            authenticate: async () => ({ succeeded: false as const })
        });
        expect(scheme.name).toBe('oauth2');
    });

    it('allows overriding the scheme name', () => {
        const scheme = authorizationCodeScheme({
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            name: 'my-oauth',
            authenticate: async () => ({ succeeded: false as const })
        });
        expect(scheme.name).toBe('my-oauth');
    });

    it('exposes flows with authorizationCode flow', () => {
        const scheme = authorizationCodeScheme({
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            scopes: { 'read:items': 'Read items' },
            authenticate: async () => ({ succeeded: false as const })
        });
        const flows = (scheme as any).flows;
        expect(flows).toEqual({
            authorizationCode: {
                authorizationUrl: 'https://auth.example.com/authorize',
                tokenUrl: 'https://auth.example.com/token',
                scopes: { 'read:items': 'Read items' }
            }
        });
    });

    it('includes refreshUrl when provided', () => {
        const scheme = authorizationCodeScheme({
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            refreshUrl: 'https://auth.example.com/refresh',
            authenticate: async () => ({ succeeded: false as const })
        });
        const flows = (scheme as any).flows;
        expect(flows.authorizationCode.refreshUrl).toBe(
            'https://auth.example.com/refresh'
        );
    });

    it('defaults scopes to empty object', () => {
        const scheme = authorizationCodeScheme({
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            authenticate: async () => ({ succeeded: false as const })
        });
        const flows = (scheme as any).flows;
        expect(flows.authorizationCode.scopes).toEqual({});
    });

    it('delegates authenticate to the provided callback', async () => {
        const scheme = authorizationCodeScheme({
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            authenticate: async () => ({
                succeeded: true as const,
                value: { userId: '42' }
            })
        });
        const result = await scheme.authenticate({
            headers: {},
            cookies: {},
            items: new Map()
        });
        expect(result).toEqual({ succeeded: true, value: { userId: '42' } });
    });

    it('challenge returns Bearer', () => {
        const scheme = authorizationCodeScheme({
            authorizationUrl: 'https://auth.example.com/authorize',
            tokenUrl: 'https://auth.example.com/token',
            authenticate: async () => ({ succeeded: false as const })
        });
        expect(scheme.challenge!()).toEqual({
            headerName: 'WWW-Authenticate',
            headerValue: 'Bearer'
        });
    });
});

// -----------------------------------------------------------------------
// clientCredentialsScheme
// -----------------------------------------------------------------------

describe('clientCredentialsScheme', () => {
    it('returns a scheme with default name "oauth2"', () => {
        const scheme = clientCredentialsScheme({
            tokenUrl: 'https://auth.example.com/token',
            authenticate: async () => ({ succeeded: false as const })
        });
        expect(scheme.name).toBe('oauth2');
    });

    it('allows overriding the scheme name', () => {
        const scheme = clientCredentialsScheme({
            tokenUrl: 'https://auth.example.com/token',
            name: 'service-auth',
            authenticate: async () => ({ succeeded: false as const })
        });
        expect(scheme.name).toBe('service-auth');
    });

    it('exposes flows with clientCredentials flow', () => {
        const scheme = clientCredentialsScheme({
            tokenUrl: 'https://auth.example.com/token',
            scopes: { 'service:read': 'Read service data' },
            authenticate: async () => ({ succeeded: false as const })
        });
        const flows = (scheme as any).flows;
        expect(flows).toEqual({
            clientCredentials: {
                tokenUrl: 'https://auth.example.com/token',
                scopes: { 'service:read': 'Read service data' }
            }
        });
    });

    it('includes refreshUrl when provided', () => {
        const scheme = clientCredentialsScheme({
            tokenUrl: 'https://auth.example.com/token',
            refreshUrl: 'https://auth.example.com/refresh',
            authenticate: async () => ({ succeeded: false as const })
        });
        const flows = (scheme as any).flows;
        expect(flows.clientCredentials.refreshUrl).toBe(
            'https://auth.example.com/refresh'
        );
    });

    it('delegates authenticate to the provided callback', async () => {
        const scheme = clientCredentialsScheme({
            tokenUrl: 'https://auth.example.com/token',
            authenticate: async () => ({
                succeeded: true as const,
                value: { service: 'api' }
            })
        });
        const result = await scheme.authenticate({
            headers: {},
            cookies: {},
            items: new Map()
        });
        expect(result).toEqual({ succeeded: true, value: { service: 'api' } });
    });

    it('challenge returns Bearer', () => {
        const scheme = clientCredentialsScheme({
            tokenUrl: 'https://auth.example.com/token',
            authenticate: async () => ({ succeeded: false as const })
        });
        expect(scheme.challenge!()).toEqual({
            headerName: 'WWW-Authenticate',
            headerValue: 'Bearer'
        });
    });
});
