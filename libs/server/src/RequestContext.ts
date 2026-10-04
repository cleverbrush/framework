import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import type { IServiceProvider } from '@cleverbrush/di';
import {
    any,
    boolean,
    func,
    object,
    promise,
    record,
    string
} from '@cleverbrush/schema';
import { HttpError } from './HttpError.js';
import { checkJsonDepth, safeJsonParse } from './safeJson.js';

/**
 * IRequestContext — the schema definition for the request context.
 * Serves as both a DI key and a type definition.
 */
export const IRequestContext = object({
    method: string(),
    url: any().hasType<URL>(),
    pathParams: record(string(), string()),
    queryParams: record(string(), string()),
    headers: record(string(), string()),
    items: any(),
    body: func().hasReturnType(promise(any())),
    json: func().hasReturnType(promise(any())),
    responded: boolean()
});

/**
 * Per-request context object passed to every middleware and endpoint handler.
 *
 * Provides typed access to path/query parameters, headers, the request body,
 * and the DI service provider for the current request scope.
 *
 * @example
 * ```ts
 * const middleware: Middleware = async (ctx, next) => {
 *     ctx.items.set('startTime', Date.now());
 *     await next();
 * };
 * ```
 */
/** Default maximum request body size: 5 MB. */
export const DEFAULT_MAX_BODY_SIZE = 5 * 1024 * 1024;

export class RequestContext {
    readonly request: IncomingMessage;
    readonly response: ServerResponse;
    readonly url: URL;
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly items: Map<string, unknown> = new Map();
    readonly maxBodySize: number;

    #pathParams: Record<string, string> = {};
    /** @internal — overridable for testing */
    _queryParams?: Record<string, string>;
    #services?: IServiceProvider;
    #bodyPromise?: Promise<Buffer>;
    #jsonCache: unknown = undefined;
    #jsonParsed = false;
    responded = false;

    /**
     * The authenticated principal for this request.
     * Set by authentication middleware; typed as `unknown` at the
     * RequestContext level — handlers receive a fully typed version
     * via `ActionContext.principal`.
     */
    principal: unknown = undefined;

    constructor(
        request: IncomingMessage,
        response: ServerResponse,
        maxBodySize?: number
    ) {
        this.request = request;
        this.response = response;
        this.method = (request.method ?? 'GET').toUpperCase();
        this.maxBodySize = maxBodySize ?? DEFAULT_MAX_BODY_SIZE;

        // Parse URL — use a placeholder host for relative URLs
        const rawUrl = request.url ?? '/';
        this.url = new URL(
            rawUrl,
            `http://${request.headers.host ?? 'localhost'}`
        );

        // Build headers record (lowercased keys, string values)
        const headers: Record<string, string> = Object.create(null);
        for (const [key, value] of Object.entries(request.headers)) {
            if (typeof value === 'string') {
                headers[key] = value;
            } else if (Array.isArray(value)) {
                headers[key] = value.join(', ');
            }
        }
        this.headers = headers;
    }

    /** Path parameters extracted from the matched route template. */
    get pathParams(): Record<string, string> {
        return this.#pathParams;
    }

    set pathParams(value: Record<string, string>) {
        this.#pathParams = value;
    }

    /** Parsed query string parameters from the request URL. */
    get queryParams(): Record<string, string> {
        if (this._queryParams) return this._queryParams;
        const params: Record<string, string> = Object.create(null);
        for (const [key, value] of this.url.searchParams) {
            params[key] = value;
        }
        return params;
    }

    /** The DI service provider scoped to this request. Set by the server before invoking the handler. */
    get services(): IServiceProvider | undefined {
        return this.#services;
    }

    set services(value: IServiceProvider) {
        this.#services = value;
    }

    /** Read once; concurrent readers share the same result or failure. */
    async body(): Promise<Buffer> {
        if (this.#bodyPromise) return this.#bodyPromise;
        this.#bodyPromise = new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            let totalSize = 0;
            let settled = false;
            const cleanup = () => {
                this.request.off('data', data);
                this.request.off('end', end);
                this.request.off('error', error);
                this.request.off('aborted', aborted);
                this.request.off('close', closed);
            };
            const error = (reason: Error) => {
                if (settled) return;
                settled = true;
                cleanup();
                chunks.length = 0;
                reject(reason);
            };
            const aborted = () =>
                error(new HttpError(400, 'Request body interrupted'));
            const closed = () => {
                if (!this.request.readableEnded) aborted();
            };
            const data = (chunk: Buffer) => {
                if (settled) return;
                totalSize += chunk.length;
                if (totalSize > this.maxBodySize) {
                    error(new HttpError(413, 'Payload Too Large'));
                    this.request.destroy();
                    return;
                }
                chunks.push(chunk);
            };
            const end = () => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(Buffer.concat(chunks));
            };
            if (this.request.destroyed || this.request.readableEnded) {
                aborted();
                return;
            }
            this.request.on('data', data);
            this.request.on('end', end);
            this.request.on('error', error);
            this.request.on('aborted', aborted);
            this.request.on('close', closed);
        });
        return this.#bodyPromise;
    }

    /** Read, buffer, and JSON-parse the request body. Result is cached after the first call. */
    async json(): Promise<unknown> {
        if (this.#jsonParsed) return this.#jsonCache;

        const buf = await this.body();
        const text = buf.toString('utf-8');
        if (text.length > 0) {
            this.#jsonCache = safeJsonParse(text);
            checkJsonDepth(this.#jsonCache);
        }
        this.#jsonParsed = true;
        return this.#jsonCache;
    }
}
