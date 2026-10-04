import { number, object, string } from '@cleverbrush/schema';
import { defineApi, endpoint } from '@cleverbrush/server/contract';
import { expect, it, vi } from 'vitest';
import { batching } from './batching.js';
import { createClient } from './client.js';
import { retry } from './retry.js';

const api = defineApi({
    items: {
        create: endpoint
            .post('/items')
            .idempotent()
            .body(object({ amount: number() })),
        other: endpoint.post('/other')
    }
});

it('retries contract-declared mutations with the original key/body and bypasses batching', async () => {
    const requests: { url: string; key: string | null; body: unknown }[] = [];
    const fetch = vi.fn(async (url, init) => {
        requests.push({
            url: String(url),
            key: new Headers(init.headers).get('x-idempotency-key'),
            body: init.body
        });
        if (requests.length === 1) throw new TypeError('Lost response');
        return Response.json({ ok: true });
    });
    const client = createClient(api, {
        baseUrl: 'https://example.test',
        fetch,
        middlewares: [retry({ delay: () => 0 }), batching({ windowMs: 1 })]
    });
    await client.items.create({ body: { amount: 1 } });
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
    expect(requests[0].key).toBeTruthy();
    await Promise.all([
        client.items.create({ body: { amount: 1 } }),
        client.items.create({ body: { amount: 1 } })
    ]);
    expect(requests).toHaveLength(4);
    expect(requests.every(value => value.key)).toBe(true);
    expect(new Set(requests.map(value => value.key)).size).toBe(3);
    expect(requests.every(value => !value.url.includes('__batch'))).toBe(true);
    const failing = vi.fn().mockRejectedValue(new TypeError('Lost'));
    const ordinary = createClient(api, {
        fetch: failing,
        middlewares: [retry({ delay: () => 0 })]
    });
    await expect(ordinary.items.other()).rejects.toThrow();
    expect(failing).toHaveBeenCalledOnce();
});

it('preserves supplied headers and respects retry opt-out', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Lost'));
    const client = createClient(api, {
        fetch,
        headers: { 'X-Idempotency-Key': 'manual' },
        middlewares: [retry({ delay: () => 0 })]
    });
    await expect(
        client.items.create({ body: { amount: 1 }, retry: { limit: 0 } })
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledOnce();
    expect(
        new Headers(fetch.mock.calls[0][1].headers).get('x-idempotency-key')
    ).toBe('manual');
});

it('preserves the contract retry policy when requesting a binary response', async () => {
    const fetch = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Lost response'))
        .mockImplementation(async () => new Response('receipt'));
    const client = createClient(api, {
        fetch,
        middlewares: [retry({ delay: () => 0 }), batching({ windowMs: 1 })]
    });
    const result = await client.items.create.file({
        body: { amount: 1 }
    });
    expect(await result.text()).toBe('receipt');
    expect(fetch).toHaveBeenCalledTimes(2);
    const keys = fetch.mock.calls.map(([, init]) =>
        new Headers(init.headers).get('x-idempotency-key')
    );
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
});

it('honors explicit retry method restrictions and removes duplicate header casing', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Lost response'));
    const customHeadersApi = defineApi({
        items: {
            create: api.items.create.headers(
                object({ 'x-idempotency-key': string() })
            )
        }
    });
    const client = createClient(customHeadersApi, {
        fetch,
        headers: {
            'X-Idempotency-Key': 'default',
            'x-idempotency-key': 'duplicate'
        },
        middlewares: [retry({ methods: ['GET'], delay: () => 0 })]
    });
    await expect(
        client.items.create({
            body: { amount: 1 },
            headers: { 'x-idempotency-key': 'explicit' }
        })
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledOnce();
    expect(
        new Headers(fetch.mock.calls[0][1].headers).get('x-idempotency-key')
    ).toBe('explicit');
});
