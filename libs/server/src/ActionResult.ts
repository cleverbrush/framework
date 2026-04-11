import type * as http from 'node:http';
import type { Readable } from 'node:stream';
import type { ContentNegotiator } from './ContentNegotiator.js';

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export abstract class ActionResult {
    abstract executeAsync(
        req: http.IncomingMessage,
        res: http.ServerResponse,
        contentNegotiator: ContentNegotiator
    ): Promise<void>;

    // -----------------------------------------------------------------------
    // Factory methods
    // -----------------------------------------------------------------------

    /** 200 OK — serializes value using content negotiation. */
    static ok(body: unknown, headers?: Record<string, string>): JsonResult {
        return new JsonResult(body, 200, headers);
    }

    /** 201 Created — serializes value using content negotiation. */
    static created(
        body: unknown,
        location?: string,
        headers?: Record<string, string>
    ): JsonResult {
        const h: Record<string, string> = { ...headers };
        if (location) h['location'] = location;
        return new JsonResult(body, 201, h);
    }

    /** 204 No Content. */
    static noContent(): NoContentResult {
        return new NoContentResult();
    }

    /** Temporary (302) or permanent (301) redirect. */
    static redirect(url: string, permanent = false): RedirectResult {
        return new RedirectResult(url, permanent);
    }

    /** Explicit JSON response — always uses application/json regardless of Accept. */
    static json(
        body: unknown,
        status = 200,
        headers?: Record<string, string>
    ): JsonResult {
        return new JsonResult(body, status, headers);
    }

    /** Send a file buffer as a download attachment. */
    static file(
        content: Buffer | Uint8Array,
        fileName: string,
        contentType = 'application/octet-stream'
    ): FileResult {
        return new FileResult(content, fileName, contentType);
    }

    /** Arbitrary string body with an explicit content type. */
    static content(
        body: string,
        contentType: string,
        status = 200
    ): ContentResult {
        return new ContentResult(body, contentType, status);
    }

    /** Pipe a Readable stream to the response. */
    static stream(
        readable: Readable,
        contentType: string,
        fileName?: string
    ): StreamResult {
        return new StreamResult(readable, contentType, fileName);
    }

    /** Bare status code with no body. */
    static status(
        status: number,
        headers?: Record<string, string>
    ): StatusCodeResult {
        return new StatusCodeResult(status, headers);
    }
}

// ---------------------------------------------------------------------------
// JsonResult
// ---------------------------------------------------------------------------

export class JsonResult extends ActionResult {
    readonly body: unknown;
    readonly status: number;
    readonly headers: Record<string, string>;

    constructor(body: unknown, status = 200, headers?: Record<string, string>) {
        super();
        this.body = body;
        this.status = status;
        this.headers = headers ?? {};
    }

    async executeAsync(
        req: http.IncomingMessage,
        res: http.ServerResponse,
        contentNegotiator: ContentNegotiator
    ): Promise<void> {
        for (const [key, value] of Object.entries(this.headers)) {
            res.setHeader(key, value);
        }

        if (this.body === null || this.body === undefined) {
            res.writeHead(this.status);
            res.end();
            return;
        }

        const acceptHeader = req.headers['accept'] as string | undefined;
        const handler = contentNegotiator.selectResponseHandler(acceptHeader);
        if (handler) {
            res.writeHead(this.status, { 'content-type': handler.mimeType });
            res.end(handler.serialize(this.body));
        } else {
            res.writeHead(this.status, { 'content-type': 'application/json' });
            res.end(JSON.stringify(this.body));
        }
    }
}

// ---------------------------------------------------------------------------
// FileResult
// ---------------------------------------------------------------------------

export class FileResult extends ActionResult {
    readonly content: Buffer | Uint8Array;
    readonly fileName: string;
    readonly contentType: string;

    constructor(
        content: Buffer | Uint8Array,
        fileName: string,
        contentType = 'application/octet-stream'
    ) {
        super();
        this.content = content;
        this.fileName = fileName;
        this.contentType = contentType;
    }

    async executeAsync(
        _req: http.IncomingMessage,
        res: http.ServerResponse,
        _contentNegotiator: ContentNegotiator
    ): Promise<void> {
        res.writeHead(200, {
            'content-type': this.contentType,
            'content-disposition': `attachment; filename="${this.fileName}"`,
            'content-length': String(this.content.byteLength)
        });
        res.end(this.content);
    }
}

// ---------------------------------------------------------------------------
// ContentResult
// ---------------------------------------------------------------------------

export class ContentResult extends ActionResult {
    readonly body: string;
    readonly contentType: string;
    readonly status: number;

    constructor(body: string, contentType: string, status = 200) {
        super();
        this.body = body;
        this.contentType = contentType;
        this.status = status;
    }

    async executeAsync(
        _req: http.IncomingMessage,
        res: http.ServerResponse,
        _contentNegotiator: ContentNegotiator
    ): Promise<void> {
        res.writeHead(this.status, { 'content-type': this.contentType });
        res.end(this.body);
    }
}

// ---------------------------------------------------------------------------
// StreamResult
// ---------------------------------------------------------------------------

export class StreamResult extends ActionResult {
    readonly readable: Readable;
    readonly contentType: string;
    readonly fileName: string | undefined;

    constructor(readable: Readable, contentType: string, fileName?: string) {
        super();
        this.readable = readable;
        this.contentType = contentType;
        this.fileName = fileName;
    }

    async executeAsync(
        _req: http.IncomingMessage,
        res: http.ServerResponse,
        _contentNegotiator: ContentNegotiator
    ): Promise<void> {
        const headers: Record<string, string> = {
            'content-type': this.contentType
        };
        if (this.fileName) {
            headers['content-disposition'] =
                `attachment; filename="${this.fileName}"`;
        }
        res.writeHead(200, headers);

        await new Promise<void>((resolve, reject) => {
            this.readable.on('error', reject);
            res.on('error', reject);
            this.readable.on('end', resolve);
            this.readable.pipe(res, { end: true });
        });
    }
}

// ---------------------------------------------------------------------------
// StatusCodeResult
// ---------------------------------------------------------------------------

export class StatusCodeResult extends ActionResult {
    readonly status: number;
    readonly headers: Record<string, string>;

    constructor(status: number, headers?: Record<string, string>) {
        super();
        this.status = status;
        this.headers = headers ?? {};
    }

    async executeAsync(
        _req: http.IncomingMessage,
        res: http.ServerResponse,
        _contentNegotiator: ContentNegotiator
    ): Promise<void> {
        res.writeHead(this.status, this.headers);
        res.end();
    }
}

// ---------------------------------------------------------------------------
// RedirectResult
// ---------------------------------------------------------------------------

export class RedirectResult extends ActionResult {
    readonly url: string;
    readonly permanent: boolean;

    constructor(url: string, permanent = false) {
        super();
        this.url = url;
        this.permanent = permanent;
    }

    async executeAsync(
        _req: http.IncomingMessage,
        res: http.ServerResponse,
        _contentNegotiator: ContentNegotiator
    ): Promise<void> {
        res.writeHead(this.permanent ? 301 : 302, { location: this.url });
        res.end();
    }
}

// ---------------------------------------------------------------------------
// NoContentResult
// ---------------------------------------------------------------------------

export class NoContentResult extends ActionResult {
    async executeAsync(
        _req: http.IncomingMessage,
        res: http.ServerResponse,
        _contentNegotiator: ContentNegotiator
    ): Promise<void> {
        res.writeHead(204);
        res.end();
    }
}
