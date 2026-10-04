import { describe, expect, it, vi } from 'vitest';
import { createClient } from './client.js';
import { ApiError, NetworkError } from './errors.js';

function setup(meta: Record<string, unknown> = {}, options = {}) {
    const fetch = vi.fn();
    const ep = {
        introspect: () => ({
            method: 'POST',
            basePath: '/items',
            pathTemplate: '',
            ...meta
        })
    };
    const client = createClient({ items: { action: ep } } as any, {
        fetch,
        ...options
    }) as any;
    return { fetch, call: client.items.action };
}
describe('HTTP response and upload transports', () => {
    it('encodes mixed multipart files and removes caller content-type boundaries', async () => {
        const { fetch, call } = setup(
            { fileUpload: {} },
            { headers: { 'Content-Type': 'application/json' } }
        );
        fetch.mockImplementation(
            async () =>
                new Response('{}', {
                    headers: { 'content-type': 'application/json' }
                })
        );
        const blob = new Blob(['one'], { type: 'text/plain' });
        await call({
            body: { title: 'report', absent: undefined },
            files: {
                attachment: [
                    blob,
                    {
                        buffer: new Uint8Array([2]),
                        filename: 'two.txt',
                        mimeType: 'text/plain'
                    },
                    undefined
                ]
            },
            headers: { 'content-type': 'bad' },
            retry: false,
            timeout: 100,
            optimisticUpdate: {},
            offlineQueue: true
        });
        const init = fetch.mock.calls[0][1];
        expect(new Headers(init.headers).has('content-type')).toBe(false);
        expect(init.body.get('title')).toBe('report');
        expect(init.body.has('absent')).toBe(false);
        expect(init.body.getAll('attachment')).toHaveLength(2);
        expect(init.body.getAll('attachment')[1].name).toBe('two.txt');
        await call();
        expect(fetch.mock.calls[1][1].body).toBeInstanceOf(FormData);
    });
    it('normalizes non-Error failures and runs error hooks for existing web errors', async () => {
        const hook = vi.fn(e => e);
        const { fetch, call } = setup({}, { hooks: { beforeError: [hook] } });
        fetch.mockRejectedValueOnce('network string');
        await expect(call()).rejects.toThrow('network string');
        const error = new NetworkError('already wrapped');
        fetch.mockRejectedValueOnce(error);
        await expect(call()).rejects.toBe(error);
        expect(hook).toHaveBeenCalledWith(error);
    });
    it('returns text successes and supports file downloads and unauthorized failures', async () => {
        const unauthorized = vi.fn();
        const { fetch, call } = setup({}, { onUnauthorized: unauthorized });
        fetch.mockResolvedValueOnce(new Response('plain text'));
        expect(await call()).toBe('plain text');
        fetch.mockResolvedValueOnce(new Response('file bytes'));
        expect(await (await call.file()).text()).toBe('file bytes');
        fetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
        await expect(call.file()).rejects.toBeInstanceOf(ApiError);
        expect(unauthorized).toHaveBeenCalledOnce();
    });
    it('streams incomplete chunks, supports empty bodies and translates failures', async () => {
        const unauthorized = vi.fn();
        const beforeError = vi.fn(e => e);
        const { fetch, call } = setup(
            {},
            {
                onUnauthorized: unauthorized,
                hooks: { beforeError: [beforeError] }
            }
        );
        fetch.mockResolvedValueOnce(new Response('one\ntwo\nlast'));
        const lines = [];
        for await (const line of call.stream()) lines.push(line);
        expect(lines).toEqual(['one', 'two', 'last']);
        fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
        const empty = [];
        for await (const line of call.stream()) empty.push(line);
        expect(empty).toEqual([]);
        fetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
        await expect(
            call.stream()[Symbol.asyncIterator]().next()
        ).rejects.toBeInstanceOf(ApiError);
        expect(unauthorized).toHaveBeenCalledOnce();
        fetch.mockRejectedValueOnce(new TypeError('offline'));
        await expect(
            call.stream()[Symbol.asyncIterator]().next()
        ).rejects.toBeInstanceOf(NetworkError);
    });
});
