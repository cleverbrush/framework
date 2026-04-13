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

/**
 * IRequestContext — the schema definition for the request context.
 * Serves as both a DI key and a type definition.
 */
export const IRequestContext = object({
    method: string(),
    url: string(),
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
export class RequestContext {
    readonly request: IncomingMessage;
    readonly response: ServerResponse;
    readonly url: URL;
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly items: Map<string, unknown> = new Map();

    #pathParams: Record<string, string> = {};
    /** @internal — overridable for testing */
    _queryParams?: Record<string, string>;
    #services?: IServiceProvider;
    #bodyBuffer: Buffer | null = null;
    #bodyRead = false;
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

    constructor(request: IncomingMessage, response: ServerResponse) {
        this.request = request;
        this.response = response;
        this.method = (request.method ?? 'GET').toUpperCase();

        // Parse URL — use a placeholder host for relative URLs
        const rawUrl = request.url ?? '/';
        this.url = new URL(
            rawUrl,
            `http://${request.headers.host ?? 'localhost'}`
        );

        // Build headers record (lowercased keys, string values)
        const headers: Record<string, string> = {};
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
        const params: Record<string, string> = {};
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

    /** Read and buffer the raw request body. Result is cached after the first call. */
    async body(): Promise<Buffer> {
        if (this.#bodyRead) return this.#bodyBuffer!;

        this.#bodyBuffer = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            this.request.on('data', (chunk: Buffer) => chunks.push(chunk));
            this.request.on('end', () => resolve(Buffer.concat(chunks)));
            this.request.on('error', reject);
        });
        this.#bodyRead = true;
        return this.#bodyBuffer;
    }

    /** Read, buffer, and JSON-parse the request body. Result is cached after the first call. */
    async json(): Promise<unknown> {
        if (this.#jsonParsed) return this.#jsonCache;

        const buf = await this.body();
        const text = buf.toString('utf-8');
        this.#jsonCache = text.length > 0 ? JSON.parse(text) : undefined;
        this.#jsonParsed = true;
        return this.#jsonCache;
    }
}
