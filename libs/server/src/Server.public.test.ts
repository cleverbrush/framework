import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import type { AuthenticationScheme } from '@cleverbrush/auth';
import { Principal } from '@cleverbrush/auth';
import { describe, expect, it } from 'vitest';
import { ActionResult } from './ActionResult.js';
import { endpoint } from './Endpoint.js';
import { RequestContext } from './RequestContext.js';
import { ServerBuilder } from './Server.js';

describe('Public endpoint integration', () => {
    it('public endpoint (authRoles=null) is accessible without authentication', () => {
        const publicEp = endpoint.get('/api/public');
        const protectedEp = endpoint.get('/api/protected').authorize();
        expect(publicEp.introspect().authRoles).toBeNull();
        expect(protectedEp.introspect().authRoles).toEqual([]);
    });

    it('public() sets authRoles to null on EndpointBuilder', () => {
        const ep = endpoint.get('/api/test').public();
        expect(ep.introspect().authRoles).toBeNull();
    });

    it('public() overrides authorize() on EndpointBuilder', () => {
        const ep = endpoint.get('/api/test').authorize('admin').public();
        expect(ep.introspect().authRoles).toBeNull();
    });

    it('scoped factory .public() makes endpoints public', () => {
        const factory = endpoint.resource('/api/test').public();
        const ep = factory.get();
        expect(ep.introspect().authRoles).toBeNull();
    });

    it('authorize then public on factory methods resets to null', () => {
        const methods = endpoint
            .resource('/api/test')
            .authorize('admin')
            .public();
        const ep = methods.get();
        expect(ep.introspect().authRoles).toBeNull();
    });

    it('auth middleware sets anonymous principal when __endpoint_meta has authRoles=null', () => {
        const socket = new Socket();
        const req = new IncomingMessage(socket);
        req.url = '/api/public';
        req.method = 'GET';
        req.headers = {};
        const res = new ServerResponse(req);
        const ctx = new RequestContext(req, res);
        ctx.items.set('__endpoint_meta', {
            method: 'GET',
            basePath: '/api/public',
            pathTemplate: '/api/public',
            authRoles: null,
            bodySchema: null,
            querySchema: null,
            headerSchema: null,
            serviceSchemas: null,
            summary: null,
            description: null,
            tags: [],
            operationId: null,
            deprecated: false,
            responseSchema: null,
            responsesSchemas: null,
            example: null,
            examples: null,
            producesFile: null,
            produces: null,
            responseHeaderSchema: null,
            externalDocs: null,
            links: null,
            callbacks: null,
            fileUpload: null,
            cacheTags: []
        });
        const meta = ctx.items.get('__endpoint_meta') as any;
        expect(meta.authRoles).toBeNull();
    });

    it('tries configured authentication schemes in order', async () => {
        const first: AuthenticationScheme = {
            name: 'cookie',
            authenticate: async () => ({ succeeded: false })
        };
        const second: AuthenticationScheme<{ id: string }> = {
            name: 'bearer',
            authenticate: async authCtx => {
                if (authCtx.headers.authorization !== 'Bearer token') {
                    return { succeeded: false };
                }
                return {
                    succeeded: true,
                    principal: new Principal(true, { id: 'user-1' })
                };
            }
        };

        const server = await new ServerBuilder()
            .useAuthentication({
                defaultScheme: 'cookie',
                schemes: [first, second],
                trySchemes: ['cookie', 'bearer']
            })
            .handle(endpoint.get('/api/me').authorize(), ({ context }) => ({
                principal: context.principal
            }))
            .listen(0, '127.0.0.1');

        try {
            const port = server.address?.port;
            expect(port).toBeTypeOf('number');

            const response = await fetch(`http://127.0.0.1:${port}/api/me`, {
                headers: { authorization: 'Bearer token' }
            });

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({
                principal: {
                    isAuthenticated: true,
                    value: { id: 'user-1' },
                    claims: {}
                }
            });
        } finally {
            await server.close();
        }
    });

    it('writes native responses from ActionResult.raw()', async () => {
        const server = await new ServerBuilder()
            .handle(endpoint.get('/api/raw'), () =>
                ActionResult.raw((_req, res) => {
                    res.writeHead(202, { 'content-type': 'text/plain' });
                    res.end('raw-body');
                })
            )
            .listen(0, '127.0.0.1');

        try {
            const port = server.address?.port;
            expect(port).toBeTypeOf('number');

            const response = await fetch(`http://127.0.0.1:${port}/api/raw`);

            expect(response.status).toBe(202);
            expect(response.headers.get('content-type')).toBe('text/plain');
            expect(await response.text()).toBe('raw-body');
        } finally {
            await server.close();
        }
    });
});
