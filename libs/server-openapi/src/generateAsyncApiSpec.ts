import type { SchemaBuilder } from '@cleverbrush/schema';
import type { SubscriptionRegistration } from '@cleverbrush/server';
import { convertSchema } from './schemaConverter.js';
import { SchemaRegistry, walkSchemas } from './schemaRegistry.js';

// ---------------------------------------------------------------------------
// Server interface (structural — avoids hard dependency on ServerBuilder class)
// ---------------------------------------------------------------------------

/**
 * Minimal interface for a `@cleverbrush/server` server instance. Matches
 * the relevant subset of `ServerBuilder` needed for AsyncAPI generation.
 */
export interface AsyncApiServer_ServerLike {
    getSubscriptionRegistrations(): readonly SubscriptionRegistration[];
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * API metadata included in the AsyncAPI `info` object.
 * Maps to the AsyncAPI 3.0 Info Object.
 */
export interface AsyncApiInfo {
    /** The title of the application. */
    readonly title: string;
    /** The application version. */
    readonly version: string;
    /** A short description of the application. */
    readonly description?: string;
    /** A URL to the Terms of Service. */
    readonly termsOfService?: string;
    /** Contact information for the application. */
    readonly contact?: {
        readonly name?: string;
        readonly url?: string;
        readonly email?: string;
    };
    /** License information for the application. */
    readonly license?: {
        readonly name: string;
        readonly url?: string;
    };
}

/**
 * A server entry in the AsyncAPI 3.0 `servers` map.
 * Describes a connection endpoint where the API is accessible.
 *
 * @see https://www.asyncapi.com/docs/reference/specification/v3.0.0#serverObject
 */
export interface AsyncApiServerEntry {
    /**
     * The host of the server (hostname + optional port).
     * @example `'api.example.com'`, `'localhost:3000'`
     */
    readonly host: string;
    /**
     * The protocol used to connect to the server.
     */
    readonly protocol: 'ws' | 'wss' | 'http' | 'https';
    /** An optional string describing the server. */
    readonly description?: string;
    /** The path component of the server URL. */
    readonly pathname?: string;
}

/**
 * Options passed to {@link generateAsyncApiSpec}.
 *
 * When `server` is provided, `subscriptions` are derived from it
 * automatically (unless explicitly overridden).
 */
export interface AsyncApiOptions {
    /**
     * A `ServerBuilder` (or any object implementing `getSubscriptionRegistrations()`).
     * When set, subscription registrations are automatically read from the
     * server instance. Explicit `subscriptions` values take precedence.
     */
    readonly server?: AsyncApiServer_ServerLike;
    /**
     * Subscription registrations to document.
     * When omitted, registrations are read from the `server` option.
     */
    readonly subscriptions?: readonly SubscriptionRegistration[];
    /** API metadata (title, version, description). */
    readonly info: AsyncApiInfo;
    /**
     * Server entries to include in the spec's `servers` map.
     * Keys are server IDs (e.g. `'production'`, `'staging'`).
     */
    readonly servers?: Record<string, AsyncApiServerEntry>;
    /**
     * Path prefix to strip from all channel addresses.
     * Useful when the subscription endpoints are mounted under a prefix
     * that differs from how the AsyncAPI doc should describe them.
     */
    readonly pathPrefix?: string;
}

/**
 * A generated AsyncAPI 3.0 document. Typed as a plain object map to allow
 * extension fields without requiring a full AsyncAPI type library.
 */
export type AsyncApiDocument = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a URL path into a valid AsyncAPI channel ID.
 * Strips leading slash, replaces `/` and path-param braces with underscores.
 *
 * @example `'/ws/events'` → `'ws_events'`
 * @example `'/ws/rooms/{id}'` → `'ws_rooms_id'`
 */
function pathToChannelId(path: string): string {
    return path
        .replace(/^\//, '')
        .replace(/[/{}]/g, '_')
        .replace(/_+/g, '_')
        .replace(/_$/, '');
}

/**
 * Resolves the WebSocket address from a subscription's basePath and
 * pathTemplate. String templates with colon params (`:id`) are converted
 * to AsyncAPI `{id}` style.
 */
function resolveSubscriptionAddress(
    basePath: string,
    pathTemplate: string | { serialize?: unknown; introspect?: () => unknown }
): string {
    const base = basePath.replace(/\/$/, '');

    if (typeof pathTemplate === 'string') {
        const tpl = pathTemplate === '/' ? '' : pathTemplate;
        const combined = base + tpl;
        // Colon params → {param}
        const converted = combined.replace(
            /:([a-zA-Z_][a-zA-Z0-9_]*)/g,
            '{$1}'
        );
        return normalizeSlashes(converted);
    }

    // ParseStringSchemaBuilder — extract templateDefinition
    const info = (pathTemplate as any).introspect?.() as any;
    const templateDef = info?.templateDefinition as
        | { literals: string[]; segments: { path: string }[] }
        | undefined;

    if (!templateDef) {
        return normalizeSlashes(base);
    }

    let pathString = '';
    for (let i = 0; i < templateDef.segments.length; i++) {
        pathString +=
            templateDef.literals[i] + `{${templateDef.segments[i].path}}`;
    }
    pathString += templateDef.literals[templateDef.segments.length] ?? '';

    return normalizeSlashes(base + pathString);
}

function normalizeSlashes(path: string): string {
    let result = path.replace(/\/+/g, '/');
    if (!result.startsWith('/')) result = '/' + result;
    if (result.length > 1 && result.endsWith('/')) result = result.slice(0, -1);
    return result || '/';
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generates an AsyncAPI 3.0 document from a set of WebSocket subscription
 * registrations.
 *
 * Each subscription becomes:
 * - A **channel** with its address and optional messages (for outgoing
 *   server→client events and/or incoming client→server messages).
 * - One or two **operations**: a `send` operation for server→client events
 *   and/or a `receive` operation for client→server messages.
 *
 * Named schemas (those with `.schemaName()` set) are automatically collected
 * and emitted as `components.schemas` entries with `$ref` pointers.
 *
 * @param options - Configuration including subscription registrations and API info.
 * @returns A plain AsyncAPI 3.0 document object suitable for `JSON.stringify`.
 *
 * @example
 * ```ts
 * import { generateAsyncApiSpec } from '@cleverbrush/server-openapi';
 * import { server } from './server.js';
 *
 * const spec = generateAsyncApiSpec({
 *     server,
 *     info: { title: 'My API', version: '1.0.0' },
 *     servers: {
 *         production: { host: 'api.example.com', protocol: 'wss' },
 *     },
 * });
 * ```
 */
export function generateAsyncApiSpec(
    options: AsyncApiOptions
): AsyncApiDocument {
    const subscriptions: readonly SubscriptionRegistration[] =
        options.subscriptions ??
        options.server?.getSubscriptionRegistrations() ??
        [];

    // Collect named schemas
    const registry = new SchemaRegistry();
    const visited = new Set<SchemaBuilder<any, any, any>>();
    for (const sub of subscriptions) {
        const m = sub.endpoint;
        if (m.incomingSchema) walkSchemas(m.incomingSchema, registry, visited);
        if (m.outgoingSchema) walkSchemas(m.outgoingSchema, registry, visited);
    }

    // Build channels and operations
    const channels: Record<string, unknown> = {};
    const operations: Record<string, unknown> = {};

    for (const sub of subscriptions) {
        const m = sub.endpoint;
        const address = resolveSubscriptionAddress(m.basePath, m.pathTemplate);

        // Channel ID: prefer operationId, otherwise derive from address
        const channelId = m.operationId ?? pathToChannelId(address);

        const messages: Record<string, unknown> = {};

        // Server→client events (outgoing) — the server SENDS these
        if (m.outgoingSchema) {
            const outInfo = m.outgoingSchema.introspect() as any;
            messages['ServerEvent'] = {
                name: 'ServerEvent',
                ...(outInfo.description
                    ? { summary: outInfo.description }
                    : {}),
                payload: convertSchema(m.outgoingSchema, registry)
            };
        }

        // Client→server messages (incoming) — the server RECEIVES these
        if (m.incomingSchema) {
            const inInfo = m.incomingSchema.introspect() as any;
            messages['ClientMessage'] = {
                name: 'ClientMessage',
                ...(inInfo.description ? { summary: inInfo.description } : {}),
                payload: convertSchema(m.incomingSchema, registry)
            };
        }

        const channel: Record<string, unknown> = { address };
        if (m.summary) channel.summary = m.summary;
        if (m.description) channel.description = m.description;
        if (m.deprecated) channel.deprecated = true;
        if (m.tags.length > 0) channel.tags = m.tags.map(t => ({ name: t }));
        if (m.externalDocs) channel.externalDocs = m.externalDocs;
        if (Object.keys(messages).length > 0) channel.messages = messages;

        channels[channelId] = channel;

        // Operation: server sends events to clients (server→client)
        if (m.outgoingSchema) {
            const opId = m.operationId
                ? `${m.operationId}Events`
                : `${channelId}_send`;
            operations[opId] = {
                action: 'send',
                channel: { $ref: `#/channels/${channelId}` },
                messages: [
                    { $ref: `#/channels/${channelId}/messages/ServerEvent` }
                ]
            };
        }

        // Operation: server receives messages from clients (client→server)
        if (m.incomingSchema) {
            const opId = m.operationId
                ? `${m.operationId}Messages`
                : `${channelId}_receive`;
            operations[opId] = {
                action: 'receive',
                channel: { $ref: `#/channels/${channelId}` },
                messages: [
                    { $ref: `#/channels/${channelId}/messages/ClientMessage` }
                ]
            };
        }
    }

    // Assemble the document
    const doc: Record<string, unknown> = {
        asyncapi: '3.0.0',
        info: {
            title: options.info.title,
            version: options.info.version,
            ...(options.info.description
                ? { description: options.info.description }
                : {}),
            ...(options.info.termsOfService
                ? { termsOfService: options.info.termsOfService }
                : {}),
            ...(options.info.contact ? { contact: options.info.contact } : {}),
            ...(options.info.license ? { license: options.info.license } : {})
        }
    };

    if (options.servers && Object.keys(options.servers).length > 0) {
        doc.servers = options.servers;
    }

    doc.channels = channels;
    doc.operations = operations;

    if (!registry.isEmpty) {
        const schemas: Record<string, unknown> = {};
        for (const [name, schema] of registry.entries()) {
            schemas[name] = convertSchema(schema, registry);
        }
        doc.components = { schemas };
    }

    return doc;
}
