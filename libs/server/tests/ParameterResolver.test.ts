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
    it('resolves path parameter', async () => {
        const schema = func().addParameter(object({ id: number() }));
        const sources: ParameterSource[] = [path()];
        const match = createRouteMatch({ id: 42 });
        const ctx = createMockContext();

        const result = await resolveParameters(
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

    it('resolves context parameter', async () => {
        const schema = func().addParameter(object({}));
        const sources: ParameterSource[] = [context()];
        const match = createRouteMatch(null);
        const ctx = createMockContext();

        const result = await resolveParameters(
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

    it('resolves body parameter with validation', async () => {
        const BodySchema = object({ name: string(), age: number() });
        const schema = func().addParameter(BodySchema);
        const sources: ParameterSource[] = [body()];
        const match = createRouteMatch(null);
        const ctx = createMockContext();

        const result = await resolveParameters(schema, sources, match, ctx, {
            name: 'Alice',
            age: 30
        });
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.args[0]).toEqual({ name: 'Alice', age: 30 });
        }
    });

    it('returns validation errors for invalid body', async () => {
        const BodySchema = object({ name: string(), age: number() });
        const schema = func().addParameter(BodySchema);
        const sources: ParameterSource[] = [body()];
        const match = createRouteMatch(null);
        const ctx = createMockContext();

        const result = await resolveParameters(schema, sources, match, ctx, {
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

    it('resolves query parameter with number coercion', async () => {
        const schema = func().addParameter(number());
        const sources: ParameterSource[] = [query('page')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({ queryParams: { page: '5' } });

        const result = await resolveParameters(
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

    it('resolves query parameter with boolean coercion', async () => {
        const schema = func().addParameter(boolean());
        const sources: ParameterSource[] = [query('active')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({ queryParams: { active: 'true' } });

        const result = await resolveParameters(
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

    it('resolves header parameter', async () => {
        const schema = func().addParameter(string());
        const sources: ParameterSource[] = [header('x-request-id')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({
            headers: { 'x-request-id': 'abc-123' }
        });

        const result = await resolveParameters(
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

    it('resolves mixed parameter sources', async () => {
        const schema = func()
            .addParameter(object({ id: number() }))
            .addParameter(string());
        const sources: ParameterSource[] = [path(), header('authorization')];
        const match = createRouteMatch({ id: 1 });
        const ctx = createMockContext({
            headers: { authorization: 'Bearer token' }
        });

        const result = await resolveParameters(
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

    it('handles missing source (undefined arg)', async () => {
        const schema = func().addParameter(string()).addParameter(number());
        const sources: ParameterSource[] = [header('x-id')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({ headers: { 'x-id': 'test' } });

        const result = await resolveParameters(
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

    it('returns validation error for invalid query parameter', async () => {
        const schema = func().addParameter(number());
        const sources: ParameterSource[] = [query('page')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({
            queryParams: { page: 'not-a-number' }
        });

        const result = await resolveParameters(
            schema,
            sources,
            match,
            ctx,
            undefined
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.problemDetails.status).toBe(400);
            expect(result.problemDetails.title).toBe('Bad Request');
            expect(result.problemDetails.detail).toBe(
                'One or more validation errors occurred.'
            );
            const errors = (result.problemDetails as any).errors;
            expect(errors).toHaveLength(1);
            expect(errors[0].pointer).toBe('/query/page');
        }
    });

    it('returns validation error for invalid header parameter', async () => {
        // number schema expects a number, but headers are strings
        const schema = func().addParameter(number());
        const sources: ParameterSource[] = [header('x-count')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({
            headers: { 'x-count': 'not-a-number' }
        });

        const result = await resolveParameters(
            schema,
            sources,
            match,
            ctx,
            undefined
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
            const errors = (result.problemDetails as any).errors;
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].pointer).toBe('/headers/x-count');
        }
    });

    it('collects errors from multiple parameters', async () => {
        const schema = func()
            .addParameter(object({ name: string(), age: number() }))
            .addParameter(number());
        const sources: ParameterSource[] = [body(), query('page')];
        const match = createRouteMatch(null);
        const ctx = createMockContext({
            queryParams: { page: 'bad' }
        });

        const result = await resolveParameters(
            schema,
            sources,
            match,
            ctx,
            { name: 123 } // invalid body: name should be string, age is missing
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
            const errors = (result.problemDetails as any).errors;
            // should have errors from both body and query
            const pointers = errors.map((e: any) => e.pointer);
            expect(pointers).toContain('/body');
            expect(pointers).toContain('/query/page');
        }
    });

    it('returns RFC 9457 compliant problem details on validation failure', async () => {
        const BodySchema = object({ email: string() });
        const schema = func().addParameter(BodySchema);
        const sources: ParameterSource[] = [body()];
        const match = createRouteMatch(null);
        const ctx = createMockContext();

        const result = await resolveParameters(schema, sources, match, ctx, {
            email: 42
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
            const pd = result.problemDetails;
            expect(pd.type).toBe('https://httpstatuses.com/400');
            expect(pd.status).toBe(400);
            expect(pd.title).toBe('Bad Request');
            expect(pd.detail).toBe('One or more validation errors occurred.');
            expect((pd as any).errors).toBeInstanceOf(Array);
            expect((pd as any).errors.length).toBeGreaterThan(0);
            for (const err of (pd as any).errors) {
                expect(err).toHaveProperty('pointer');
                expect(err).toHaveProperty('detail');
            }
        }
    });
});
