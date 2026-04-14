import type * as http from 'node:http';
import type { Readable } from 'node:stream';
import type { ContentNegotiator } from './ContentNegotiator.js';

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

/**
 * Abstract base for all HTTP action results.
 *
 * Instead of writing directly to `res`, handlers return an `ActionResult`
 * instance. The server calls `executeAsync()` after the middleware pipeline
 * completes, ensuring consistent error handling and content negotiation.
 *
 * Use the static factory methods (`ActionResult.ok()`, `.created()`, etc.)
 * rather than constructing subclasses directly.
 *
 * @example
 * ```ts
 * server.handle(GetUser, ({ params }) => {
 *     const user = db.find(params.id);
 *     if (!user) throw new NotFoundError();
 *     return ActionResult.ok(user);
 * });
 * ```
 */
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
    static ok<T>(
        body: T,
        headers?: Record<string, string>
    ): JsonResult<200, T> {
        return new JsonResult(body, 200, headers) as JsonResult<200, T>;
    }

    /** 201 Created — serializes value using content negotiation. */
    static created<T>(
        body: T,
        location?: string,
        headers?: Record<string, string>
    ): JsonResult<201, T> {
        const h: Record<string, string> = { ...headers };
        if (location) h['location'] = location;
        return new JsonResult(body, 201, h) as JsonResult<201, T>;
    }

    /** 202 Accepted — serializes value using content negotiation. */
    static accepted<T>(
        body: T,
        headers?: Record<string, string>
    ): JsonResult<202, T> {
        return new JsonResult(body, 202, headers) as JsonResult<202, T>;
    }

    /** 204 No Content. */
    static noContent(): NoContentResult {
        return new NoContentResult();
    }

    /** 400 Bad Request — serializes value as JSON. */
    static badRequest<T>(
        body: T,
        headers?: Record<string, string>
    ): JsonResult<400, T> {
        return new JsonResult(body, 400, headers) as JsonResult<400, T>;
    }

    /** 401 Unauthorized — serializes value as JSON. */
    static unauthorized<T>(
        body: T,
        headers?: Record<string, string>
    ): JsonResult<401, T> {
        return new JsonResult(body, 401, headers) as JsonResult<401, T>;
    }

    /** 403 Forbidden — serializes value as JSON. */
    static forbidden<T>(
        body: T,
        headers?: Record<string, string>
    ): JsonResult<403, T> {
        return new JsonResult(body, 403, headers) as JsonResult<403, T>;
    }

    /** 404 Not Found — serializes value as JSON. */
    static notFound<T>(
        body: T,
        headers?: Record<string, string>
    ): JsonResult<404, T> {
        return new JsonResult(body, 404, headers) as JsonResult<404, T>;
    }

    /** 409 Conflict — serializes value as JSON. */
    static conflict<T>(
        body: T,
        headers?: Record<string, string>
    ): JsonResult<409, T> {
        return new JsonResult(body, 409, headers) as JsonResult<409, T>;
    }

    /** Temporary (302) or permanent (301) redirect. */
    static redirect(url: string, permanent = false): RedirectResult {
        return new RedirectResult(url, permanent);
    }

    /**
     * Explicit JSON response with a specific status code.
     * Use the named factories (`ok`, `notFound`, etc.) for common codes.
     * This overload is an escape hatch for uncommon status codes.
     */
    static json<T>(body: T): JsonResult<200, T>;
    static json<S extends number, T>(
        body: T,
        status: S,
        headers?: Record<string, string>
    ): JsonResult<S, T>;
    static json(
        body: unknown,
        status: number = 200,
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
    static status<S extends number>(
        status: S,
        headers?: Record<string, string>
    ): StatusCodeResult<S> {
        return new StatusCodeResult(status, headers) as StatusCodeResult<S>;
    }
}

// ---------------------------------------------------------------------------
// JsonResult
// ---------------------------------------------------------------------------

/**
 * Serializes a value and writes it as JSON with `content-type: application/json`,
 * bypassing content negotiation entirely.
 *
 * Created by `ActionResult.json()`.
 * `ActionResult.ok()` and `ActionResult.created()` produce a {@link JsonResult}
 * that goes through content negotiation instead.
 */
export class JsonResult<
    TStatus extends number = number,
    TBody = unknown
> extends ActionResult {
    readonly body: TBody;
    readonly status: TStatus;
    readonly headers: Record<string, string>;

    constructor(
        body: TBody,
        status: TStatus | number = 200,
        headers?: Record<string, string>
    ) {
        super();
        this.body = body;
        this.status = status as TStatus;
        this.headers = headers ?? {};
    }

    async executeAsync(
        _req: http.IncomingMessage,
        res: http.ServerResponse,
        _contentNegotiator: ContentNegotiator
    ): Promise<void> {
        for (const [key, value] of Object.entries(this.headers)) {
            res.setHeader(key, value);
        }

        if (this.body === null || this.body === undefined) {
            res.writeHead(this.status);
            res.end();
            return;
        }

        res.writeHead(this.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(this.body));
    }
}

// ---------------------------------------------------------------------------
// FileResult
// ---------------------------------------------------------------------------

/**
 * Sends a binary buffer as a file download attachment.
 * Created by `ActionResult.file()`.
 */
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

/**
 * Writes an arbitrary string body with a specific content type and status.
 * Created by `ActionResult.content()`.
 */
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

/**
 * Pipes a `Readable` stream to the HTTP response.
 * Created by `ActionResult.stream()`.
 */
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

/**
 * Responds with a bare HTTP status code and no body.
 * Created by `ActionResult.status()`.
 */
export class StatusCodeResult<
    TStatus extends number = number
> extends ActionResult {
    readonly status: TStatus;
    readonly headers: Record<string, string>;

    constructor(status: TStatus | number, headers?: Record<string, string>) {
        super();
        this.status = status as TStatus;
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

/**
 * Redirects the client to a new URL.
 * Uses 302 (temporary) by default; pass `permanent = true` for 301.
 * Created by `ActionResult.redirect()`.
 */
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

/**
 * Responds with 204 No Content and no body.
 * Created by `ActionResult.noContent()`.
 */
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
