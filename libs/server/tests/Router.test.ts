import { number, object, parseString, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { Router } from '../src/Router.js';
import type { ControllerRegistration, RouteDefinition } from '../src/types.js';

function makeRegistration(
    basePath: string,
    routes: Record<string, RouteDefinition>
): ControllerRegistration {
    return {
        schema: object({}),
        implementation: class {},
        config: { basePath, routes }
    };
}

describe('Router', () => {
    it('matches static routes', () => {
        const router = new Router();
        const reg = makeRegistration('/api/users', {
            list: { method: 'GET', path: '/' }
        });
        router.addRoute(reg, 'list', reg.config.routes['list']);

        const result = router.match('GET', '/api/users');
        expect(result.match).not.toBeNull();
        expect(result.match!.methodName).toBe('list');
    });

    it('matches static routes with trailing slash', () => {
        const router = new Router();
        const reg = makeRegistration('/api/users', {
            list: { method: 'GET', path: '/' }
        });
        router.addRoute(reg, 'list', reg.config.routes['list']);

        const result = router.match('GET', '/api/users/');
        expect(result.match).not.toBeNull();
    });

    it('matches dynamic parseString routes', () => {
        const GetUserPath = parseString(
            object({ id: number().coerce() }),
            $t => $t`/${t => t.id}`
        );

        const router = new Router();
        const reg = makeRegistration('/api/users', {
            getUser: { method: 'GET', path: GetUserPath }
        });
        router.addRoute(reg, 'getUser', reg.config.routes['getUser']);

        const result = router.match('GET', '/api/users/42');
        expect(result.match).not.toBeNull();
        expect(result.match!.parsedPath).toEqual({ id: 42 });
        expect(result.match!.methodName).toBe('getUser');
    });

    it('matches multi-param parseString routes', () => {
        const GetPostPath = parseString(
            object({ userId: number().coerce(), postId: number().coerce() }),
            $t => $t`/${t => t.userId}/posts/${t => t.postId}`
        );

        const router = new Router();
        const reg = makeRegistration('/api', {
            getPost: { method: 'GET', path: GetPostPath }
        });
        router.addRoute(reg, 'getPost', reg.config.routes['getPost']);

        const result = router.match('GET', '/api/5/posts/42');
        expect(result.match).not.toBeNull();
        expect(result.match!.parsedPath).toEqual({ userId: 5, postId: 42 });
    });

    it('returns 405 for wrong method', () => {
        const router = new Router();
        const reg = makeRegistration('/api/users', {
            list: { method: 'GET', path: '/' }
        });
        router.addRoute(reg, 'list', reg.config.routes['list']);

        const result = router.match('POST', '/api/users');
        expect(result.match).toBeNull();
        expect(result.methodNotAllowed).toBe(true);
        expect(result.allowedMethods).toContain('GET');
    });

    it('returns 404 for unmatched path', () => {
        const router = new Router();
        const reg = makeRegistration('/api/users', {
            list: { method: 'GET', path: '/' }
        });
        router.addRoute(reg, 'list', reg.config.routes['list']);

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
        const reg = makeRegistration('/users', {
            getByName: { method: 'GET', path: ByNamePath }
        });
        router.addRoute(reg, 'getByName', reg.config.routes['getByName']);

        const result = router.match('GET', '/users/John%20Doe');
        expect(result.match).not.toBeNull();
        expect(result.match!.parsedPath).toEqual({ name: 'John Doe' });
    });

    it('matches first route when multiple routes exist', () => {
        const router = new Router();
        const reg1 = makeRegistration('/api', {
            first: { method: 'GET', path: '/items' }
        });
        const reg2 = makeRegistration('/api', {
            second: { method: 'GET', path: '/items' }
        });
        router.addRoute(reg1, 'first', reg1.config.routes['first']);
        router.addRoute(reg2, 'second', reg2.config.routes['second']);

        const result = router.match('GET', '/api/items');
        expect(result.match!.methodName).toBe('first');
    });

    it('handles basePath without trailing slash', () => {
        const router = new Router();
        const reg = makeRegistration('/api', {
            list: { method: 'GET', path: '/users' }
        });
        router.addRoute(reg, 'list', reg.config.routes['list']);

        const result = router.match('GET', '/api/users');
        expect(result.match).not.toBeNull();
    });

    it('handles empty basePath', () => {
        const router = new Router();
        const reg = makeRegistration('', {
            root: { method: 'GET', path: '/' }
        });
        router.addRoute(reg, 'root', reg.config.routes['root']);

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
        const reg = makeRegistration('', {
            get: { method: 'GET', path: NestedPath }
        });
        router.addRoute(reg, 'get', reg.config.routes['get']);

        const result = router.match('GET', '/orders/42/by/alice');
        expect(result.match).not.toBeNull();
        expect(result.match!.parsedPath).toEqual({
            order: { id: 42 },
            user: { name: 'alice' }
        });
    });

    it('case-insensitive method matching', () => {
        const router = new Router();
        const reg = makeRegistration('/api', {
            create: { method: 'POST', path: '/items' }
        });
        router.addRoute(reg, 'create', reg.config.routes['create']);

        const result = router.match('post', '/api/items');
        expect(result.match).not.toBeNull();
    });
});
