import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
    ActionResult,
    ContentResult,
    FileResult,
    JsonResult,
    NoContentResult,
    RedirectResult,
    StatusCodeResult,
    StreamResult
} from '../src/ActionResult.js';
import type { ContentNegotiator } from '../src/ContentNegotiator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createReqRes(): {
    req: IncomingMessage;
    res: ServerResponse;
    written: {
        statusCode: number;
        headers: Record<string, string>;
        body: Buffer;
    };
} {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.method = 'GET';
    req.url = '/';

    const written = {
        statusCode: 0,
        headers: {} as Record<string, string>,
        body: Buffer.alloc(0)
    };
    const chunks: Buffer[] = [];

    const res = new ServerResponse(req);
    res.writeHead = (statusCode: number, headers?: any) => {
        written.statusCode = statusCode;
        if (headers) {
            for (const [k, v] of Object.entries(headers)) {
                written.headers[k as string] = v as string;
            }
        }
        return res;
    };
    res.setHeader = (name: string, value: any) => {
        written.headers[name.toLowerCase()] = String(value);
        return res;
    };
    res.end = (chunk?: any) => {
        if (chunk)
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        written.body = Buffer.concat(chunks);
        return res;
    };

    return { req, res, written };
}

const jsonHandler = {
    mimeType: 'application/json',
    serialize: (v: unknown) => JSON.stringify(v),
    deserialize: (s: string) => JSON.parse(s)
};

function mockNegotiator(handler = jsonHandler): ContentNegotiator {
    return {
        selectResponseHandler: () => handler,
        selectRequestHandler: () => null,
        register: () => {}
    } as unknown as ContentNegotiator;
}

// ---------------------------------------------------------------------------
// JsonResult
// ---------------------------------------------------------------------------

describe('JsonResult', () => {
    it('writes 200 with JSON body by default', async () => {
        const { req, res, written } = createReqRes();
        const result = new JsonResult({ id: 1 });
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(200);
        expect(written.headers['content-type']).toBe('application/json');
        expect(JSON.parse(written.body.toString())).toEqual({ id: 1 });
    });

    it('respects custom status code', async () => {
        const { req, res, written } = createReqRes();
        const result = new JsonResult({ created: true }, 201);
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(201);
    });

    it('sets extra headers', async () => {
        const { req, res, written } = createReqRes();
        const result = new JsonResult({}, 200, { 'x-custom': 'yes' });
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.headers['x-custom']).toBe('yes');
    });

    it('writes empty body when body is null', async () => {
        const { req, res, written } = createReqRes();
        const result = new JsonResult(null, 200);
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(200);
        expect(written.body.length).toBe(0);
    });

    it('falls back to JSON.stringify when no handler', async () => {
        const { req, res, written } = createReqRes();
        const noHandler = {
            selectResponseHandler: () => null,
            selectRequestHandler: () => null,
            register: () => {}
        } as unknown as ContentNegotiator;
        const result = new JsonResult({ x: 1 });
        await result.executeAsync(req, res, noHandler);
        expect(written.headers['content-type']).toBe('application/json');
        expect(JSON.parse(written.body.toString())).toEqual({ x: 1 });
    });
});

// ---------------------------------------------------------------------------
// FileResult
// ---------------------------------------------------------------------------

describe('FileResult', () => {
    it('writes 200 with content-disposition attachment', async () => {
        const { req, res, written } = createReqRes();
        const buf = Buffer.from('hello file');
        const result = new FileResult(buf, 'report.txt', 'text/plain');
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(200);
        expect(written.headers['content-type']).toBe('text/plain');
        expect(written.headers['content-disposition']).toBe(
            'attachment; filename="report.txt"'
        );
        expect(written.headers['content-length']).toBe(String(buf.byteLength));
        expect(written.body.toString()).toBe('hello file');
    });

    it('defaults to application/octet-stream', async () => {
        const { req, res, written } = createReqRes();
        const result = new FileResult(Buffer.from('data'), 'file.bin');
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.headers['content-type']).toBe(
            'application/octet-stream'
        );
    });

    it('accepts Uint8Array', async () => {
        const { req, res, written } = createReqRes();
        const arr = new TextEncoder().encode('uint8 data');
        const result = new FileResult(arr, 'data.bin');
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.body.toString()).toBe('uint8 data');
    });
});

