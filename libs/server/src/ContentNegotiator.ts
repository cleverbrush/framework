import { checkJsonDepth, safeJsonParse } from './safeJson.js';
import type { ContentTypeHandler } from './types.js';

/**
 * Built-in JSON content type handler.
 */
export const jsonContentTypeHandler: ContentTypeHandler = {
    mimeType: 'application/json',
    serialize(value: unknown): string {
        return JSON.stringify(value);
    },
    deserialize(raw: string): unknown {
        const parsed = safeJsonParse(raw);
        checkJsonDepth(parsed);
        return parsed;
    }
};

/**
 * Built-in `application/x-www-form-urlencoded` content type handler.
 *
 * Repeated fields are deserialized as arrays in insertion order:
 * `tag=a&tag=b` becomes `{ tag: ['a', 'b'] }`.
 */
export const formUrlEncodedContentTypeHandler: ContentTypeHandler = {
    mimeType: 'application/x-www-form-urlencoded',
    serialize(value: unknown): string {
        const params = new URLSearchParams();
        if (value && typeof value === 'object') {
            for (const [key, item] of Object.entries(
                value as Record<string, unknown>
            )) {
                if (item === undefined || item === null) continue;
                if (Array.isArray(item)) {
                    for (const nested of item) {
                        params.append(key, String(nested));
                    }
                } else {
                    params.append(key, String(item));
                }
            }
        }
        return params.toString();
    },
    deserialize(raw: string): unknown {
        const result: Record<string, string | string[]> = {};
        const params = new URLSearchParams(raw);

        for (const [key, value] of params) {
            if (isUnsafeFormKey(key)) continue;

            const existing = result[key];
            if (existing === undefined) {
                result[key] = value;
            } else if (Array.isArray(existing)) {
                existing.push(value);
            } else {
                result[key] = [existing, value];
            }
        }

        return result;
    }
};

function isUnsafeFormKey(key: string): boolean {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

interface ParsedAccept {
    mimeType: string;
    quality: number;
}

function parseAcceptHeader(accept: string): ParsedAccept[] {
    return accept
        .split(',')
        .map(part => {
            const trimmed = part.trim();
            const [mimeType, ...params] = trimmed.split(';').map(s => s.trim());
            let quality = 1;
            for (const p of params) {
                const [key, val] = p.split('=');
                if (key?.trim() === 'q' && val) {
                    quality = parseFloat(val);
                    if (Number.isNaN(quality)) quality = 1;
                }
            }
            return { mimeType: mimeType.toLowerCase(), quality };
        })
        .sort((a, b) => b.quality - a.quality);
}

/**
 * Selects the appropriate serializer/deserializer for a request or response
 * based on the `Accept` / `Content-Type` HTTP headers.
 *
 * JSON is registered by default. Additional handlers can be added with
 * `register()` or via `ServerBuilder.contentType()`.
 */
export class ContentNegotiator {
    readonly #handlers: Map<string, ContentTypeHandler> = new Map();

    constructor() {
        this.register(jsonContentTypeHandler);
        this.register(formUrlEncodedContentTypeHandler);
    }

    /**
     * Register a new content type handler.
     * If a handler for the same MIME type was already registered it is replaced.
     */
    register(handler: ContentTypeHandler): void {
        this.#handlers.set(handler.mimeType.toLowerCase(), handler);
    }

    /**
     * Select the best response serializer for the given `Accept` header value.
     *
     * Returns `null` if no registered handler can satisfy the request;
     * the server will respond with 406 Not Acceptable in that case.
     */
    selectResponseHandler(acceptHeader?: string): ContentTypeHandler | null {
        if (!acceptHeader)
            return this.#handlers.get('application/json') ?? null;

        const parsed = parseAcceptHeader(acceptHeader);
        for (const { mimeType } of parsed) {
            if (mimeType === '*/*') {
                return this.#handlers.get('application/json') ?? null;
            }
            const handler = this.#handlers.get(mimeType);
            if (handler) return handler;
        }

        return null;
    }

    /**
     * Select the deserializer for an incoming `Content-Type` header.
     *
     * Returns `null` if the content type is not recognised; the server will
     * respond with 415 Unsupported Media Type in that case.
     */
    selectRequestHandler(
        contentTypeHeader?: string
    ): ContentTypeHandler | null {
        if (!contentTypeHeader) return null;

        // Extract mime type (ignore charset, boundary, etc.)
        const mimeType = contentTypeHeader.split(';')[0].trim().toLowerCase();
        return this.#handlers.get(mimeType) ?? null;
    }
}
