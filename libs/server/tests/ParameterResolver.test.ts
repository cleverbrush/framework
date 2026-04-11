import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { boolean, func, number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { resolveParameters } from '../src/ParameterResolver.js';
import { RequestContext } from '../src/RequestContext.js';
import type { ParameterSource, RouteMatch } from '../src/types.js';
import { body, context, header, path, query } from '../src/types.js';

function createMockContext(
    overrides: {
        queryParams?: Record<string, string>;
        headers?: Record<string, string>;
        url?: string;
        method?: string;
    } = {}
): RequestContext {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.url = overrides.url ?? '/';
    req.method = overrides.method ?? 'GET';
    if (overrides.headers) {
        req.headers = overrides.headers;
    }
    const res = new ServerResponse(req);
    const ctx = new RequestContext(req, res);
    // Override queryParams if provided
    if (overrides.queryParams) {
        (ctx as any)._queryParams = overrides.queryParams;
    }
    return ctx;
}

function createRouteMatch(parsedPath: Record<string, any> | null): RouteMatch {
    return {
        registration: {
            schema: object({}),
            implementation: class {},
            config: { routes: {} }
        },
        methodName: 'test',
        routeDef: { method: 'GET', path: '/' },
        parsedPath
    };
}

describe('ParameterResolver', () => {
    it('resolves path parameter', () => {
        const schema = func().addParameter(object({ id: number() }));
        const sources: ParameterSource[] = [path()];
        const match = createRouteMatch({ id: 42 });
        const ctx = createMockContext();

        const result = resolveParameters(
            schema,
            sources,
            match,
            ctx,
            undefined
        );
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.args[0]).toEqual({ id: 42 });
        }
    });

    it('resolves context parameter', () => {
        const schema = func().addParameter(object({}));
        const sources: ParameterSource[] = [context()];
        const match = createRouteMatch(null);
        const ctx = createMockContext();

        const result = resolveParameters(
            schema,
            sources,
            match,
            ctx,
            undefined
        );
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.args[0]).toBe(ctx);
        }
    });

    it('resolves body parameter with validation', () => {
        const BodySchema = object({ name: string(), age: number() });
        const schema = func().addParameter(BodySchema);
        const sources: ParameterSource[] = [body()];
        const match = createRouteMatch(null);
        const ctx = createMockContext();

        const result = resolveParameters(schema, sources, match, ctx, {
            name: 'Alice',
            age: 30
        });
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.args[0]).toEqual({ name: 'Alice', age: 30 });
        }
    });

    it('returns validation errors for invalid body', () => {
        const BodySchema = object({ name: string(), age: number() });
        const schema = func().addParameter(BodySchema);
        const sources: ParameterSource[] = [body()];
        const match = createRouteMatch(null);
        const ctx = createMockContext();

        const result = resolveParameters(schema, sources, match, ctx, {
            name: 123
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.problemDetails.status).toBe(400);
            expect(
                (result.problemDetails as any).errors.length
            ).toBeGreaterThan(0);
        }
    });

    it('resolves query parameter with number coercion', () => {
        const schema = func().addParameter(number());
        const sources: ParameterSource[] = [query('page')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({ queryParams: { page: '5' } });

        const result = resolveParameters(
            schema,
            sources,
            match,
            ctx,
            undefined
        );
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.args[0]).toBe(5);
        }
    });

    it('resolves query parameter with boolean coercion', () => {
        const schema = func().addParameter(boolean());
        const sources: ParameterSource[] = [query('active')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({ queryParams: { active: 'true' } });

        const result = resolveParameters(
            schema,
            sources,
            match,
            ctx,
            undefined
        );
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.args[0]).toBe(true);
        }
    });

    it('resolves header parameter', () => {
        const schema = func().addParameter(string());
        const sources: ParameterSource[] = [header('x-request-id')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({
            headers: { 'x-request-id': 'abc-123' }
        });

        const result = resolveParameters(
            schema,
            sources,
            match,
            ctx,
            undefined
        );
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.args[0]).toBe('abc-123');
        }
    });

    it('resolves mixed parameter sources', () => {
        const schema = func()
            .addParameter(object({ id: number() }))
            .addParameter(string());
        const sources: ParameterSource[] = [path(), header('authorization')];
        const match = createRouteMatch({ id: 1 });
        const ctx = createMockContext({
            headers: { authorization: 'Bearer token' }
        });

        const result = resolveParameters(
            schema,
            sources,
            match,
            ctx,
            undefined
        );
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.args[0]).toEqual({ id: 1 });
            expect(result.args[1]).toBe('Bearer token');
        }
    });

    it('handles missing source (undefined arg)', () => {
        const schema = func().addParameter(string()).addParameter(number());
        const sources: ParameterSource[] = [header('x-id')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({ headers: { 'x-id': 'test' } });

        const result = resolveParameters(
            schema,
            sources,
            match,
            ctx,
            undefined
        );
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.args[0]).toBe('test');
            expect(result.args[1]).toBeUndefined();
        }
    });
});
