import type {
    IncomingMessage,
    OutgoingHttpHeaders,
    ServerResponse
} from 'node:http';
import {
    createProblemDetails,
    PROBLEM_JSON_CONTENT_TYPE,
    serializeProblemDetails
} from './ProblemDetails.js';

/** Server-wide CORS policy, enabled explicitly with ServerBuilder.useCors(). */
export interface ServerCorsOptions {
    /** Exact serialized origins, '*', or a predicate evaluated once per HTTP request with Origin. */
    origin:
        | string
        | readonly string[]
        | ((origin: string) => boolean | Promise<boolean>);
    /** Optional preflight allowlist, restricted to registered routes. No wildcards. */
    methods?: readonly string[];
    /** Permitted preflight header names (case-insensitive). Defaults to none; no wildcards. */
    allowedHeaders?: readonly string[];
    /** Additional response headers browsers may read. Defaults to none; no wildcards. */
    exposedHeaders?: readonly string[];
    /** Allow browser credentials. Defaults to false; incompatible with origin: '*'. */
    credentials?: boolean;
    /** Browser preflight cache duration in seconds. Defaults to zero. */
    maxAgeSeconds?: number;
}

type OriginPredicate = (origin: string) => boolean | Promise<boolean>;
type RouteStatus = {
    status: 200 | 400 | 404 | 405;
    allowedMethods?: readonly string[];
};

const INVALID_TOKEN_CHARACTER = /[^!#$%&'*+\-.^_`|~\da-zA-Z]/;
const MANAGED_HEADERS = new Set([
    'access-control-allow-origin',
    'access-control-allow-credentials',
    'access-control-allow-methods',
    'access-control-allow-headers',
    'access-control-expose-headers',
    'access-control-max-age'
]);

function isOrigin(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    if (value === 'null') return true;
    try {
        const origin = new URL(value).origin;
        return origin !== 'null' && origin === value;
    } catch {
        return false;
    }
}

function isToken(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.length > 0 &&
        !INVALID_TOKEN_CHARACTER.test(value)
    );
}

function names(values: readonly string[] | undefined, field: string): string[] {
    if (values === undefined) return [];
    if (
        !Array.isArray(values) ||
        values.some(value => !isToken(value) || value === '*')
    ) {
        throw new TypeError(`CORS ${field} must contain explicit HTTP tokens`);
    }
    return [...new Set(values.map(value => value.toLowerCase()))];
}

function varyValue(values: unknown[], required: readonly string[]): string {
    const tokens = new Map<string, string>();
    for (const value of [...values, ...required]) {
        if (value === undefined) continue;
        for (const token of String(value).split(',')) {
            const trimmed = token.trim();
            if (trimmed === '*') return '*';
            if (trimmed && !tokens.has(trimmed.toLowerCase())) {
                tokens.set(trimmed.toLowerCase(), trimmed);
            }
        }
    }
    return [...tokens.values()].join(', ');
}

/** Finalize only the physical response; never mutate headers held by a cache. */
function finalizeHeaders(
    res: ServerResponse,
    corsHeaders: Record<string, string>,
    vary: readonly string[]
): void {
    const writeHead = res.writeHead;
    res.writeHead = function (
        this: ServerResponse,
        status: number,
        ...args: any[]
    ) {
        // Preserve both writeHead(status, headers) and (status, message, headers).
        const headerIndex =
            typeof args[0] === 'string' || args.length > 1 ? 1 : 0;
        const headers = args[headerIndex] as
            | OutgoingHttpHeaders
            | string[]
            | undefined;
        const values: unknown[] = [this.getHeader('vary')];
        const keep = (name: string, value: unknown) => {
            const lower = name.toLowerCase();
            if (lower === 'vary') values.push(value);
            return lower !== 'vary' && !MANAGED_HEADERS.has(lower);
        };
        if (Array.isArray(headers)) {
            const copy: string[] = [];
            for (let i = 0; i < headers.length; i += 2) {
                if (keep(headers[i], headers[i + 1])) {
                    copy.push(headers[i], headers[i + 1]);
                }
            }
            args[headerIndex] = copy;
        } else if (headers !== undefined) {
            args[headerIndex] = Object.fromEntries(
                Object.entries(headers).filter(([name, value]) =>
                    keep(name, value)
                )
            );
        }
        for (const name of MANAGED_HEADERS) this.removeHeader(name);
        for (const [name, value] of Object.entries(corsHeaders)) {
            this.setHeader(name, value);
        }
        this.setHeader('vary', varyValue(values, vary));
        return writeHead.call(this, status, ...args);
    } as ServerResponse['writeHead'];
}

function problem(
    res: ServerResponse,
    status: number,
    allow?: readonly string[]
): true {
    res.writeHead(status, {
        'content-type': PROBLEM_JSON_CONTENT_TYPE,
        ...(allow ? { allow: allow.join(', ') } : {})
    });
    res.end(serializeProblemDetails(createProblemDetails(status)));
    return true;
}

