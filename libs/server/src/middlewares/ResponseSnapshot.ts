import type { OutgoingHttpHeaders, ServerResponse } from 'node:http';

/** @internal A complete, bounded response suitable for replay. */
export interface ResponseSnapshot {
    status: number;
    headers: OutgoingHttpHeaders;
    body: Buffer;
}

/** @internal Capture all write/end overloads without changing their behavior. */
export async function captureResponse(
    response: ServerResponse,
    next: () => Promise<void>,
    maxBytes: number
): Promise<ResponseSnapshot | undefined> {
    const { write, writeHead, end } = response;
    const chunks: Buffer[] = [];
    let size = 0;
    let ended = false;
    let headers: OutgoingHttpHeaders = {};
    const capture = (chunk: unknown, encoding?: unknown) => {
        if (chunk == null || typeof chunk === 'function' || size > maxBytes)
            return;
        const buffer =
            typeof chunk === 'string'
                ? Buffer.from(
                      chunk,
                      typeof encoding === 'string'
                          ? (encoding as BufferEncoding)
                          : 'utf8'
                  )
                : Buffer.from(chunk as Uint8Array);
        size += buffer.length;
        if (size > maxBytes) chunks.length = 0;
        else chunks.push(buffer);
    };
    response.writeHead = function (
        this: ServerResponse,
        status: number,
        ...args: any[]
    ) {
        const supplied = typeof args[0] === 'string' ? args[1] : args[0];
        if (Array.isArray(supplied)) {
            const raw: OutgoingHttpHeaders = {};
            for (let i = 0; i < supplied.length; i += 2) {
                const name = supplied[i].toLowerCase();
                const previous = raw[name];
                raw[name] =
                    previous === undefined
                        ? supplied[i + 1]
                        : [
                              ...(Array.isArray(previous)
                                  ? previous
                                  : [String(previous)]),
                              supplied[i + 1]
                          ];
            }
            headers = { ...headers, ...raw };
        } else if (supplied) {
            for (const [name, value] of Object.entries(supplied))
                headers[name.toLowerCase()] =
                    value as OutgoingHttpHeaders[string];
        }
        const result = Reflect.apply(writeHead, this, [status, ...args]);
        headers = { ...headers, ...this.getHeaders?.() };
        return result;
    } as typeof writeHead;
    response.write = function (
        this: ServerResponse,
        chunk: any,
        ...args: any[]
    ) {
        capture(chunk, args[0]);
        return Reflect.apply(write, this, [chunk, ...args]);
    } as typeof write;
    response.end = function (
        this: ServerResponse,
        chunk?: any,
        ...args: any[]
    ) {
        capture(chunk, args[0]);
        const result = Reflect.apply(end, this, [chunk, ...args]);
        ended = true;
        headers = { ...headers, ...this.getHeaders?.() };
        return result;
    } as typeof end;
    try {
        await next();
        if (!ended || size > maxBytes) return undefined;
        return {
            status: response.statusCode,
            headers,
            body: Buffer.concat(chunks)
        };
    } finally {
        response.write = write;
        response.writeHead = writeHead;
        response.end = end;
    }
}
