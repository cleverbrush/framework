import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { describe, expect, it } from 'vitest';
import { captureResponse } from './ResponseSnapshot.js';

describe('response snapshots', () => {
    const response = () =>
        new ServerResponse(new IncomingMessage(new Socket()));

    it('preserves native status, setHeader, writeHead overloads and every body chunk', async () => {
        const res = response();
        const methods = {
            write: res.write,
            writeHead: res.writeHead,
            end: res.end
        };
        const snapshot = await captureResponse(
            res,
            async () => {
                res.setHeader('x-before', 'yes');
                res.writeHead(201, 'Created', { 'content-type': 'text/plain' });
                res.write('a');
                res.write('e9', 'hex');
                res.end(new Uint8Array([98]));
            },
            10
        );
        expect(snapshot).toMatchObject({
            status: 201,
            headers: { 'x-before': 'yes', 'content-type': 'text/plain' }
        });
        expect(snapshot?.body).toEqual(Buffer.from([97, 233, 98]));
        expect(res.write).toBe(methods.write);
        expect(res.end).toBe(methods.end);
        expect(res.writeHead).toBe(methods.writeHead);
    });

    it('handles implicit headers and end(callback)', async () => {
        const res = response();
        const snapshot = await captureResponse(
            res,
            async () => {
                res.statusCode = 202;
                res.setHeader('x-before', 'yes');
                res.write('body');
                res.end(() => {});
            },
            10
        );
        expect(snapshot).toMatchObject({
            status: 202,
            headers: { 'x-before': 'yes' },
            body: Buffer.from('body')
        });
    });

    it('preserves duplicate raw headers such as Set-Cookie', async () => {
        const res = response();
        const snapshot = await captureResponse(
            res,
            async () => {
                res.writeHead(200, ['Set-Cookie', 'a=1', 'Set-Cookie', 'b=2']);
                res.end('ok');
            },
            10
        );
        expect(snapshot?.headers['set-cookie']).toEqual(['a=1', 'b=2']);
    });

    it('does not retain oversized or incomplete responses', async () => {
        expect(
            await captureResponse(response(), async () => {}, 1)
        ).toBeUndefined();
        const res = response();
        expect(
            await captureResponse(
                res,
                async () => {
                    res.end('large');
                },
                1
            )
        ).toBeUndefined();
    });

    it('restores hooks after handler failure', async () => {
        const res = response();
        const end = res.end;
        await expect(
            captureResponse(
                res,
                async () => {
                    throw new Error('failure');
                },
                10
            )
        ).rejects.toThrow('failure');
        expect(res.end).toBe(end);
    });
});
