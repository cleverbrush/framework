import http from 'node:http';
import { createClient } from '@cleverbrush/client';
import { array, object, string } from '@cleverbrush/schema';
import {
    createServer,
    defineApi,
    endpoint,
    file,
    type Server,
    type UploadOptions
} from '@cleverbrush/server';
import { afterEach, expect, it, vi } from 'vitest';

let server: Server | undefined;
afterEach(async () => {
    await server?.close();
});
async function setup(options: UploadOptions = {}, maxBodySize = 4096) {
    const api = defineApi({
        assets: {
            upload: endpoint.post('/files').upload(
                object({
                    images: array(file()).minLength(1).maxLength(3),
                    cover: file().optional()
                }),
                options
            ),
            mixed: endpoint
                .post('/mixed')
                .body(object({ title: string(), note: string().optional() }))
                .upload(object({ image: file() }), options),
            legacy: endpoint.post('/legacy').upload(options),
            empty: endpoint
                .post('/empty')
                .upload(
                    object({ images: array(file()), cover: file().optional() }),
                    options
                )
        }
    });
    const handler = vi.fn(({ files, body, rejectedFiles }) => ({
        files: Object.fromEntries(
            Object.entries(files).map(([name, value]) => [
                name,
                Array.isArray(value) ? value.map(info) : info(value)
            ])
        ),
        body,
        rejectedFiles
    }));
    server = await createServer({ maxBodySize })
        .handle(api.assets.upload, handler)
        .handle(api.assets.mixed, handler)
        .handle(api.assets.legacy, handler)
        .handle(api.assets.empty, handler)
        .listen(0);
    const base = `http://127.0.0.1:${server.address!.port}`;
    return {
        base,
        handler,
        client: createClient(api, {
            baseUrl: base,
            headers: { 'content-type': 'application/json' }
        })
    };
}
function info(value: any) {
    return {
        filename: value.filename,
        mimeType: value.mimeType,
        text: value.buffer.toString(),
        size: value.size
    };
}
function form(entries: [string, string | Blob, string?][]) {
    const data = new FormData();
    for (const [key, value, filename] of entries) {
        if (typeof value === 'string') data.append(key, value);
        else data.append(key, value, filename);
    }
    return data;
}
function image(text = 'abc') {
    return new Blob([text], { type: 'image/png' });
}

it('round trips typed client arrays, optional files, filenames and file-only requests', async () => {
    const { client, handler } = await setup();
    const result: any = await client.assets.upload({
        files: {
            images: [
                new File(['one'], 'first.png', { type: 'image/png' }),
                {
                    filename: 'second.png',
                    mimeType: 'image/png',
                    buffer: Buffer.from('two'),
                    size: 3
                }
            ]
        }
    });
    expect(result.files.images).toEqual([
        { filename: 'first.png', mimeType: 'image/png', text: 'one', size: 3 },
        { filename: 'second.png', mimeType: 'image/png', text: 'two', size: 3 }
    ]);
    expect(result.files.cover).toBeUndefined();
    expect(handler).toHaveBeenCalledOnce();
    const mixed: any = await client.assets.mixed({
        body: { title: 'Title', note: undefined },
        files: { image: image() }
    });
    expect(mixed.body).toEqual({ title: 'Title' });
    const empty: any = await client.assets.empty({ files: { images: [] } });
    expect(empty.files).toEqual({ images: [] });
    const legacy: any = await client.assets.legacy({
        files: { avatar: image() }
    });
    expect(legacy.files.avatar.text).toBe('abc');
});

