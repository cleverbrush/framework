import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { any, number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import type { EndpointMetadata } from '../src/Endpoint.js';
import { needsBody, resolveArgs } from '../src/ParameterResolver.js';
import { RequestContext } from '../src/RequestContext.js';

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
    if (overrides.queryParams) {
        (ctx as any)._queryParams = overrides.queryParams;
    }
    return ctx;
}

function makeMeta(overrides: Partial<EndpointMetadata> = {}): EndpointMetadata {
    return {
        method: 'GET',
        basePath: '/api',
        pathTemplate: '/',
        bodySchema: null,
        querySchema: null,
        headerSchema: null,
        ...overrides
    };
}

describe('ParameterResolver', () => {
    describe('needsBody', () => {
        it('returns false when no body schema', () => {
            expect(needsBody(makeMeta())).toBe(false);
        });

        it('returns true when body schema is present', () => {
            expect(
                needsBody(makeMeta({ bodySchema: object({ name: string() }) }))
            ).toBe(true);
        });
    });

    describe('resolveArgs', () => {
        it('provides context in action context', async () => {
            const meta = makeMeta();
            const ctx = createMockContext();

            const result = await resolveArgs(meta, null, ctx, undefined);
            expect(result.valid).toBe(true);
            if (result.valid) {
                expect(result.args[0]).toHaveProperty('context', ctx);
            }
        });

        it('includes parsed path params in action context', async () => {
            const meta = makeMeta();
            const ctx = createMockContext();
            const parsedPath = { id: 42 };

            const result = await resolveArgs(meta, parsedPath, ctx, undefined);
            expect(result.valid).toBe(true);
            if (result.valid) {
                expect(result.args[0]).toHaveProperty('params', { id: 42 });
            }
        });

        it('validates and includes body', async () => {
            const meta = makeMeta({
                bodySchema: object({ name: string(), age: number() })
            });
            const ctx = createMockContext();

            const result = await resolveArgs(meta, null, ctx, {
                name: 'Alice',
                age: 30
            });
            expect(result.valid).toBe(true);
            if (result.valid) {
                expect(result.args[0]).toHaveProperty('body', {
                    name: 'Alice',
                    age: 30
                });
            }
        });

        it('returns validation errors for invalid body', async () => {
            const meta = makeMeta({
                bodySchema: object({ name: string(), age: number() })
            });
            const ctx = createMockContext();

            const result = await resolveArgs(meta, null, ctx, { name: 123 });
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.problemDetails.status).toBe(400);
                expect(
                    (result.problemDetails as any).errors.length
                ).toBeGreaterThan(0);
            }
        });

        it('validates and includes query params with coercion', async () => {
            const meta = makeMeta({
                querySchema: object({
                    page: number().coerce(),
                    q: string()
                })
            });
            const ctx = createMockContext({
                queryParams: { page: '5', q: 'hello' }
            });

            const result = await resolveArgs(meta, null, ctx, undefined);
            expect(result.valid).toBe(true);
            if (result.valid) {
                expect(result.args[0]).toHaveProperty('query', {
                    page: 5,
                    q: 'hello'
                });
            }
        });

        it('returns validation error for invalid query param', async () => {
            const meta = makeMeta({
                querySchema: object({ page: number() })
            });
            const ctx = createMockContext({
                queryParams: { page: 'not-a-number' }
            });

            const result = await resolveArgs(meta, null, ctx, undefined);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                const errors = (result.problemDetails as any).errors;
                expect(errors).toHaveLength(1);
                expect(errors[0].pointer).toBe('/query/page');
            }
        });

        it('validates and includes header params', async () => {
            const meta = makeMeta({
                headerSchema: object({ 'x-api-key': string() })
            });
            const ctx = createMockContext({
                headers: { 'x-api-key': 'secret-123' }
            });

            const result = await resolveArgs(meta, null, ctx, undefined);
            expect(result.valid).toBe(true);
            if (result.valid) {
                expect(result.args[0]).toHaveProperty('headers', {
                    'x-api-key': 'secret-123'
                });
            }
        });

        it('returns validation error for invalid header', async () => {
            const meta = makeMeta({
                headerSchema: object({ 'x-count': number() })
            });
            const ctx = createMockContext({
                headers: { 'x-count': 'not-a-number' }
            });

            const result = await resolveArgs(meta, null, ctx, undefined);
            expect(result.valid).toBe(false);
            if (!result.valid) {
                const errors = (result.problemDetails as any).errors;
                expect(errors.length).toBeGreaterThan(0);
                expect(errors[0].pointer).toBe('/headers/x-count');
            }
        });

        it('collects errors from multiple sources', async () => {
            const meta = makeMeta({
                bodySchema: object({ name: string() }),
                querySchema: object({ page: number() })
            });
            const ctx = createMockContext({
                queryParams: { page: 'bad' }
            });

            const result = await resolveArgs(meta, null, ctx, { name: 123 });
            expect(result.valid).toBe(false);
            if (!result.valid) {
                const errors = (result.problemDetails as any).errors;
                const pointers = errors.map((e: any) => e.pointer);
                expect(pointers).toContain('/body');
                expect(pointers).toContain('/query/page');
            }
        });

        it('returns RFC 9457 compliant problem details on failure', async () => {
            const meta = makeMeta({
                bodySchema: object({ email: string() })
            });
            const ctx = createMockContext();

            const result = await resolveArgs(meta, null, ctx, { email: 42 });
            expect(result.valid).toBe(false);
            if (!result.valid) {
                const pd = result.problemDetails;
                expect(pd.type).toBe('https://httpstatuses.com/400');
                expect(pd.status).toBe(400);
                expect(pd.title).toBe('Bad Request');
                expect(pd.detail).toBe(
                    'One or more validation errors occurred.'
                );
                expect((pd as any).errors).toBeInstanceOf(Array);
            }
        });

        it('omits params key when parsedPath is null', async () => {
            const meta = makeMeta();
            const ctx = createMockContext();

            const result = await resolveArgs(meta, null, ctx, undefined);
            expect(result.valid).toBe(true);
            if (result.valid) {
                expect(result.args[0]).not.toHaveProperty('params');
            }
        });

        it('omits body key when no body schema', async () => {
            const meta = makeMeta();
            const ctx = createMockContext();

            const result = await resolveArgs(meta, null, ctx, undefined);
            expect(result.valid).toBe(true);
            if (result.valid) {
                expect(result.args[0]).not.toHaveProperty('body');
            }
        });
    });
});
