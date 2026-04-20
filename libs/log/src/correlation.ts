import { randomUUID } from 'node:crypto';

/**
 * Generates a new correlation ID using UUID v7 (time-sortable).
 *
 * Falls back to UUID v4 if the runtime doesn't support v7.
 *
 * @returns a new UUID string suitable for correlation
 */
export function generateCorrelationId(): string {
    // UUID v7: timestamp-based, K-sortable
    // Node.js 19+ supports randomUUID(), use it as a base
    // Generate a time-based UUID v7
    const now = Date.now();
    const bytes = new Uint8Array(16);

    // Fill with random bytes
    const random = randomUUID().replace(/-/g, '');
    for (let i = 0; i < 16; i++) {
        bytes[i] = parseInt(random.slice(i * 2, i * 2 + 2), 16);
    }

    // Set timestamp in first 48 bits
    bytes[0] = (now / 2 ** 40) & 0xff;
    bytes[1] = (now / 2 ** 32) & 0xff;
    bytes[2] = (now / 2 ** 24) & 0xff;
    bytes[3] = (now / 2 ** 16) & 0xff;
    bytes[4] = (now / 2 ** 8) & 0xff;
    bytes[5] = now & 0xff;

    // Set version 7
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    // Set variant
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32)
    ].join('-');
}

/**
 * Extracts a correlation ID from incoming HTTP request headers.
 *
 * Checks headers in priority order:
 * 1. `X-Correlation-Id`
 * 2. `X-Request-Id`
 * 3. `traceparent` (W3C Trace Context — extracts the trace-id segment)
 *
 * If no header is found, generates a new correlation ID.
 *
 * @param headers - request headers object
 * @returns a correlation ID string
 */
export function extractCorrelationId(
    headers: Record<string, string | string[] | undefined>
): string {
    const correlationId = getHeader(headers, 'x-correlation-id');
    if (correlationId) return correlationId;

    const requestId = getHeader(headers, 'x-request-id');
    if (requestId) return requestId;

    const traceparent = getHeader(headers, 'traceparent');
    if (traceparent) {
        // W3C traceparent: version-trace_id-parent_id-trace_flags
        const parts = traceparent.split('-');
        if (parts.length >= 2 && parts[1]) {
            return parts[1];
        }
    }

    return generateCorrelationId();
}

function getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
): string | undefined {
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
}
