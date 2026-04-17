/**
 * WebSocket framing protocol for subscription endpoints.
 *
 * Client→Server:
 * ```json
 * { "type": "message", "data": <incoming payload> }
 * { "type": "ping" }
 * ```
 *
 * Server→Client:
 * ```json
 * { "type": "message", "data": <outgoing payload> }
 * { "type": "tracked", "id": "<string>", "data": <outgoing payload> }
 * { "type": "pong" }
 * { "type": "error", "code": <number>, "message": "<string>" }
 * ```
 *
 * @module
 * @internal
 */

// ---------------------------------------------------------------------------
// Client → Server frame types
// ---------------------------------------------------------------------------

export interface ClientMessageFrame {
    readonly type: 'message';
    readonly data: unknown;
}

export interface ClientPingFrame {
    readonly type: 'ping';
}

export type ClientFrame = ClientMessageFrame | ClientPingFrame;

// ---------------------------------------------------------------------------
// Server → Client frame types
// ---------------------------------------------------------------------------

export interface ServerMessageFrame {
    readonly type: 'message';
    readonly data: unknown;
}

export interface ServerTrackedFrame {
    readonly type: 'tracked';
    readonly id: string;
    readonly data: unknown;
}

export interface ServerPongFrame {
    readonly type: 'pong';
}

export interface ServerErrorFrame {
    readonly type: 'error';
    readonly code: number;
    readonly message: string;
}

export type ServerFrame =
    | ServerMessageFrame
    | ServerTrackedFrame
    | ServerPongFrame
    | ServerErrorFrame;

// ---------------------------------------------------------------------------
// Frame constructors
// ---------------------------------------------------------------------------

export function messageFrame(data: unknown): ServerMessageFrame {
    return { type: 'message', data };
}

export function trackedFrame(id: string, data: unknown): ServerTrackedFrame {
    return { type: 'tracked', id, data };
}

export function pongFrame(): ServerPongFrame {
    return { type: 'pong' };
}

export function errorFrame(code: number, message: string): ServerErrorFrame {
    return { type: 'error', code, message };
}

// ---------------------------------------------------------------------------
// Client frame parsing
// ---------------------------------------------------------------------------

/**
 * Parse a raw WebSocket text message into a typed client frame.
 * Returns `null` if the message is not valid JSON or not a known frame type.
 */
export function parseClientFrame(raw: string): ClientFrame | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    if (typeof parsed !== 'object' || parsed === null) return null;

    const obj = parsed as Record<string, unknown>;
    if (obj.type === 'ping') return { type: 'ping' };
    if (obj.type === 'message' && 'data' in obj) {
        return { type: 'message', data: obj.data };
    }

    return null;
}
