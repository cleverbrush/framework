import { number, object, parseString, string } from '@cleverbrush/schema';
import { describe, expect, it, vi } from 'vitest';
import { type EndpointMetadata, endpoint } from '../src/Endpoint.js';
import { Router } from '../src/Router.js';
import type { SubscriptionMetadata } from '../src/Subscription.js';
import type {
    EndpointRegistration,
    SubscriptionRegistration
} from '../src/types.js';

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
            headerSchema: null,
            serviceSchemas: null,
            authRoles: null,
            summary: null,
            description: null,
            tags: [],
            operationId: null,
            deprecated: false,
            responseSchema: null
        },
        handler: () => {}
    };
}

function makeSubscriptionRegistration(
    basePath: string,
    pathTemplate: SubscriptionMetadata['pathTemplate'] = '/'
): SubscriptionRegistration {
    return {
        endpoint: endpoint.subscription(basePath, pathTemplate).introspect(),
        handler: async function* () {}
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

    it('prefers a nested dynamic route over an earlier generic route', () => {
        const GenericPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}`
        );
        const QuestionPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}/question`
        );
        const genericValidate = vi.spyOn(GenericPath, 'validate');
        const router = new Router();
        const generic = makeRegistration('GET', '/sessions', GenericPath);
        const question = makeRegistration('GET', '/sessions', QuestionPath);
        router.addRoute(generic);
        router.addRoute(question);

        const result = router.match('GET', '/sessions/984/question');

        expect(result.match?.registration).toBe(question);
        expect(result.match?.parsedPath).toEqual({ id: '984' });
        expect(genericValidate).not.toHaveBeenCalled();
    });

    it('falls back when a more-specific route fails validation', () => {
        const GenericPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}`
        );
        const NumericQuestionPath = parseString(
            object({ id: number().coerce() }),
            $t => $t`/${t => t.id}/question`
        );
        const specificValidate = vi.spyOn(NumericQuestionPath, 'validate');
        const genericValidate = vi.spyOn(GenericPath, 'validate');
        const router = new Router();
        const generic = makeRegistration('GET', '/sessions', GenericPath);
        const numericQuestion = makeRegistration(
            'GET',
            '/sessions',
            NumericQuestionPath
        );
        router.addRoute(generic);
        router.addRoute(numericQuestion);

        const result = router.match('GET', '/sessions/not-a-number/question');

        expect(result.match?.registration).toBe(generic);
        expect(result.match?.parsedPath).toEqual({
            id: 'not-a-number/question'
        });
        expect(specificValidate).toHaveBeenCalledOnce();
        expect(genericValidate).toHaveBeenCalledOnce();
    });

    it('re-finalizes after a route is added following a match', () => {
        const GenericPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}`
        );
        const QuestionPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}/question`
        );
        const router = new Router();
        const generic = makeRegistration('GET', '/sessions', GenericPath);
        const question = makeRegistration('GET', '/sessions', QuestionPath);
        router.addRoute(generic);

        expect(
            router.match('GET', '/sessions/984/question').match?.registration
        ).toBe(generic);

        router.addRoute(question);

        const result = router.match('GET', '/sessions/984/question');
        expect(result.match?.registration).toBe(question);
        expect(result.match?.parsedPath).toEqual({ id: '984' });
    });

    it('prefers a static-leading dynamic route over a generic route', () => {
        const GenericPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}`
        );
        const ActivePath = parseString(
            object({ telegramUserId: string() }),
            $t => $t`/active/${t => t.telegramUserId}`
        );
        const router = new Router();
        const generic = makeRegistration('GET', '/sessions', GenericPath);
        const active = makeRegistration('GET', '/sessions', ActivePath);
        router.addRoute(generic);
        router.addRoute(active);

        const result = router.match('GET', '/sessions/active/123');

        expect(result.match?.registration).toBe(active);
        expect(result.match?.parsedPath).toEqual({
            telegramUserId: '123'
        });
    });

    it('prefers an exact static route over a dynamic route', () => {
        const GenericPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}`
        );
        const genericValidate = vi.spyOn(GenericPath, 'validate');
        const router = new Router();
        const generic = makeRegistration('GET', '/sessions', GenericPath);
        const exact = makeRegistration('GET', '/sessions/984/question');
        router.addRoute(generic);
        router.addRoute(exact);

        const result = router.match('GET', '/sessions/984/question');

        expect(result.match?.registration).toBe(exact);
        expect(result.match?.parsedPath).toBeNull();
        expect(genericValidate).not.toHaveBeenCalled();
    });

    it('indexes zero-interpolation templates as exact routes', () => {
        const GenericPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}`
        );
        const StaticPath = parseString(object({}), $t => $t`/health`);
        const genericValidate = vi.spyOn(GenericPath, 'validate');
        const router = new Router();
        const generic = makeRegistration('GET', '', GenericPath);
        const exact = makeRegistration('GET', '', StaticPath);
        router.addRoute(generic);
        router.addRoute(exact);

        const result = router.match('GET', '/health');

        expect(result.match?.registration).toBe(exact);
        expect(result.match?.parsedPath).toEqual({});
        expect(genericValidate).not.toHaveBeenCalled();
    });

    it('prefers fewer dynamic segments when literal counts are equal', () => {
        const TwoParamsPath = parseString(
            object({ first: string(), second: string() }),
            $t => $t`/${t => t.first}/${t => t.second}/fixed`
        );
        const OneParamPath = parseString(
            object({ value: string() }),
            $t => $t`/${t => t.value}/fixed`
        );
        const router = new Router();
        const twoParams = makeRegistration('GET', '/routes', TwoParamsPath);
        const oneParam = makeRegistration('GET', '/routes', OneParamPath);
        router.addRoute(twoParams);
        router.addRoute(oneParam);

        const result = router.match('GET', '/routes/one/two/fixed');

        expect(result.match?.registration).toBe(oneParam);
        expect(result.match?.parsedPath).toEqual({ value: 'one/two' });
    });

    it('uses registration order for equal-specificity dynamic routes', () => {
        const TrailingLiteralPath = parseString(
            object({ value: string() }),
            $t => $t`/${t => t.value}/fixed`
        );
        const LeadingLiteralPath = parseString(
            object({ value: string() }),
            $t => $t`/fixed/${t => t.value}`
        );
        const secondValidate = vi.spyOn(LeadingLiteralPath, 'validate');
        const router = new Router();
        const first = makeRegistration('GET', '/routes', TrailingLiteralPath);
        const second = makeRegistration('GET', '/routes', LeadingLiteralPath);
        router.addRoute(first);
        router.addRoute(second);

        const result = router.match('GET', '/routes/fixed/fixed');

        expect(result.match?.registration).toBe(first);
        expect(secondValidate).not.toHaveBeenCalled();
    });

    it('preserves trailing-slash handling when ranking dynamic routes', () => {
        const GenericPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}`
        );
        const QuestionPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}/question`
        );
        const router = new Router();
        const generic = makeRegistration('GET', '/sessions', GenericPath);
        const question = makeRegistration('GET', '/sessions', QuestionPath);
        router.addRoute(generic);
        router.addRoute(question);

        const result = router.match('GET', '/sessions/984/question/');

        expect(result.match?.registration).toBe(question);
        expect(result.match?.parsedPath).toEqual({ id: '984' });
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

    it('returns badRequest for malformed percent-encoded URL', () => {
        const router = new Router();
        const reg = makeRegistration('GET', '/api');
        router.addRoute(reg);

        const result = router.match('GET', '/api/%GG');
        expect(result.match).toBeNull();
        expect(result.methodNotAllowed).toBe(false);
        expect(result.badRequest).toBe(true);
    });

    it('preserves %2F (encoded slash) in URL without changing path segmentation', () => {
        const ByNamePath = parseString(
            object({ name: string() }),
            $t => $t`/${t => t.name}`
        );

        const router = new Router();
        const reg = makeRegistration('GET', '/files', ByNamePath);
        router.addRoute(reg);

        // %2F should NOT be decoded into a path separator so the route stays
        // under /files and the remainder is treated as one segment.
        const result = router.match('GET', '/files/foo%2Fbar');
        // The schema receives /foo%2Fbar as the remainder (still encoded)
        // which does not match a single-segment name pattern — but crucially
        // the router should not crash or misinterpret the path structure.
        expect(result.badRequest).not.toBe(true);
    });

    it('ranks WebSocket subscription routes by specificity', () => {
        const GenericPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}`
        );
        const QuestionPath = parseString(
            object({ id: string() }),
            $t => $t`/${t => t.id}/question`
        );
        const genericValidate = vi.spyOn(GenericPath, 'validate');
        const router = new Router();
        const generic = makeSubscriptionRegistration(
            '/ws/sessions',
            GenericPath
        );
        const question = makeSubscriptionRegistration(
            '/ws/sessions',
            QuestionPath
        );
        router.addSubscriptionRoute(generic);
        router.addSubscriptionRoute(question);

        const result = router.matchSubscription('/ws/sessions/984/question/');

        expect(result?.registration).toBe(question);
        expect(result?.parsedPath).toEqual({ id: '984' });
        expect(genericValidate).not.toHaveBeenCalled();
    });

    it('uses registration order for equal-specificity subscriptions', () => {
        const FirstPath = parseString(
            object({ value: string() }),
            $t => $t`/${t => t.value}/fixed`
        );
        const SecondPath = parseString(
            object({ value: string() }),
            $t => $t`/fixed/${t => t.value}`
        );
        const router = new Router();
        const first = makeSubscriptionRegistration('/ws', FirstPath);
        const second = makeSubscriptionRegistration('/ws', SecondPath);
        router.addSubscriptionRoute(first);
        router.addSubscriptionRoute(second);

        const result = router.matchSubscription('/ws/fixed/fixed');

        expect(result?.registration).toBe(first);
    });
});
