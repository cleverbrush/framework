import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { describe, expect, it } from 'vitest';
import { endpoint } from './Endpoint.js';
import { RequestContext } from './RequestContext.js';

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
});
