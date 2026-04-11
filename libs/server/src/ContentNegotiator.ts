import type { ContentTypeHandler } from './types.js';

const JSON_HANDLER: ContentTypeHandler = {
    mimeType: 'application/json',
    serialize(value: unknown): string {
        return JSON.stringify(value);
    },
    deserialize(raw: string): unknown {
        return JSON.parse(raw);
    }
};

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

export class ContentNegotiator {
    readonly #handlers: Map<string, ContentTypeHandler> = new Map();

    constructor() {
        this.register(JSON_HANDLER);
    }

    register(handler: ContentTypeHandler): void {
        this.#handlers.set(handler.mimeType.toLowerCase(), handler);
    }

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

    selectRequestHandler(
        contentTypeHeader?: string
    ): ContentTypeHandler | null {
        if (!contentTypeHeader) return null;

        // Extract mime type (ignore charset, boundary, etc.)
        const mimeType = contentTypeHeader.split(';')[0].trim().toLowerCase();
        return this.#handlers.get(mimeType) ?? null;
    }
}
