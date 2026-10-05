import type { IncomingMessage } from 'node:http';
import { PassThrough } from 'node:stream';
import { array, object } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { parseMultipart } from './multipart.js';
import { file, type UploadConfiguration } from './upload.js';

function field(name: string, value: string) {
    return `--boundary\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
}
function upload(name: string, value = 'data', mime = 'text/plain') {
    return `--boundary\r\nContent-Disposition: form-data; name="${name}"; filename="a.txt"\r\nContent-Type: ${mime}\r\n\r\n${value}\r\n`;
}
async function parse(
    parts: string[],
    options: UploadConfiguration = {},
    limit = 4096,
    headers = {}
) {
    const stream = new PassThrough();
    const req = Object.assign(stream, {
        headers: {
            'content-type': 'multipart/form-data; boundary=boundary',
            ...headers
        },
        complete: true
    }) as unknown as IncomingMessage;
    const result = parseMultipart(req, options, limit);
    stream.end(parts.join('') + '--boundary--\r\n');
    try {
        return await result;
    } finally {
        expect(req.listenerCount('aborted')).toBe(0);
        stream.destroy();
    }
}
describe('multipart resource and contract boundaries', () => {
    it('collects ordered file arrays, ordinary fields and empty required arrays', async () => {
        const result = await parse(
            [
                field('title', 'report'),
                upload('attachments', 'one'),
                upload('attachments', 'two')
            ],
            {
                schema: object({
                    attachments: array(file()),
                    missing: array(file()),
                    optional: file().optional()
                })
            }
        );
        expect(result.fields).toEqual({ title: 'report' });
        expect(
            (result.files.attachments as any[]).map(f => f.buffer.toString())
        ).toEqual(['one', 'two']);
        expect(result.files.missing).toEqual([]);
        expect(result.files).not.toHaveProperty('optional');
    });
    it('returns rejected legacy files but rejects disallowed contract MIME types', async () => {
        const result = await parse(
            [upload('allowed'), upload('image', 'binary', 'image/png')],
            { allowedMimeTypes: ['text/*'] }
        );
        expect(result.files.allowed).toMatchObject({ size: 4 });
        expect(result.files).not.toHaveProperty('image');
        expect(result.rejectedFiles).toMatchObject([
            { fieldName: 'image', mimeType: 'image/png' }
        ]);
        await expect(
            parse([upload('attachment')], {
                schema: object({ attachment: file() }),
                allowedMimeTypes: ['image/png']
            })
        ).rejects.toMatchObject({ status: 400 });
    });
    it.each([
        [[field('x', 'a'), field('x', 'b')], {}],
        [[upload('x'), upload('x')], {}],
        [[field('x', 'a'), upload('x')], {}],
        [[upload('x'), field('x', 'a')], {}],
        [[upload('unknown')], { schema: object({ expected: file() }) }],
        [
            [field('expected', 'not a file')],
            { schema: object({ expected: file() }) }
        ],
        [[], { schema: object({ expected: file() }) }]
    ] as const)(
        'rejects duplicate, unknown and incorrectly encoded parts',
        async (parts, options) => {
            await expect(parse([...parts], options)).rejects.toMatchObject({
                status: 400
            });
        }
    );
    it.each([
        [[upload('long/name~x')], { maxFieldNameSize: 2 }],
        [[field('long', 'a')], { maxFieldNameSize: 2 }],
        [[field('x', 'long')], { maxFieldSize: 2 }],
        [[upload('x', 'long')], { maxFileSize: 2 }],
        [[upload('x'), upload('y')], { maxFileCount: 1 }],
        [[field('x', 'a'), field('y', 'b')], { maxFieldCount: 1 }],
        [[field('x', 'a'), upload('y')], { maxPartCount: 1 }]
    ] as const)('enforces multipart limits', async (parts, options) => {
        await expect(parse([...parts], options)).rejects.toMatchObject({
            status: 413
        });
    });
    it('bounds declared and streamed wire sizes and escapes issue pointers', async () => {
        await expect(
            parse([], {}, 10, { 'content-length': '100' })
        ).rejects.toMatchObject({ status: 413 });
        await expect(parse([field('x', 'long')], {}, 10)).rejects.toMatchObject(
            { status: 413 }
        );
        await expect(
            parse([upload('a/b~c')], { maxFieldNameSize: 1 })
        ).rejects.toMatchObject({
            status: 413,
            extensions: { errors: [{ pointer: '/files/a~1b~0c' }] }
        });
    });
});
