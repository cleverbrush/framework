import { number, object, string } from '@cleverbrush/schema';
import type {
    SubscriptionMetadata,
    SubscriptionRegistration
} from '@cleverbrush/server';
import { describe, expect, it } from 'vitest';
import {
    type AsyncApiOptions,
    generateAsyncApiSpec
} from './generateAsyncApiSpec.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMeta(
    partial: Partial<SubscriptionMetadata> = {}
): SubscriptionMetadata {
    return {
        protocol: 'subscription',
        basePath: '/ws',
        pathTemplate: '/events',
        incomingSchema: null,
        outgoingSchema: null,
        querySchema: null,
        headerSchema: null,
        serviceSchemas: null,
        authRoles: null,
        summary: null,
        description: null,
        tags: [],
        operationId: null,
        deprecated: false,
        externalDocs: null,
        ...partial
    };
}

function makeReg(
    meta: Partial<SubscriptionMetadata> = {}
): SubscriptionRegistration {
    return {
        endpoint: makeMeta(meta),
        handler: async function* () {}
    };
}

function makeOptions(
    subscriptions: SubscriptionRegistration[],
    overrides: Partial<AsyncApiOptions> = {}
): AsyncApiOptions {
    return {
        subscriptions,
        info: { title: 'Test API', version: '1.0.0' },
        ...overrides
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateAsyncApiSpec', () => {
    // --- Document structure ---

    it('produces a valid AsyncAPI 3.0 skeleton', () => {
        const spec = generateAsyncApiSpec(makeOptions([]));
        expect(spec['asyncapi']).toBe('3.0.0');
        expect(spec['info']).toMatchObject({
            title: 'Test API',
            version: '1.0.0'
        });
        expect(spec['channels']).toEqual({});
        expect(spec['operations']).toEqual({});
    });

    it('includes servers when provided', () => {
        const spec = generateAsyncApiSpec(
            makeOptions([], {
                servers: {
                    production: {
                        host: 'api.example.com',
                        protocol: 'wss'
                    }
                }
            })
        );
        expect((spec['servers'] as any)['production']).toEqual({
            host: 'api.example.com',
            protocol: 'wss'
        });
    });

    it('omits servers when none provided', () => {
        const spec = generateAsyncApiSpec(makeOptions([]));
        expect(spec['servers']).toBeUndefined();
    });

    // --- Channels ---

    it('emits a channel per subscription', () => {
        const spec = generateAsyncApiSpec(
            makeOptions([
                makeReg({ basePath: '/ws', pathTemplate: '/events' }),
                makeReg({ basePath: '/ws', pathTemplate: '/chat' })
            ])
        );
        const channels = spec['channels'] as Record<string, any>;
        expect(Object.keys(channels)).toHaveLength(2);
    });

    it('sets the channel address from basePath + pathTemplate', () => {
        const spec = generateAsyncApiSpec(
            makeOptions([makeReg({ basePath: '/ws', pathTemplate: '/events' })])
        );
        const channels = spec['channels'] as Record<string, any>;
        const channel = Object.values(channels)[0] as any;
        expect(channel.address).toBe('/ws/events');
    });

    it('uses operationId as channel ID when set', () => {
        const spec = generateAsyncApiSpec(
            makeOptions([
                makeReg({
                    basePath: '/ws',
                    pathTemplate: '/events',
                    operationId: 'liveEvents'
                })
            ])
        );
        const channels = spec['channels'] as Record<string, any>;
        expect(channels['liveEvents']).toBeDefined();
    });

    it('derives channel ID from path when no operationId', () => {
        const spec = generateAsyncApiSpec(
            makeOptions([makeReg({ basePath: '/ws', pathTemplate: '/events' })])
        );
        const channels = spec['channels'] as Record<string, any>;
        expect(channels['ws_events']).toBeDefined();
    });

    it('includes channel summary and description', () => {
        const spec = generateAsyncApiSpec(
            makeOptions([
                makeReg({
                    basePath: '/ws',
                    pathTemplate: '/events',
                    summary: 'Live events',
                    description: 'Streams real-time events'
                })
            ])
        );
        const channel = (spec['channels'] as any)['ws_events'];
        expect(channel.summary).toBe('Live events');
        expect(channel.description).toBe('Streams real-time events');
    });

    it('includes channel tags', () => {
        const spec = generateAsyncApiSpec(
            makeOptions([
                makeReg({
                    basePath: '/ws',
                    pathTemplate: '/events',
                    tags: ['live', 'realtime']
                })
            ])
        );
        const channel = (spec['channels'] as any)['ws_events'];
        expect(channel.tags).toEqual([{ name: 'live' }, { name: 'realtime' }]);
    });

    it('marks deprecated channels', () => {
        const spec = generateAsyncApiSpec(
            makeOptions([makeReg({ deprecated: true })])
        );
        const channel = Object.values(spec['channels'] as any)[0] as any;
        expect(channel.deprecated).toBe(true);
    });

    // --- Messages ---

    it('emits ServerEvent message for outgoing schema', () => {
        const EventSchema = object({ id: number() });
        const spec = generateAsyncApiSpec(
            makeOptions([makeReg({ outgoingSchema: EventSchema as any })])
        );
        const channel = Object.values(spec['channels'] as any)[0] as any;
        expect(channel.messages.ServerEvent).toBeDefined();
        expect(channel.messages.ServerEvent.payload).toBeDefined();
    });

    it('emits ClientMessage message for incoming schema', () => {
        const MsgSchema = object({ text: string() });
        const spec = generateAsyncApiSpec(
            makeOptions([makeReg({ incomingSchema: MsgSchema as any })])
        );
        const channel = Object.values(spec['channels'] as any)[0] as any;
        expect(channel.messages.ClientMessage).toBeDefined();
        expect(channel.messages.ClientMessage.payload).toBeDefined();
    });

    it('emits both message types for bidirectional subscriptions', () => {
        const EventSchema = object({ id: number() });
        const MsgSchema = object({ text: string() });
        const spec = generateAsyncApiSpec(
            makeOptions([
                makeReg({
                    outgoingSchema: EventSchema as any,
                    incomingSchema: MsgSchema as any
                })
            ])
        );
        const channel = Object.values(spec['channels'] as any)[0] as any;
        expect(channel.messages.ServerEvent).toBeDefined();
        expect(channel.messages.ClientMessage).toBeDefined();
    });

    it('omits messages for subscriptions with no schemas', () => {
        const spec = generateAsyncApiSpec(makeOptions([makeReg()]));
        const channel = Object.values(spec['channels'] as any)[0] as any;
        expect(channel.messages).toBeUndefined();
    });

    // --- Operations ---

    it('emits send operation for outgoing schema (server→client)', () => {
        const EventSchema = object({ id: number() });
        const spec = generateAsyncApiSpec(
            makeOptions([makeReg({ outgoingSchema: EventSchema as any })])
        );
        const operations = spec['operations'] as Record<string, any>;
        const sendOp = Object.values(operations).find(
            op => op.action === 'send'
        );
        expect(sendOp).toBeDefined();
        expect(sendOp!.channel['$ref']).toMatch(/^#\/channels\//);
        expect(sendOp!.messages[0]['$ref']).toMatch(/ServerEvent$/);
    });

    it('emits receive operation for incoming schema (client→server)', () => {
        const MsgSchema = object({ text: string() });
        const spec = generateAsyncApiSpec(
            makeOptions([makeReg({ incomingSchema: MsgSchema as any })])
        );
        const operations = spec['operations'] as Record<string, any>;
        const recvOp = Object.values(operations).find(
            op => op.action === 'receive'
        );
        expect(recvOp).toBeDefined();
        expect(recvOp!.messages[0]['$ref']).toMatch(/ClientMessage$/);
    });

    it('emits both operations for bidirectional subscriptions', () => {
        const EventSchema = object({ id: number() });
        const MsgSchema = object({ text: string() });
        const spec = generateAsyncApiSpec(
            makeOptions([
                makeReg({
                    outgoingSchema: EventSchema as any,
                    incomingSchema: MsgSchema as any
                })
            ])
        );
        const operations = spec['operations'] as Record<string, any>;
        const actions = Object.values(operations).map(op => op.action);
        expect(actions).toContain('send');
        expect(actions).toContain('receive');
    });

    // --- Named schemas / components ---

    it('collects named schemas into components.schemas', () => {
        const TodoSchema = object({ id: number(), title: string() }).schemaName(
            'Todo'
        );
        const spec = generateAsyncApiSpec(
            makeOptions([makeReg({ outgoingSchema: TodoSchema as any })])
        );
        const components = spec['components'] as any;
        expect(components).toBeDefined();
        expect(components.schemas['Todo']).toBeDefined();
    });

    it('uses $ref for named schemas in messages', () => {
        const TodoSchema = object({ id: number(), title: string() }).schemaName(
            'Todo'
        );
        const spec = generateAsyncApiSpec(
            makeOptions([makeReg({ outgoingSchema: TodoSchema as any })])
        );
        const channel = Object.values(spec['channels'] as any)[0] as any;
        expect(channel.messages.ServerEvent.payload['$ref']).toBe(
            '#/components/schemas/Todo'
        );
    });

    it('omits components when no named schemas exist', () => {
        const spec = generateAsyncApiSpec(
            makeOptions([
                makeReg({ outgoingSchema: object({ id: number() }) as any })
            ])
        );
        expect(spec['components']).toBeUndefined();
    });

    // --- Server option ---

    it('reads subscriptions from server.getSubscriptionRegistrations()', () => {
        const sub = makeReg({ basePath: '/ws', pathTemplate: '/events' });
        const server = {
            getSubscriptionRegistrations: () => [sub]
        };
        const spec = generateAsyncApiSpec({
            server,
            info: { title: 'Test', version: '1.0.0' }
        });
        expect(Object.keys(spec['channels'] as any)).toHaveLength(1);
    });
});
