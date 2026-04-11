import { number, object, parseString, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import type { EndpointMetadata } from '../src/Endpoint.js';
import { Router } from '../src/Router.js';
import type { EndpointRegistration } from '../src/types.js';

function makeRegistration(
    method: string,
    basePath: string,
    pathTemplate: EndpointMetadata['pathTemplate'] = '/'
): EndpointRegistration {
    return {
        endpoint: {
            method,
            basePath,
            pathTemplate,
            bodySchema: null,
            querySchema: null,
            headerSchema: null
        },
        handler: () => {}
    };
}

describe('Router', () => {
    it('matches static routes', () => {
        const router = new Router();
        const reg = makeRegistration('GET', '/api/users');
        router.addRoute(reg);

        const result = router.match('GET', '/api/users');
        expect(result.match).not.toBeNull();
        expect(result.match!.registration).toBe(reg);
    });

    it('matches static routes with trailing slash', () => {
        const router = new Router();
        const reg = makeRegistration('GET', '/api/users');
        router.addRoute(reg);

        const result = router.match('GET', '/api/users/');
        expect(result.match).not.toBeNull();
    });

    it('matches dynamic parseString routes', () => {
        const GetUserPath = parseString(
            object({ id: number().coerce() }),
            $t => $t`/${t => t.id}`
        );

        const router = new Router();
        const reg = makeRegistration('GET', '/api/users', GetUserPath);
        router.addRoute(reg);

        const result = router.match('GET', '/api/users/42');
        expect(result.match).not.toBeNull();
        expect(result.match!.parsedPath).toEqual({ id: 42 });
    });

    it('matches multi-param parseString routes', () => {
        const GetPostPath = parseString(
            object({ userId: number().coerce(), postId: number().coerce() }),
            $t => $t`/${t => t.userId}/posts/${t => t.postId}`
        );

        const router = new Router();
        const reg = makeRegistration('GET', '/api', GetPostPath);
        router.addRoute(reg);

        const result = router.match('GET', '/api/5/posts/42');
        expect(result.match).not.toBeNull();
        expect(result.match!.parsedPath).toEqual({ userId: 5, postId: 42 });
    });

    it('returns 405 for wrong method', () => {
        const router = new Router();
        const reg = makeRegistration('GET', '/api/users');
        router.addRoute(reg);

        const result = router.match('POST', '/api/users');
        expect(result.match).toBeNull();
        expect(result.methodNotAllowed).toBe(true);
        expect(result.allowedMethods).toContain('GET');
    });

    it('returns 404 for unmatched path', () => {
        const router = new Router();
        const reg = makeRegistration('GET', '/api/users');
        router.addRoute(reg);

        const result = router.match('GET', '/api/orders');
        expect(result.match).toBeNull();
        expect(result.methodNotAllowed).toBe(false);
    });

    it('handles URL-encoded paths', () => {
        const ByNamePath = parseString(
            object({ name: string() }),
            $t => $t`/${t => t.name}`
        );

        const router = new Router();
        const reg = makeRegistration('GET', '/users', ByNamePath);
        router.addRoute(reg);

        const result = router.match('GET', '/users/John%20Doe');
        expect(result.match).not.toBeNull();
        expect(result.match!.parsedPath).toEqual({ name: 'John Doe' });
    });

    it('matches first route when multiple routes exist', () => {
        const router = new Router();
        const reg1 = makeRegistration('GET', '/api/items');
        const reg2 = makeRegistration('GET', '/api/items');
        router.addRoute(reg1);
        router.addRoute(reg2);

        const result = router.match('GET', '/api/items');
        expect(result.match!.registration).toBe(reg1);
    });

    it('handles basePath without trailing slash', () => {
        const router = new Router();
        const reg = makeRegistration('GET', '/api', '/users');
        router.addRoute(reg);

        const result = router.match('GET', '/api/users');
        expect(result.match).not.toBeNull();
    });

    it('handles empty basePath', () => {
        const router = new Router();
        const reg = makeRegistration('GET', '');
        router.addRoute(reg);

        const result = router.match('GET', '/');
        expect(result.match).not.toBeNull();
    });

    it('nested object paths via parseString', () => {
        const NestedPath = parseString(
            object({
                order: object({ id: number().coerce() }),
                user: object({ name: string() })
            }),
            $t => $t`/orders/${t => t.order.id}/by/${t => t.user.name}`
        );

        const router = new Router();
        const reg = makeRegistration('GET', '', NestedPath);
        router.addRoute(reg);

        const result = router.match('GET', '/orders/42/by/alice');
        expect(result.match).not.toBeNull();
        expect(result.match!.parsedPath).toEqual({
            order: { id: 42 },
            user: { name: 'alice' }
        });
    });

    it('case-insensitive method matching', () => {
        const router = new Router();
        const reg = makeRegistration('POST', '/api/items');
        router.addRoute(reg);

        const result = router.match('post', '/api/items');
        expect(result.match).not.toBeNull();
    });
});
