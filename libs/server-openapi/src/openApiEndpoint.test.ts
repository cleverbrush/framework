import type { EndpointRegistration } from '@cleverbrush/server';
import { describe, expect, it, vi } from 'vitest';
import { createOpenApiEndpoint } from './openApiEndpoint.js';

const info = { title: 'Test', version: '1.0.0' } as const;

describe('createOpenApiEndpoint', () => {
    it('uses /openapi.json as the default path', () => {
        const { endpoint, handler } = createOpenApiEndpoint({
            getRegistrations: () => [] as EndpointRegistration[],
            info
        });

        expect((endpoint as any).path).toBe('/openapi.json');
        expect(handler).toBeTypeOf('function');
    });

    it('honours an explicit path option', () => {
        const { endpoint } = createOpenApiEndpoint({
            getRegistrations: () => [],
            info,
            path: '/api/spec.json'
        });
        expect((endpoint as any).path).toBe('/api/spec.json');
    });

    it('returns a valid OpenAPI 3.1 document with the supplied info', () => {
        const { handler } = createOpenApiEndpoint({
            getRegistrations: () => [],
            info: { title: 'My API', version: '2.3.4' },
            servers: [{ url: 'https://example.com' }]
        });

        const spec = handler();
        expect(spec.openapi).toBe('3.1.0');
        expect(spec.info).toMatchObject({ title: 'My API', version: '2.3.4' });
        expect(spec.servers).toEqual([{ url: 'https://example.com' }]);
    });

    it('caches the spec across multiple invocations', () => {
        const getRegistrations = vi.fn(() => [] as EndpointRegistration[]);
        const { handler } = createOpenApiEndpoint({
            getRegistrations,
            info
        });

        const a = handler();
        const b = handler();

        expect(a).toBe(b);
        expect(getRegistrations).toHaveBeenCalledTimes(1);
    });

    it('derives getRegistrations and authConfig from the server option', () => {
        const getRegistrations = vi.fn(() => [] as EndpointRegistration[]);
        const getAuthenticationConfig = vi.fn(() => null);
        const server = { getRegistrations, getAuthenticationConfig } as any;

        const { handler } = createOpenApiEndpoint({ server, info });

        handler();
        expect(getRegistrations).toHaveBeenCalled();
        expect(getAuthenticationConfig).toHaveBeenCalled();
    });

    it('explicit getRegistrations overrides server.getRegistrations', () => {
        const fromServer = vi.fn(() => [] as EndpointRegistration[]);
        const fromOption = vi.fn(() => [] as EndpointRegistration[]);
        const server = {
            getRegistrations: fromServer,
            getAuthenticationConfig: () => null
        } as any;

        const { handler } = createOpenApiEndpoint({
            server,
            getRegistrations: fromOption,
            info
        });

        handler();
        expect(fromOption).toHaveBeenCalled();
        expect(fromServer).not.toHaveBeenCalled();
    });

    it('uses an empty registration list when neither server nor getRegistrations is supplied', () => {
        const { handler } = createOpenApiEndpoint({ info });
        const spec = handler();
        // No paths registered → empty paths object.
        expect(spec.paths).toEqual({});
    });

    it('explicit authConfig=null overrides the server default', () => {
        const getAuthenticationConfig = vi.fn(() => ({}) as any);
        const server = {
            getRegistrations: () => [],
            getAuthenticationConfig
        } as any;

        const { handler } = createOpenApiEndpoint({
            server,
            authConfig: null,
            info
        });

        handler();
        expect(getAuthenticationConfig).not.toHaveBeenCalled();
    });
});
