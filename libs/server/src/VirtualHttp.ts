/**
 * Lightweight virtual HTTP request/response objects used by the batch
 * endpoint handler to process sub-requests through the normal server pipeline
 * without spawning additional HTTP connections.
 *
 * @internal
 */

import { Readable, Writable } from 'node:stream';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Initialisation options for a {@link VirtualIncomingMessage}.
 */
export interface VirtualRequestInit {
    /** HTTP method, e.g. `'GET'` or `'POST'`. */
    method: string;
    /**
     * URL path and optional query string, e.g. `/api/todos?page=1`.
     * The value is passed verbatim to `RequestContext` as `request.url`.
     */
    url: string;
    /** Request headers, typically forwarded from the outer batch request. */
    headers?: Record<string, string>;
    /**
     * Raw body string (the JSON-serialised body that would have been sent as
     * the HTTP body). Absent for methods that carry no body.
     */
    body?: string;
}

/**
 * The captured result of a virtualised HTTP response.
 */
export interface VirtualResult {
    status: number;
    headers: Record<string, string>;
    /** Raw response body (JSON string or plain text). */
    body: string;
}

// ---------------------------------------------------------------------------
// VirtualIncomingMessage
// ---------------------------------------------------------------------------

/**
 * A `Readable` that mimics the subset of `http.IncomingMessage` consumed
 * by `RequestContext` and `Server.#handleRequest()`.
 *
 * When pushed to, it emits the body buffer and then signals EOF.
 */
export class VirtualIncomingMessage extends Readable {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
    // Satisfy the `socket` property that IncomingMessage exposes.
    readonly socket: null = null;

    readonly #body: Buffer;
    #pushed = false;

    constructor(init: VirtualRequestInit) {
        super();
        this.method = init.method;
        this.url = init.url;
        // Ensure a `host` header is present so that RequestContext can parse
        // the URL correctly (it uses `http://${req.headers.host}` as the base).
        // Lowercase all keys to match Node.js http.IncomingMessage behaviour,
        // which normalises header names to lower-case before exposing them.
        const lowercased: Record<string, string> = {};
        for (const [key, value] of Object.entries(init.headers ?? {})) {
            lowercased[key.toLowerCase()] = value;
        }
        this.headers = { host: 'localhost', ...lowercased };
        this.#body =
            init.body != null && init.body.length > 0
                ? Buffer.from(init.body, 'utf-8')
                : Buffer.alloc(0);
    }

    override _read(): void {
        if (!this.#pushed) {
            this.#pushed = true;
            if (this.#body.length > 0) {
                this.push(this.#body);
            }
            this.push(null); // EOF
        }
    }
}

// ---------------------------------------------------------------------------
// VirtualServerResponse
// ---------------------------------------------------------------------------

/**
 * A `Writable` that captures the subset of `http.ServerResponse` calls made
 * by `Server.#handleRequest()` and `ActionResult.executeAsync()`.
 *
 * After the handler finishes, call {@link toResult} to retrieve the status
 * code, headers, and body as plain values.
 */
export class VirtualServerResponse extends Writable {
    statusCode = 200;
    headersSent = false;

    readonly #chunks: Buffer[] = [];
    readonly #customHeaders: Record<string, string> = {};
    #customStatus = 200;

    // -----------------------------------------------------------------------
    // Writable interface — captures data written via readable.pipe(res)
    // -----------------------------------------------------------------------

    override _write(
        chunk: Buffer | string,
        _encoding: BufferEncoding,
        callback: (err?: Error | null) => void
    ): void {
        this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
    }

    // -----------------------------------------------------------------------
    // http.ServerResponse surface
    // -----------------------------------------------------------------------

    /**
     * Sets the status code and optional response headers.
     * Mirrors `ServerResponse.writeHead()`.
     */
    writeHead(
        status: number,
        headers?: Record<string, string | string[] | number> | string | string[]
    ): this {
        this.#customStatus = status;
        this.statusCode = status;
        if (
            headers != null &&
            typeof headers === 'object' &&
            !Array.isArray(headers)
        ) {
            for (const [k, v] of Object.entries(
                headers as Record<string, string | string[] | number>
            )) {
                this.#customHeaders[k.toLowerCase()] = Array.isArray(v)
                    ? v.join(', ')
                    : String(v);
            }
        }
        this.headersSent = true;
        return this;
    }

    /**
     * Sets a single response header.
     * Mirrors `ServerResponse.setHeader()`.
     */
    setHeader(name: string, value: string | number | string[]): this {
        this.#customHeaders[name.toLowerCase()] = Array.isArray(value)
            ? value.join(', ')
            : String(value);
        return this;
    }

    /**
     * Returns a previously set response header.
     * Mirrors `ServerResponse.getHeader()`.
     */
    getHeader(name: string): string | undefined {
        return this.#customHeaders[name.toLowerCase()];
    }

    /**
     * Captures the body and signals the end of the response.
     *
     * Handles the three call forms used by `#handleRequest` and
     * `ActionResult.executeAsync()`:
     * - `end()` — no body
     * - `end(data)` — body is a `string`, `Buffer`, or `Uint8Array`
     * - `end(callback)` — end with callback (body already captured via pipe)
     */
    override end(chunk?: unknown, ...rest: unknown[]): this {
        if (chunk != null && typeof chunk !== 'function') {
            const buf =
                Buffer.isBuffer(chunk) || chunk instanceof Uint8Array
                    ? Buffer.from(chunk as Uint8Array)
                    : Buffer.from(String(chunk), 'utf-8');
            this.#chunks.push(buf);
            // Call super.end() without the chunk (we already captured it).
            super.end(...(rest as []));
        } else if (typeof chunk === 'function') {
            super.end(chunk);
        } else {
            super.end(...(rest as []));
        }
        return this;
    }

    // -----------------------------------------------------------------------
    // Result extraction
    // -----------------------------------------------------------------------

    /**
     * Returns the captured status, headers, and body as a plain object
     * suitable for embedding in a batch response.
     */
    toResult(): VirtualResult {
        return {
            status: this.#customStatus,
            headers: { ...this.#customHeaders },
            body: Buffer.concat(this.#chunks).toString('utf-8')
        };
    }
}
