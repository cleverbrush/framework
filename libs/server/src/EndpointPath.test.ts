import { number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { ActionResult } from './ActionResult.js';
import {
    endpoint,
    endpointPath,
    matchEndpointPath,
    route
} from './contract.js';
import { createServer } from './Server.js';

const content = endpoint
    .resource('/api/files')
    .get(route({ id: string().minLength(1) })`/${p => p.id}/content`);

describe('endpoint paths', () => {
    it.each([
        'file-1',
        'report one',
        'a/b',
        'a?b#c',
        '100%',
        'a%2Fb',
        '日本語'
    ])('round trips parameter %s', id => {
        const path = endpointPath(content, { id });
        expect(path).toBe(`/api/files/${encodeURIComponent(id)}/content`);
        expect(matchEndpointPath(content, path)).toEqual({ id });
        expect(matchEndpointPath(content, path + '/')).toEqual({ id });
    });
    it('supports static paths, resources and nested/coerced parameters', () => {
        expect(endpointPath(endpoint.get('/health'))).toBe('/health');
        expect(endpointPath(endpoint.resource('/health').get('/'))).toBe(
            '/health'
        );
        expect(matchEndpointPath(endpoint.get('/health'), '/health/')).toEqual(
            {}
        );
        const nested = endpoint.resource('').get(
            route({
                owner: object({ id: number().coerce().isInteger().min(1) })
            })`/owners/${p => p.owner.id}`
        );
        expect(endpointPath(nested, { owner: { id: 7 } })).toBe('/owners/7');
        expect(matchEndpointPath(nested, '/owners/7')).toEqual({
            owner: { id: 7 }
        });
        expect(matchEndpointPath(nested, '/owners/0')).toBeUndefined();
        expect(matchEndpointPath(nested, '/owners/seven')).toBeUndefined();
        expect(() => endpointPath(nested, { owner: { id: 0 } })).toThrow(
            'Invalid path parameter'
        );
    });
    it.each([
        '/other/a/content',
        '/api/files/%XX/content',
        '/api/files/a/content?q=1',
        '/api/files/a/content#fragment',
        'https://example.com/api/files/a/content',
        '//api/files/a/content'
    ])('rejects invalid pathname %s', path => {
        expect(matchEndpointPath(content, path)).toBeUndefined();
    });
    it('matches encoded literals without decoding parameter escapes twice', () => {
        const item = endpoint
            .resource('/café')
            .get(route({ id: string() })`/日本/${p => p.id}`);
        expect(
            matchEndpointPath(item, '/caf%C3%A9/%E6%97%A5%E6%9C%AC/a%252Fb')
        ).toEqual({ id: 'a%2Fb' });
        expect(matchEndpointPath(item, '/caf%c3%a9/日本/item')).toEqual({
            id: 'item'
        });
    });
    it('retains empty parameters permitted by their schema', () => {
        const item = endpoint
            .resource('/items')
            .get(route({ id: string() })`/${p => p.id}/content`);
        expect(matchEndpointPath(item, '/items//content')).toEqual({ id: '' });
    });
    it('preserves multi-segment route parameters', () => {
        expect(matchEndpointPath(content, '/api/files/a/b/content')).toEqual({
            id: 'a/b'
        });
    });
    it('validates required parameters and escapes literal regex syntax', () => {
        expect(() => endpointPath(content, {} as any)).toThrow(
            'Missing path parameter'
        );
        expect(() => endpointPath(content, { id: '' })).toThrow(
            'Invalid path parameter'
        );
        const literal = endpoint
            .resource('')
            .get(route({ id: string() })`/files/v1.0/${p => p.id}`);
        expect(matchEndpointPath(literal, '/files/v1X0/a')).toBeUndefined();
        expect(matchEndpointPath(literal, '/files/v1.0/a')).toEqual({
            id: 'a'
        });
    });
    it('uses the same encoded parameters in the HTTP router', async () => {
        const server = await createServer()
            .handle(content, ({ params }) => ActionResult.ok(params))
            .listen(0, '127.0.0.1');
        try {
            const address = server.address;
            const port =
                typeof address === 'object' && address ? address.port : 0;
            for (const id of ['report one', 'a/b', 'a%2Fb', 'a?b#c']) {
                const response = await fetch(
                    `http://127.0.0.1:${port}${endpointPath(content, { id })}`
                );
                expect(response.status).toBe(200);
                expect(await response.json()).toEqual({ id });
            }
        } finally {
            await server.close();
        }
    });
});