/** @internal Compiled CORS policy; deliberately separate from route middleware. */
export class CorsPolicy {
    readonly #origin: '*' | ReadonlySet<string> | OriginPredicate;
    readonly #methods?: ReadonlySet<string>;
    readonly #allowedHeaders: ReadonlySet<string>;
    readonly #exposedHeaders: string;
    readonly #credentials: boolean;
    readonly #maxAgeSeconds: number;

    constructor(options: ServerCorsOptions) {
        const origin = options?.origin;
        if (origin === '*') this.#origin = '*';
        else if (typeof origin === 'function') this.#origin = origin;
        else {
            const origins = typeof origin === 'string' ? [origin] : origin;
            if (
                !Array.isArray(origins) ||
                origins.some(value => !isOrigin(value))
            ) {
                throw new TypeError(
                    'CORS origin must be a serialized origin, list, wildcard or predicate'
                );
            }
            this.#origin = new Set(origins);
        }
        if (
            options.credentials !== undefined &&
            typeof options.credentials !== 'boolean'
        ) {
            throw new TypeError('CORS credentials must be a boolean');
        }
        this.#credentials = options.credentials ?? false;
        if (this.#credentials && this.#origin === '*') {
            throw new TypeError(
                'CORS credentials require explicit origins or a predicate'
            );
        }
        this.#maxAgeSeconds =
            options.maxAgeSeconds === undefined ? 0 : options.maxAgeSeconds;
        if (
            !Number.isSafeInteger(this.#maxAgeSeconds) ||
            this.#maxAgeSeconds < 0
        ) {
            throw new TypeError(
                'CORS maxAgeSeconds must be a non-negative safe integer'
            );
        }
        const methods = names(options.methods, 'methods');
        if (options.methods !== undefined) {
            this.#methods = new Set(
                methods.map(method => method.toUpperCase())
            );
        }
        this.#allowedHeaders = new Set(
            names(options.allowedHeaders, 'allowedHeaders')
        );
        this.#exposedHeaders = names(
            options.exposedHeaders,
            'exposedHeaders'
        ).join(', ');
    }

    /** Returns true when CORS has ended the response, false to run the usual pipeline. */
    async handle(
        req: IncomingMessage,
        res: ServerResponse,
        matchRoute: (method: string, path: string) => RouteStatus
    ): Promise<boolean> {
        const origin = req.headers.origin;
        const preflight =
            req.method?.toUpperCase() === 'OPTIONS' &&
            origin !== undefined &&
            req.headers['access-control-request-method'] !== undefined;
        const headers: Record<string, string> = {};
        finalizeHeaders(
            res,
            headers,
            preflight
                ? [
                      'Origin',
                      'Access-Control-Request-Method',
                      'Access-Control-Request-Headers'
                  ]
                : ['Origin']
        );
        if (origin === undefined) return false;
        if (!isOrigin(origin)) return problem(res, 403);

        let allowed: boolean;
        try {
            allowed =
                this.#origin === '*' ||
                (typeof this.#origin === 'function'
                    ? await this.#origin(origin)
                    : this.#origin.has(origin));
            if (typeof allowed !== 'boolean') return problem(res, 500);
        } catch {
            return problem(res, 500);
        }
        if (!allowed) return problem(res, 403);

        if (preflight) {
            const method = req.headers['access-control-request-method'];
            const requested = req.headers['access-control-request-headers'];
            if (
                !isToken(method) ||
                method === '*' ||
                (requested !== undefined && typeof requested !== 'string')
            ) {
                return problem(res, 400);
            }
            const requestedHeaders =
                requested === undefined
                    ? []
                    : requested
                          .split(',')
                          .map(name => name.trim().toLowerCase());
            if (requestedHeaders.some(name => !isToken(name) || name === '*')) {
                return problem(res, 400);
            }
            let path: string;
            try {
                path = new URL(
                    req.url ?? '/',
                    `http://${req.headers.host ?? 'localhost'}`
                ).pathname;
            } catch {
                return problem(res, 400);
            }
            const result = matchRoute(method.toUpperCase(), path);
            if (result.status !== 200)
                return problem(res, result.status, result.allowedMethods);
            if (
                (this.#methods && !this.#methods.has(method.toUpperCase())) ||
                requestedHeaders.some(name => !this.#allowedHeaders.has(name))
            ) {
                return problem(res, 403);
            }
            headers['access-control-allow-methods'] = method;
            if (requestedHeaders.length) {
                headers['access-control-allow-headers'] = [
                    ...new Set(requestedHeaders)
                ].join(', ');
            }
            headers['access-control-max-age'] = String(this.#maxAgeSeconds);
        } else if (this.#exposedHeaders) {
            headers['access-control-expose-headers'] = this.#exposedHeaders;
        }
        headers['access-control-allow-origin'] =
            this.#origin === '*' ? '*' : origin;
        if (this.#credentials)
            headers['access-control-allow-credentials'] = 'true';
        if (preflight) {
            res.writeHead(204);
            res.end();
            return true;
        }
        return false;
    }
}
