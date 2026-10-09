import type { IncomingMessage } from 'node:http';
import { PassThrough } from 'node:stream';
import { expect, it } from 'vitest';
import { parseMultipart } from './multipart.js';

function request() {
    return Object.assign(new PassThrough(), {
        headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
        complete: false
    }) as unknown as IncomingMessage;
}

it('rejects disconnects and removes request listeners while a file is incomplete', async () => {
    const req = request();
    const parsing = parseMultipart(req, {}, 4096);
    const rejection = expect(parsing).rejects.toMatchObject({ status: 400 });
    (req as unknown as PassThrough).write(
        '--boundary\r\nContent-Disposition: form-data; name="file"; filename="a"\r\n\r\npartial'
    );
    req.emit('aborted');
    req.destroy();
    await rejection;
    expect(req.listenerCount('aborted')).toBe(0);
    expect(req.listenerCount('data')).toBe(0);
    expect(req.listenerCount('close')).toBe(0);
});

it('settles request and parser errors once without retaining listeners', async () => {
    const req = request();
    const parsing = parseMultipart(req, {}, 4096);
    const rejection = expect(parsing).rejects.toMatchObject({ status: 400 });
    req.emit('error', new Error('connection failed'));
    await rejection;
    expect(req.listenerCount('data')).toBe(0);
    expect(req.listenerCount('aborted')).toBe(0);
});
