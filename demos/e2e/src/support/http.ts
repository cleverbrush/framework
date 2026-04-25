import http from 'node:http';
import { config } from './env.js';

export interface RequestOptions {
    body?: unknown;
    headers?: Record<string, string>;
    /** Authorization bearer token shortcut. */
    token?: string;
    /** Per-request timeout in ms (default 30s). */
    timeoutMs?: number;
    /** Don't auto-set Content-Type; useful for raw bodies. */
    raw?: boolean;
}

export interface Response {
    status: number;
    headers: http.IncomingHttpHeaders;
    body: string;
}

/**
 * Minimal HTTP request helper for the running backend, modelled after
 * `libs/server-integration-tests/tests/integration.test.ts`.
 *
 * Returns the raw response body string so tests can decide whether to
 * `.json()` parse it or assert on streaming/binary content.
 */
export function request(
    method: string,
    urlPath: string,
    options: RequestOptions = {}
): Promise<Response> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    if (options.token && !headers['authorization']) {
        headers['authorization'] = `Bearer ${options.token}`;
    }
    let payload: Buffer | undefined;
    if (options.body !== undefined) {
        if (options.raw && typeof options.body === 'string') {
            payload = Buffer.from(options.body);
        } else {
            payload = Buffer.from(JSON.stringify(options.body));
            if (!headers['content-type']) {
                headers['content-type'] = 'application/json';
            }
        }
        headers['content-length'] = String(payload.length);
    }

    const url = new URL(urlPath, config.apiUrl);

    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                hostname: url.hostname,
                port: url.port || 80,
                path: `${url.pathname}${url.search}`,
                method,
                headers
            },
            res => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    resolve({
                        status: res.statusCode!,
                        headers: res.headers,
                        body: Buffer.concat(chunks).toString()
                    });
                });
            }
        );
        const timeout = options.timeoutMs ?? 30_000;
        req.setTimeout(timeout, () => {
            req.destroy(new Error(`Request timed out after ${timeout}ms`));
        });
        req.on('error', reject);
        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}

/** Parse a response body as JSON. */
export function json<T = any>(res: Response): T {
    return JSON.parse(res.body);
}

/**
 * Streaming GET — yields response chunks as strings as they arrive.
 * Used for NDJSON endpoints (`/api/admin/activity`).
 */
export function streamRequest(
    method: string,
    urlPath: string,
    options: RequestOptions = {}
): {
    response: Promise<{
        status: number;
        headers: http.IncomingHttpHeaders;
    }>;
    chunks: AsyncIterable<string>;
    close: () => void;
} {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    if (options.token && !headers['authorization']) {
        headers['authorization'] = `Bearer ${options.token}`;
    }
    const url = new URL(urlPath, config.apiUrl);

    let resolveResponse!: (v: {
        status: number;
        headers: http.IncomingHttpHeaders;
    }) => void;
    let rejectResponse!: (err: Error) => void;
    const responsePromise = new Promise<{
        status: number;
        headers: http.IncomingHttpHeaders;
    }>((resolve, reject) => {
        resolveResponse = resolve;
        rejectResponse = reject;
    });

    let pushChunk!: (chunk: string) => void;
    let endChunks!: () => void;
    let abortChunks!: (err: Error) => void;
    const chunkQueue: string[] = [];
    const waiters: Array<(r: IteratorResult<string>) => void> = [];
    let ended = false;
    let error: Error | null = null;

    pushChunk = (chunk: string) => {
        if (waiters.length > 0) {
            waiters.shift()!({ value: chunk, done: false });
        } else {
            chunkQueue.push(chunk);
        }
    };
    endChunks = () => {
        ended = true;
        while (waiters.length > 0) {
            waiters.shift()!({ value: undefined, done: true });
        }
    };
    abortChunks = (err: Error) => {
        error = err;
        endChunks();
    };

    const chunks: AsyncIterable<string> = {
        [Symbol.asyncIterator]() {
            return {
                next(): Promise<IteratorResult<string>> {
                    if (error) return Promise.reject(error);
                    if (chunkQueue.length > 0) {
                        return Promise.resolve({
                            value: chunkQueue.shift()!,
                            done: false
                        });
                    }
                    if (ended) {
                        return Promise.resolve({
                            value: undefined,
                            done: true
                        });
                    }
                    return new Promise(resolve => waiters.push(resolve));
                }
            };
        }
    };

    const req = http.request(
        {
            hostname: url.hostname,
            port: url.port || 80,
            path: `${url.pathname}${url.search}`,
            method,
            headers
        },
        res => {
            res.setEncoding('utf8');
            resolveResponse({
                status: res.statusCode!,
                headers: res.headers
            });
            res.on('data', (chunk: string) => pushChunk(chunk));
            res.on('end', () => endChunks());
            res.on('error', (err: Error) => abortChunks(err));
        }
    );
    req.on('error', err => {
        rejectResponse(err);
        abortChunks(err);
    });
    if (options.body !== undefined) {
        req.write(JSON.stringify(options.body));
    }
    req.end();

    return {
        response: responsePromise,
        chunks,
        close: () => req.destroy()
    };
}