// ---------------------------------------------------------------------------
// ContentResult
// ---------------------------------------------------------------------------

describe('ContentResult', () => {
    it('writes string body with given content-type', async () => {
        const { req, res, written } = createReqRes();
        const result = new ContentResult('<h1>Hi</h1>', 'text/html', 200);
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(200);
        expect(written.headers['content-type']).toBe('text/html');
        expect(written.body.toString()).toBe('<h1>Hi</h1>');
    });

    it('respects custom status code', async () => {
        const { req, res, written } = createReqRes();
        const result = new ContentResult('Accepted', 'text/plain', 202);
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(202);
    });
});

// ---------------------------------------------------------------------------
// StreamResult
// ---------------------------------------------------------------------------

describe('StreamResult', () => {
    it('pipes stream to response', async () => {
        const { req, res, written } = createReqRes();

        // Make res writable for pipe
        const chunks: Buffer[] = [];
        (res as any).write = (chunk: any) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            return true;
        };
        (res as any).end = (chunk?: any) => {
            if (chunk)
                chunks.push(
                    Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
                );
            written.body = Buffer.concat(chunks);
            return res;
        };

        const readable = Readable.from(['hello', ' ', 'stream']);
        const result = new StreamResult(readable, 'text/plain');
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(200);
        expect(written.headers['content-type']).toBe('text/plain');
        expect(written.body.toString()).toBe('hello stream');
    });

    it('sets content-disposition when fileName is provided', async () => {
        const { req, res, written } = createReqRes();
        (res as any).write = () => true;
        const readable = Readable.from(['data']);
        const result = new StreamResult(
            readable,
            'application/pdf',
            'report.pdf'
        );
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.headers['content-disposition']).toBe(
            'attachment; filename="report.pdf"'
        );
    });

    it('omits content-disposition when no fileName', async () => {
        const { req, res, written } = createReqRes();
        (res as any).write = () => true;
        const readable = Readable.from(['x']);
        const result = new StreamResult(readable, 'text/plain');
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.headers['content-disposition']).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// StatusCodeResult
// ---------------------------------------------------------------------------

describe('StatusCodeResult', () => {
    it('writes bare status with no body', async () => {
        const { req, res, written } = createReqRes();
        const result = new StatusCodeResult(204);
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(204);
        expect(written.body.length).toBe(0);
    });

    it('includes headers when provided', async () => {
        const { req, res, written } = createReqRes();
        const result = new StatusCodeResult(202, { 'x-trace': 'abc' });
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(202);
        expect(written.headers['x-trace']).toBe('abc');
    });
});

// ---------------------------------------------------------------------------
// RedirectResult
// ---------------------------------------------------------------------------

describe('RedirectResult', () => {
    it('writes 302 by default', async () => {
        const { req, res, written } = createReqRes();
        const result = new RedirectResult('/new');
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(302);
        expect(written.headers['location']).toBe('/new');
        expect(written.body.length).toBe(0);
    });

    it('writes 301 when permanent', async () => {
        const { req, res, written } = createReqRes();
        const result = new RedirectResult('/old', true);
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(301);
    });
});

// ---------------------------------------------------------------------------
// NoContentResult
// ---------------------------------------------------------------------------

describe('NoContentResult', () => {
    it('writes 204 with no body', async () => {
        const { req, res, written } = createReqRes();
        const result = new NoContentResult();
        await result.executeAsync(req, res, mockNegotiator());
        expect(written.statusCode).toBe(204);
        expect(written.body.length).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// ActionResult factory methods
// ---------------------------------------------------------------------------

describe('ActionResult factories', () => {
    it('ok() returns JsonResult with status 200', () => {
        const r = ActionResult.ok({ msg: 'hi' });
        expect(r).toBeInstanceOf(JsonResult);
        expect(r.status).toBe(200);
        expect(r.body).toEqual({ msg: 'hi' });
    });

    it('created() returns JsonResult with status 201 and location header', () => {
        const r = ActionResult.created({ id: 1 }, '/items/1');
        expect(r).toBeInstanceOf(JsonResult);
        expect(r.status).toBe(201);
        expect(r.headers['location']).toBe('/items/1');
    });

    it('created() without location has no location header', () => {
        const r = ActionResult.created({ id: 2 });
        expect(r.headers['location']).toBeUndefined();
    });

    it('noContent() returns NoContentResult', () => {
        expect(ActionResult.noContent()).toBeInstanceOf(NoContentResult);
    });

    it('redirect() returns RedirectResult with 302', () => {
        const r = ActionResult.redirect('/target');
        expect(r).toBeInstanceOf(RedirectResult);
        expect(r.permanent).toBe(false);
        expect(r.url).toBe('/target');
    });

    it('redirect() with permanent=true returns 301', () => {
        const r = ActionResult.redirect('/target', true);
        expect(r.permanent).toBe(true);
    });

    it('json() returns JsonResult', () => {
        const r = ActionResult.json({ a: 1 }, 201);
        expect(r).toBeInstanceOf(JsonResult);
        expect(r.status).toBe(201);
    });

    it('file() returns FileResult', () => {
        const buf = Buffer.from('x');
        const r = ActionResult.file(buf, 'x.txt', 'text/plain');
        expect(r).toBeInstanceOf(FileResult);
        expect(r.fileName).toBe('x.txt');
    });

    it('content() returns ContentResult', () => {
        const r = ActionResult.content('<p>hi</p>', 'text/html', 201);
        expect(r).toBeInstanceOf(ContentResult);
        expect(r.status).toBe(201);
        expect(r.contentType).toBe('text/html');
    });

    it('stream() returns StreamResult', () => {
        const readable = Readable.from(['x']);
        const r = ActionResult.stream(readable, 'text/csv', 'data.csv');
        expect(r).toBeInstanceOf(StreamResult);
        expect(r.fileName).toBe('data.csv');
    });

    it('status() returns StatusCodeResult', () => {
        const r = ActionResult.status(418, { 'x-teapot': 'yes' });
        expect(r).toBeInstanceOf(StatusCodeResult);
        expect(r.status).toBe(418);
        expect(r.headers['x-teapot']).toBe('yes');
    });

    it('ActionResult is abstract — cannot be instantiated directly', () => {
        // Verify all concrete types extend ActionResult
        expect(ActionResult.ok({}) instanceof ActionResult).toBe(true);
        expect(ActionResult.noContent() instanceof ActionResult).toBe(true);
        expect(ActionResult.redirect('/') instanceof ActionResult).toBe(true);
        expect(ActionResult.status(200) instanceof ActionResult).toBe(true);
        expect(
            ActionResult.content('x', 'text/plain') instanceof ActionResult
        ).toBe(true);
        expect(
            ActionResult.file(Buffer.from('x'), 'f') instanceof ActionResult
        ).toBe(true);
        expect(
            ActionResult.stream(Readable.from([]), 'text/plain') instanceof
                ActionResult
        ).toBe(true);
    });

    it('accepted() returns 202 JsonResult', () => {
        const r = ActionResult.accepted({ queued: true });
        expect(r).toBeInstanceOf(JsonResult);
        expect(r.status).toBe(202);
    });

    it('badRequest() returns 400 JsonResult', () => {
        const r = ActionResult.badRequest({ error: 'bad input' });
        expect(r).toBeInstanceOf(JsonResult);
        expect(r.status).toBe(400);
    });

    it('unauthorized() returns 401 JsonResult', () => {
        const r = ActionResult.unauthorized({ error: 'not authenticated' });
        expect(r).toBeInstanceOf(JsonResult);
        expect(r.status).toBe(401);
    });

    it('forbidden() returns 403 JsonResult', () => {
        const r = ActionResult.forbidden({ error: 'access denied' });
        expect(r).toBeInstanceOf(JsonResult);
        expect(r.status).toBe(403);
    });

    it('notFound() returns 404 JsonResult', () => {
        const r = ActionResult.notFound({ error: 'not found' });
        expect(r).toBeInstanceOf(JsonResult);
        expect(r.status).toBe(404);
    });

    it('conflict() returns 409 JsonResult', () => {
        const r = ActionResult.conflict({ error: 'already exists' });
        expect(r).toBeInstanceOf(JsonResult);
        expect(r.status).toBe(409);
    });
});
