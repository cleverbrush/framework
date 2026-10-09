import { number, object, string } from '@cleverbrush/schema';
import { afterEach, expect, it, vi } from 'vitest';
import {
    ActionResult,
    createServer,
    defineApi,
    endpoint,
    errorMap,
    implement,
    type Server
} from './index.js';

const servers: Server[] = [];
afterEach(async () => {
    await Promise.all(servers.splice(0).map(server => server.close()));
});
const Body = object({ tenant: string().optional(), amount: number() });
const Message = object({ message: string() });
const Db = object({ tenant: string() });
class Denied extends Error {}

async function fixture(
    limits: {
        maxEntries?: number;
        maxResponseBytes?: number;
        ttl?: number;
    } = {}
) {
    let allowed = true;
    const api = defineApi({
        items: {
            create: endpoint
                .post('/items')
                .idempotent()
                .body(Body)
                .responses({ 201: Body, 403: Message })
        }
    });
    const scope = implement(api).group('items', { inject: { db: Db } });
    const prepare = vi.fn(async (request, { db }) => {
        if (!allowed) throw new Denied();
        return {
            ...request,
            body: { ...request.body, tenant: request.body.tenant ?? db.tenant }
        };
    });
    const handler = vi.fn(async ({ body }) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return ActionResult.created(body, '/items/1');
    });
    const module = scope.withHandlers({
        create: {
            prepare,
            handler,
            idempotency: {
                ...limits,
                scope: async ({ body }) => ['verified-user', body.tenant!]
            },
            errors: errorMap().on(Denied, () =>
                ActionResult.forbidden({ message: 'Denied' })
            )
        }
    });
    const server = await createServer()
        .services(services =>
            services.addSingleton(Db, () => ({ tenant: 'default' }))
        )
        .useBatching()
        .handleAll(implement(api).use(module).complete())
        .listen(0, '127.0.0.1');
    servers.push(server);
    const url = `http://127.0.0.1:${server.address!.port}`;
    const send = (
        key: string | undefined = 'same',
        body: unknown = { amount: 1 }
    ) =>
        fetch(url + '/items', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(key === undefined ? {} : { 'x-idempotency-key': key })
            },
            body: JSON.stringify(body)
        });
    return {
        url,
        send,
        prepare,
        handler,
        revoke: () => {
            allowed = false;
        }
    };
}

it('prepares validated input with DI on every replay, captures serialized responses, and isolates resolved scope', async () => {
    const f = await fixture();
    const responses = await Promise.all(
        Array.from({ length: 5 }, () => f.send())
    );
    expect(responses.map(response => response.status)).toEqual([
        201, 201, 201, 201, 201
    ]);
    expect(responses.map(response => response.headers.get('location'))).toEqual(
        Array(5).fill('/items/1')
    );
    expect(
        await Promise.all(responses.map(response => response.json()))
    ).toEqual(Array(5).fill({ tenant: 'default', amount: 1 }));
    expect(f.handler).toHaveBeenCalledOnce();
    expect(f.prepare).toHaveBeenCalledTimes(5);
    expect((await f.send('same', { tenant: 'other', amount: 1 })).status).toBe(
        201
    );
    expect(f.handler).toHaveBeenCalledTimes(2);
    f.revoke();
    const denied = await f.send();
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ message: 'Denied' });
    expect(f.handler).toHaveBeenCalledTimes(2);
});

it('validates input and transport keys before application preparation', async () => {
    const f = await fixture();
    for (const response of [
        await f.send('same', { amount: 'bad' }),
        await f.send(''),
        await f.send('x'.repeat(257))
    ])
        expect(response.status).toBe(400);
    expect(f.prepare).not.toHaveBeenCalled();
    expect((await f.send()).status).toBe(201);
});

it('uses the same endpoint policy for explicit batch subrequests', async () => {
    const f = await fixture();
    await f.send();
    const response = await fetch(f.url + '/__batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            requests: [
                {
                    id: '1',
                    method: 'POST',
                    url: '/items',
                    headers: {
                        'content-type': 'application/json',
                        'x-idempotency-key': 'same'
                    },
                    body: JSON.stringify({ amount: 1 })
                }
            ]
        })
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(JSON.stringify(result)).toContain('default');
    expect(f.prepare).toHaveBeenCalledTimes(2);
    expect(f.handler).toHaveBeenCalledOnce();
});

it('enforces capacity and retains non-replayable responses', async () => {
    const full = await fixture({ maxEntries: 1 });
    expect((await full.send('one')).status).toBe(201);
    expect((await full.send('two')).status).toBe(503);
    expect(full.handler).toHaveBeenCalledOnce();
    const small = await fixture({ maxResponseBytes: 1 });
    expect((await small.send()).status).toBe(201);
    expect((await small.send()).status).toBe(409);
    expect(small.handler).toHaveBeenCalledOnce();
});

it('requires explicit policies at startup and keeps contract opt-in immutable', async () => {
    const original = endpoint.post('/items').body(Body);
    const keyed = original
        .idempotent()
        .summary('Create')
        .clearsCacheTag('items')
        .returns(Body);
    expect(original.introspect().idempotent).toBe(false);
    expect(keyed.introspect().idempotent).toBe(true);
    await expect(
        createServer()
            .handle(keyed, ({ body }) => body)
            .listen(0)
    ).rejects.toThrow('explicit scope');
    expect(() => endpoint.get('/items').idempotent()).toThrow('mutation');
});