it.each([
    ['missing required files', [], 400, {}],
    ['unknown field', [['extra', image(), 'a.png']], 400, {}],
    [
        'too many array elements',
        Array.from({ length: 4 }, (_, i) => ['images', image(), `${i}.png`]),
        400,
        {}
    ],
    [
        'duplicate singleton',
        [
            ['images', image(), 'a'],
            ['cover', image(), 'b'],
            ['cover', image(), 'c']
        ],
        400,
        {}
    ],
    [
        'MIME mismatch',
        [['images', image(), 'a']],
        400,
        { allowedMimeTypes: ['text/plain'] }
    ],
    ['file size', [['images', image('12345'), 'a']], 413, { maxFileSize: 4 }],
    [
        'file count',
        [
            ['images', image(), 'a'],
            ['images', image(), 'b']
        ],
        413,
        { maxFileCount: 1 }
    ],
    [
        'field size',
        [
            ['note', '12345'],
            ['images', image(), 'a']
        ],
        413,
        { maxFieldSize: 4 }
    ],
    [
        'field count',
        [
            ['a', '1'],
            ['b', '2']
        ],
        413,
        { maxFieldCount: 1 }
    ],
    [
        'part count',
        [
            ['a', '1'],
            ['images', image(), 'a']
        ],
        413,
        { maxPartCount: 1 }
    ],
    [
        'field name size',
        [['images', image(), 'a']],
        413,
        { maxFieldNameSize: 5 }
    ],
    ['text encoded as file name', [['images', 'not a file']], 400, {}]
] as const)('rejects %s without running the handler', async (_name, entries, status, limits) => {
    const { base, handler } = await setup(limits);
    const response = await fetch(`${base}/files`, {
        method: 'POST',
        body: form(entries as any)
    });
    expect(response.status).toBe(status);
    expect(response.headers.get('content-type')).toContain(
        'application/problem+json'
    );
    expect(await response.json()).toMatchObject({
        status,
        errors: expect.any(Array)
    });
    expect(handler).not.toHaveBeenCalled();
});

it('allows exact file, field and count limits without truncation', async () => {
    const { base } = await setup({
        maxFileSize: 4,
        maxFileCount: 1,
        maxFieldSize: 4,
        maxFieldCount: 1,
        maxPartCount: 2
    });
    const response = await fetch(`${base}/mixed`, {
        method: 'POST',
        body: form([
            ['image', image('1234'), 'a'],
            ['title', '1234']
        ])
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
        files: { image: { text: '1234', size: 4 } },
        body: { title: '1234' }
    });
});

it('keeps legacy MIME rejections explicit and rejects duplicate legacy files', async () => {
    const { base, handler } = await setup({ allowedMimeTypes: ['image/*'] });
    const response = await fetch(`${base}/legacy`, {
        method: 'POST',
        body: form([
            ['avatar', new Blob(['x'], { type: 'text/plain' }), 'bad.txt']
        ])
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
        rejectedFiles: [{ fieldName: 'avatar', filename: 'bad.txt' }]
    });
    handler.mockClear();
    const duplicate = await fetch(`${base}/legacy`, {
        method: 'POST',
        body: form([
            ['image', image(), 'a'],
            ['image', image(), 'b']
        ])
    });
    expect(duplicate.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
});

it('rejects malformed boundaries and total size with and without content-length', async () => {
    const { base, handler } = await setup({}, 512);
    const malformed = await fetch(`${base}/files`, {
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=missing' },
        body: 'bad'
    });
    expect(malformed.status).toBe(400);
    const payload =
        '--boundary\r\nContent-Disposition: form-data; name="images"; filename="a"\r\nContent-Type: image/png\r\n\r\n' +
        'x'.repeat(600) +
        '\r\n--boundary--\r\n';
    for (const sized of [true, false]) {
        const status = await new Promise<number>(resolve => {
            const req = http.request(
                `${base}/files`,
                {
                    method: 'POST',
                    headers: {
                        'content-type':
                            'multipart/form-data; boundary=boundary',
                        ...(sized
                            ? { 'content-length': Buffer.byteLength(payload) }
                            : {})
                    }
                },
                res => {
                    res.resume();
                    res.on('end', () => resolve(res.statusCode!));
                }
            );
            req.write(payload.slice(0, 150));
            req.end(payload.slice(150));
        });
        expect(status).toBe(413);
    }
    expect(handler).not.toHaveBeenCalled();
});
