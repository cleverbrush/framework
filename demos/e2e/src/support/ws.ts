import WebSocket from 'ws';
import { config } from './env.js';

export interface WsClient {
    socket: WebSocket;
    /** Resolves once the connection is open. */
    open: Promise<void>;
    /** Receive the next message (default 5s timeout). */
    next(timeoutMs?: number): Promise<unknown>;
    /** Collect N messages then return them. */
    collect(n: number, timeoutMs?: number): Promise<unknown[]>;
    /** Send any JSON-serialisable payload. */
    send(payload: unknown): void;
    /** Close the socket. */
    close(): void;
}

/**
 * Connect to a backend WebSocket subscription endpoint, resolving once
 * the connection is open.  Messages are buffered so callers don't lose
 * events that arrive before they call `next()`.
 */
export function connectWs(
    path: string,
    options: { token?: string } = {}
): WsClient {
    const url = new URL(path, config.wsUrl);
    const headers: Record<string, string> = {};
    if (options.token) headers['authorization'] = `Bearer ${options.token}`;
    const socket = new WebSocket(url.toString(), { headers });

    const buffer: unknown[] = [];
    const waiters: Array<{
        resolve: (v: unknown) => void;
        reject: (err: Error) => void;
    }> = [];
    let closed = false;
    let error: Error | null = null;

    const open = new Promise<void>((resolve, reject) => {
        socket.once('open', () => resolve());
        socket.once('error', err => reject(err));
    });

    socket.on('message', data => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(data.toString());
        } catch {
            parsed = data.toString();
        }
        // The cleverbrush WS protocol envelopes every payload as
        // { type: 'message', data: <payload> }. Unwrap it so callers see
        // the raw application payload directly.
        if (
            parsed &&
            typeof parsed === 'object' &&
            (parsed as { type?: unknown }).type === 'message' &&
            'data' in (parsed as Record<string, unknown>)
        ) {
            parsed = (parsed as { data: unknown }).data;
        }
        if (waiters.length > 0) {
            waiters.shift()!.resolve(parsed);
        } else {
            buffer.push(parsed);
        }
    });
    socket.on('close', () => {
        closed = true;
        const err = new Error('WebSocket closed before message arrived');
        while (waiters.length > 0) waiters.shift()!.reject(err);
    });
    socket.on('error', err => {
        error = err;
        while (waiters.length > 0) waiters.shift()!.reject(err);
    });

    function next(timeoutMs = 5_000): Promise<unknown> {
        if (error) return Promise.reject(error);
        if (buffer.length > 0) return Promise.resolve(buffer.shift()!);
        if (closed) return Promise.reject(new Error('WebSocket already closed'));
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const idx = waiters.findIndex(w => w.resolve === resolveWrapped);
                if (idx >= 0) waiters.splice(idx, 1);
                reject(
                    new Error(
                        `WebSocket message did not arrive within ${timeoutMs}ms`
                    )
                );
            }, timeoutMs);
            const resolveWrapped = (v: unknown) => {
                clearTimeout(timer);
                resolve(v);
            };
            const rejectWrapped = (err: Error) => {
                clearTimeout(timer);
                reject(err);
            };
            waiters.push({ resolve: resolveWrapped, reject: rejectWrapped });
        });
    }

    async function collect(n: number, timeoutMs = 5_000): Promise<unknown[]> {
        const out: unknown[] = [];
        for (let i = 0; i < n; i++) {
            out.push(await next(timeoutMs));
        }
        return out;
    }

    return {
        socket,
        open,
        next,
        collect,
        send: (payload: unknown) =>
            // Wrap outgoing payloads in the framework's message envelope.
            socket.send(JSON.stringify({ type: 'message', data: payload })),
        close: () => socket.close()
    };
}
