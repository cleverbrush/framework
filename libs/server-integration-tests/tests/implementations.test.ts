import { jwtScheme, signJwt } from '@cleverbrush/auth';
import { object, string } from '@cleverbrush/schema';
import {
    ActionResult,
    cacheResponse,
    createServer,
    defineApi,
    endpoint,
    errorMap,
    implement,
    type Middleware,
    type Server
} from '@cleverbrush/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const secret = 'implementation-integration-test-secret';
const Principal = object({ userId: string(), role: string() });
const Db = object({ label: string() });
const Message = object({ message: string() });
class MissingItem extends Error {}

describe('modular implementation HTTP pipeline', () => {
    let server: Server | undefined;
    afterEach(async () => {
        await server?.close();
        vi.restoreAllMocks();
    });

    async function start(
        options: { middleware?: Middleware; missingService?: boolean } = {}
    ) {
        let reads = 0;
        const translated = vi.fn(() =>
            ActionResult.notFound({ message: 'Item not found' })
        );
        const errors = errorMap().on(MissingItem, translated);
        const resource = endpoint
            .resource('/items')
            .authorize(Principal, 'admin');
        const api = defineApi({
            items: {
                get: resource
                    .get()
                    .responses({ 200: Message })
                    .clearsCacheTag('items'),
                update: resource
                    .post()
                    .body(object({ title: string() }))
                    .responses({ 200: Message, 404: Message })
                    .clearsCacheTag('items'),
                upload: endpoint
                    .post('/upload')
                    .authorize(Principal, 'admin')
                    .body(object({}))
                    .upload()
                    .responses({ 200: Message })
            }
        });
        const scope = implement(api).group('items', { inject: { db: Db } });
        const module = scope.withHandlers({
            get: ({ principal }, { db }) => ({
                message: `${principal.userId}:${db.label}:${++reads}`
            }),
            update: {
                errors,
                middlewares: options.middleware ? [options.middleware] : [],
                handler: ({ body }, { db }) => {
                    if (body.title === 'missing')
                        throw new MissingItem('Do not expose this detail');
                    if (body.title === 'crash')
                        throw new Error('private database credentials');
                    return { message: `${body.title}:${db.label}` };
                }
            },
            upload: ({ files }, { db }) => ({
                message: `${files.image?.filename}:${db.label}`
            })
        });
        const builder = createServer()
            .useAuthentication({
                defaultScheme: 'jwt',
                schemes: [
                    jwtScheme({
                        secret,
                        mapClaims: claims => ({
                            userId: claims.sub as string,
                            role: claims.role as string
                        })
                    })
                ]
            })
            .useAuthorization()
            .use(cacheResponse())
            .useBatching()
            .handleAll(implement(api).use(module).complete());
        if (!options.missingService)
            builder.services(services =>
                services.addSingleton(Db, { label: 'db' })
            );
        server = await builder.listen(0);
        const base = `http://127.0.0.1:${server.address!.port}`;
        const authorization = `Bearer ${signJwt({ sub: 'user-1', role: 'admin' }, secret)}`;
        const request = (path: string, body?: unknown, auth = authorization) =>
            fetch(`${base}${path}`, {
                method: body === undefined ? 'GET' : 'POST',
                headers: {
                    authorization: auth,
                    'content-type': 'application/json'
                },
                body: body === undefined ? undefined : JSON.stringify(body)
            });
        return { base, authorization, request, translated };
    }

    it('preserves authentication, role checks, validation and merged DI', async () => {
        const { request, translated } = await start();
        const anonymous = await request('/items', undefined, '');
        expect(anonymous.status).toBe(401);
        await anonymous.text();
        const viewer = await request(
            '/items',
            undefined,
            `Bearer ${signJwt({ sub: 'viewer', role: 'viewer' }, secret)}`
        );
        expect(viewer.status).toBe(403);
        await viewer.text();
        const invalid = await request('/items', { title: 42 });
        expect(invalid.status).toBe(400);
        expect(invalid.headers.get('content-type')).toContain(
            'application/problem+json'
        );
        await invalid.text();
        expect(translated).not.toHaveBeenCalled();
        expect(await (await request('/items')).json()).toEqual({
            message: 'user-1:db:1'
        });
    });

    it('maps only known handler failures and logs sanitized unexpected failures', async () => {
        const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { request, translated } = await start();
        const known = await request('/items', { title: 'missing' });
        expect(known.status).toBe(404);
        expect(await known.json()).toEqual({ message: 'Item not found' });
        expect(logged).not.toHaveBeenCalled();
        const unknown = await request('/items', { title: 'crash' });
        expect(unknown.status).toBe(500);
        const text = await unknown.text();
        expect(text).not.toContain('private database credentials');
        expect(logged).toHaveBeenCalledWith(
            '[server] Unhandled error:',
            expect.objectContaining({ message: 'private database credentials' })
        );
        expect(translated).toHaveBeenCalledTimes(1);
    });

    it('does not translate middleware or DI failures', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { request, translated } = await start({
            middleware: async () => {
                throw new MissingItem('middleware');
            }
        });
        const response = await request('/items', { title: 'valid' });
        expect(response.status).toBe(500);
        await response.text();
        expect(translated).not.toHaveBeenCalled();
        await server!.close();
        const withoutService = await start({ missingService: true });
        const missing = await withoutService.request('/items', {
            title: 'valid'
        });
        expect(missing.status).toBe(500);
        await missing.text();
        expect(withoutService.translated).not.toHaveBeenCalled();
    });

    it('preserves cache invalidation, failed mutations and batched error responses', async () => {
        const { request, authorization } = await start();
        expect(await (await request('/items')).json()).toEqual({
            message: 'user-1:db:1'
        });
        expect(await (await request('/items')).json()).toEqual({
            message: 'user-1:db:1'
        });
        await (await request('/items', { title: 'missing' })).text();
        expect(await (await request('/items')).json()).toEqual({
            message: 'user-1:db:1'
        });
        await (await request('/items', { title: 'changed' })).text();
        expect(await (await request('/items')).json()).toEqual({
            message: 'user-1:db:2'
        });
        const batch = await request('/__batch', {
            requests: [
                {
                    method: 'POST',
                    url: '/items',
                    body: JSON.stringify({ title: 'missing' }),
                    headers: {
                        'content-type': 'application/json',
                        authorization
                    }
                }
            ]
        });
        expect(batch.status).toBe(200);
        const { responses: result } = (await batch.json()) as {
            responses: { status: number; body: string }[];
        };
        expect(result[0].status).toBe(404);
        expect(JSON.parse(result[0].body)).toEqual({
            message: 'Item not found'
        });
    });

    it('preserves multipart upload contexts', async () => {
        const { base, authorization } = await start();
        const data = new FormData();
        data.set(
            'image',
            new Blob(['image data'], { type: 'text/plain' }),
            'sample.txt'
        );
        const response = await fetch(`${base}/upload`, {
            method: 'POST',
            headers: { authorization },
            body: data
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ message: 'sample.txt:db' });
    });
});
