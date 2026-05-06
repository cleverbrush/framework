import { describe, expect, test, vi } from 'vitest';
import type { FetchLike } from '../middleware.js';
import { idempotency } from './idempotency.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('idempotency middleware', () => {
    test('adds X-Idempotency-Key header to POST requests', async () => {
        const fetch = vi
            .fn<FetchLike>()
            .mockResolvedValue(new Response('ok', { status: 201 }));

        const mw = idempotency()(fetch);
        await mw('/api/todos', { method: 'POST', body: '{}' });

        const call = fetch.mock.calls[0];
        const headers = call[1].headers as Headers;
        const key = headers.get('X-Idempotency-Key');
        expect(key).toBeTruthy();
        // UUID v4 format: 8-4-4-4-12 hex chars
        expect(key).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
        );
    });

    test('adds key to PUT requests', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response('ok'));

        const mw = idempotency()(fetch);
        await mw('/api/todos/1', { method: 'PUT', body: '{}' });

        const headers = fetch.mock.calls[0][1].headers as Headers;
        expect(headers.get('X-Idempotency-Key')).toBeTruthy();
    });

    test('adds key to PATCH requests', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response('ok'));

        const mw = idempotency()(fetch);
        await mw('/api/todos/1', { method: 'PATCH', body: '{}' });

        expect(
            (fetch.mock.calls[0][1].headers as Headers).get('X-Idempotency-Key')
        ).toBeTruthy();
    });

    test('adds key to DELETE requests', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response('ok'));

        const mw = idempotency()(fetch);
        await mw('/api/todos/1', { method: 'DELETE' });

        expect(
            (fetch.mock.calls[0][1].headers as Headers).get('X-Idempotency-Key')
        ).toBeTruthy();
    });

    test('does not add key to GET requests', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response('ok'));

        const mw = idempotency()(fetch);
        await mw('/api/todos', { method: 'GET' });

        const headers = fetch.mock.calls[0][1].headers as Headers | undefined;
        expect(headers?.get('X-Idempotency-Key') ?? null).toBeNull();
    });

    test('reuses existing key if already present', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response('ok'));

        const existingKey = 'my-custom-key-123';
        const mw = idempotency()(fetch);
        await mw('/api/todos', {
            method: 'POST',
            headers: new Headers({ 'X-Idempotency-Key': existingKey })
        });

        const headers = fetch.mock.calls[0][1].headers as Headers;
        expect(headers.get('X-Idempotency-Key')).toBe(existingKey);
    });

    test('preserves existing headers alongside idempotency key', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response('ok'));

        const mw = idempotency()(fetch);
        await mw('/api/todos', {
            method: 'POST',
            headers: new Headers({
                Authorization: 'Bearer token',
                'Content-Type': 'application/json'
            })
        });

        const headers = fetch.mock.calls[0][1].headers as Headers;
        expect(headers.get('Authorization')).toBe('Bearer token');
        expect(headers.get('Content-Type')).toBe('application/json');
        expect(headers.get('X-Idempotency-Key')).toBeTruthy();
    });

    test('uses custom header name', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response('ok'));

        const mw = idempotency({ headerName: 'Idempotency-Key' })(fetch);
        await mw('/api/todos', { method: 'POST', body: '{}' });

        const headers = fetch.mock.calls[0][1].headers as Headers;
        expect(headers.get('Idempotency-Key')).toBeTruthy();
    });

    test('uses custom key generator', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response('ok'));

        let callCount = 0;
        const mw = idempotency({
            keyGenerator: () => `custom-${++callCount}`
        })(fetch);

        await mw('/api/todos', { method: 'POST' });

        const headers = fetch.mock.calls[0][1].headers as Headers;
        expect(headers.get('X-Idempotency-Key')).toBe('custom-1');
    });

    test('custom condition can include GET', async () => {
        const fetch = vi.fn<FetchLike>().mockResolvedValue(new Response('ok'));

        const mw = idempotency({ condition: () => true })(fetch);
        await mw('/api/todos', { method: 'GET' });

        const headers = fetch.mock.calls[0][1].headers as Headers;
        expect(headers.get('X-Idempotency-Key')).toBeTruthy();
    });
});
