import { createServer } from 'node:http';
import { describe, expect, test, vi } from 'vitest';
import type { RequestContext } from '../RequestContext.js';
import { cacheResponse } from './ResponseCache.js';

function context(method = 'GET', names = ['records']) {
    const response = {
        statusCode: 200,
        writeHead: vi.fn(function (this: any, status: number) {
            this.statusCode = status;
            return this;
        }),
        end: vi.fn()
    };
    return {
        method,
        response,
        pathParams: {},
        queryParams: {},
        headers: {},
        items: new Map([
            [
                '__endpoint_meta',
                {
                    cacheTags: names.map(name => ({ name, properties: {} }))
                }
            ]
        ])
    } as unknown as RequestContext;
}
function send(ctx: RequestContext, body: string, status = 200) {
    ctx.response.writeHead(status, { 'content-type': 'text/plain' });
    ctx.response.end(body);
}

describe('server response cache generations', () => {
    test('preserves HTTP body, status and headers across cached responses', async () => {
        const cache = cacheResponse();
        let reads = 0;
        const server = createServer(async (request, response) => {
            const ctx = Object.assign(context(request.method), { response });
            try {
                await cache(ctx, async () => {
                    if (request.method === 'GET') {
                        reads++;
                        send(ctx, `read-${reads}`, 201);
                    } else send(ctx, '', request.url === '/failed' ? 500 : 204);
                });
            } catch {
                response.statusCode = 500;
                response.end();
            }
        });
        await new Promise<void>(resolve =>
            server.listen(0, '127.0.0.1', resolve)
        );
        const port = (server.address() as { port: number }).port;
        const url = `http://127.0.0.1:${port}`;
        try {
            for (let i = 0; i < 2; i++) {
                const response = await fetch(url);
                expect(response.status).toBe(201);
                expect(response.headers.get('content-type')).toBe('text/plain');
                expect(await response.text()).toBe('read-1');
            }
            await (await fetch(`${url}/failed`, { method: 'PATCH' })).text();
            expect(await (await fetch(url)).text()).toBe('read-1');
            await (await fetch(url, { method: 'PATCH' })).text();
            expect(await (await fetch(url)).text()).toBe('read-2');
        } finally {
            server.closeAllConnections();
            await new Promise<void>((resolve, reject) =>
                server.close(error => (error ? reject(error) : resolve()))
            );
        }
    });

    test('caches successful reads and invalidates on a successful write', async () => {
        const cache = cacheResponse();
        const initial = context();
        await cache(initial, async () => send(initial, 'old'));
        const hit = context();
        const handler = vi.fn();
        await cache(hit, handler);
        expect(handler).not.toHaveBeenCalled();
        expect(hit.response.end).toHaveBeenCalledWith(Buffer.from('old'));
        const write = context('PATCH');
        await cache(write, async () => send(write, '', 204));
        await cache(context(), handler);
        expect(handler).toHaveBeenCalledTimes(1);
    });
    test.each([
        400, 500
    ])('failed write %s preserves cached entries', async status => {
        const cache = cacheResponse();
        const initial = context();
        await cache(initial, async () => send(initial, 'old'));
        const write = context('PATCH');
        await cache(write, async () => send(write, '', status));
        const handler = vi.fn();
        await cache(context(), handler);
        expect(handler).not.toHaveBeenCalled();
    });
    test('a thrown write preserves entries', async () => {
        const cache = cacheResponse();
        const initial = context();
        await cache(initial, async () => send(initial, 'old'));
        await expect(
            cache(context('PATCH'), async () => {
                throw new Error('write failed');
            })
        ).rejects.toThrow('write failed');
        const handler = vi.fn();
        await cache(context(), handler);
        expect(handler).not.toHaveBeenCalled();
    });
    test('in-flight reads cannot repopulate any alias after a write', async () => {
        const cache = cacheResponse();
        let release!: () => void;
        const gate = new Promise<void>(resolve => {
            release = resolve;
        });
        const initial = context('GET', ['records', 'other']);
        const pending = cache(initial, async () => {
            await gate;
            send(initial, 'old');
        });
        const write = context('PATCH');
        await cache(write, async () => send(write, '', 204));
        release();
        await pending;
        const handler = vi.fn();
        await cache(context('GET', ['other']), handler);
        expect(handler).toHaveBeenCalledTimes(1);
    });
    test('a mutation invalidates cached aliases and name-prefix variants', async () => {
        const cache = cacheResponse();
        const initial = context('GET', ['records-window', 'other']);
        await cache(initial, async () => send(initial, 'old'));
        const write = context('DELETE');
        await cache(write, async () => send(write, '', 204));
        const handler = vi.fn();
        await cache(context('GET', ['other']), handler);
        expect(handler).toHaveBeenCalledTimes(1);
    });
});
