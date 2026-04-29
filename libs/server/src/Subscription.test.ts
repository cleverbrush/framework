import { object, string } from '@cleverbrush/schema';
import { describe, expect, test } from 'vitest';
import { endpoint } from './Endpoint.js';
import {
    createSubscription,
    isSubscriptionBuilder,
    isSubscriptionMetadata,
    isTrackedEvent,
    SubscriptionBuilder,
    tracked
} from './Subscription.js';

// ===========================================================================
// SubscriptionBuilder unit tests
// ===========================================================================

describe('SubscriptionBuilder', () => {
    test('creates with basePath and default pathTemplate', () => {
        const sub = new SubscriptionBuilder('/ws/test');
        const meta = sub.introspect();

        expect(meta.protocol).toBe('subscription');
        expect(meta.basePath).toBe('/ws/test');
        expect(meta.pathTemplate).toBe('/');
    });

    test('incoming sets the incoming schema', () => {
        const schema = object({ text: string() });
        const sub = new SubscriptionBuilder('/ws/chat').incoming(schema);
        const meta = sub.introspect();

        expect(meta.incomingSchema).toBe(schema);
    });

    test('outgoing sets the outgoing schema', () => {
        const schema = object({ message: string() });
        const sub = new SubscriptionBuilder('/ws/feed').outgoing(schema);
        const meta = sub.introspect();

        expect(meta.outgoingSchema).toBe(schema);
    });

    test('query sets the query schema', () => {
        const schema = object({ room: string() });
        const sub = new SubscriptionBuilder('/ws/rooms').query(schema);
        const meta = sub.introspect();

        expect(meta.querySchema).toBe(schema);
    });

    test('headers sets the header schema', () => {
        const schema = object({ 'x-api-key': string() });
        const sub = new SubscriptionBuilder('/ws/secure').headers(schema);
        const meta = sub.introspect();

        expect(meta.headerSchema).toBe(schema);
    });

    test('authorize sets auth roles', () => {
        const sub = new SubscriptionBuilder('/ws/admin').authorize('admin');
        const meta = sub.introspect();

        expect(meta.authRoles).toEqual(['admin']);
    });

    test('metadata methods are immutable — return new builder', () => {
        const sub = new SubscriptionBuilder('/ws/test');
        const withSummary = sub.summary('A test');
        const withDesc = sub.description('Long description');
        const withTags = sub.tags('live', 'ws');
        const withOpId = sub.operationId('testOp');
        const withDeprecated = sub.deprecated();
        const withDocs = sub.externalDocs('https://example.com', 'Docs');

        expect(withSummary).not.toBe(sub);
        expect(withDesc).not.toBe(sub);
        expect(withTags).not.toBe(sub);
        expect(withOpId).not.toBe(sub);
        expect(withDeprecated).not.toBe(sub);
        expect(withDocs).not.toBe(sub);

        expect(sub.introspect().summary).toBeNull();
        expect(withSummary.introspect().summary).toBe('A test');
        expect(withDesc.introspect().description).toBe('Long description');
        expect(withTags.introspect().tags).toEqual(['live', 'ws']);
        expect(withOpId.introspect().operationId).toBe('testOp');
        expect(withDeprecated.introspect().deprecated).toBe(true);
        expect(withDocs.introspect().externalDocs).toEqual({
            url: 'https://example.com',
            description: 'Docs'
        });
    });

    test('chaining preserves all fields', () => {
        const inSchema = object({ text: string() });
        const outSchema = object({ msg: string() });
        const qSchema = object({ room: string() });

        const sub = new SubscriptionBuilder('/ws/chat')
            .incoming(inSchema)
            .outgoing(outSchema)
            .query(qSchema)
            .authorize('user', 'admin')
            .summary('Chat room')
            .tags('chat');

        const meta = sub.introspect();

        expect(meta.basePath).toBe('/ws/chat');
        expect(meta.incomingSchema).toBe(inSchema);
        expect(meta.outgoingSchema).toBe(outSchema);
        expect(meta.querySchema).toBe(qSchema);
        expect(meta.authRoles).toEqual(['user', 'admin']);
        expect(meta.summary).toBe('Chat room');
        expect(meta.tags).toEqual(['chat']);
    });
});

// ===========================================================================
// tracked() helper tests
// ===========================================================================

describe('tracked', () => {
    test('creates a TrackedEvent with id and data', () => {
        const event = tracked('evt-1', { message: 'hello' });

        expect(event.id).toBe('evt-1');
        expect(event.data).toEqual({ message: 'hello' });
    });

    test('isTrackedEvent returns true for tracked events', () => {
        const event = tracked('evt-1', 'data');
        expect(isTrackedEvent(event)).toBe(true);
    });

    test('isTrackedEvent returns false for plain objects', () => {
        expect(isTrackedEvent({ id: '1', data: 'x' })).toBe(false);
        expect(isTrackedEvent(null)).toBe(false);
        expect(isTrackedEvent(42)).toBe(false);
        expect(isTrackedEvent('string')).toBe(false);
    });
});

// ===========================================================================
// Runtime guards
// ===========================================================================

describe('isSubscriptionBuilder', () => {
    test('returns true for SubscriptionBuilder instances', () => {
        const sub = new SubscriptionBuilder('/ws/test');
        expect(isSubscriptionBuilder(sub)).toBe(true);
    });

    test('returns false for non-SubscriptionBuilder values', () => {
        expect(isSubscriptionBuilder(null)).toBe(false);
        expect(isSubscriptionBuilder({})).toBe(false);
        expect(isSubscriptionBuilder(endpoint.get('/test'))).toBe(false);
    });
});

describe('isSubscriptionMetadata', () => {
    test('returns true for subscription metadata', () => {
        const meta = new SubscriptionBuilder('/ws/test').introspect();
        expect(isSubscriptionMetadata(meta)).toBe(true);
    });

    test('returns false for endpoint metadata', () => {
        const meta = endpoint.get('/test').introspect();
        expect(isSubscriptionMetadata(meta)).toBe(false);
    });
});

// ===========================================================================
// createSubscription factory
// ===========================================================================

describe('createSubscription', () => {
    test('creates a SubscriptionBuilder', () => {
        const sub = createSubscription('/ws/test');
        expect(sub).toBeInstanceOf(SubscriptionBuilder);
        expect(sub.introspect().basePath).toBe('/ws/test');
    });
});

// ===========================================================================
// endpoint.subscription() factory
// ===========================================================================

describe('endpoint.subscription()', () => {
    test('creates a SubscriptionBuilder via the endpoint factory', () => {
        const sub = endpoint.subscription('/ws/live');
        expect(sub).toBeInstanceOf(SubscriptionBuilder);
        expect(sub.introspect().basePath).toBe('/ws/live');
        expect(sub.introspect().protocol).toBe('subscription');
    });
});

describe('SubscriptionBuilder.inject()', () => {
    test('sets serviceSchemas on the builder (line 537)', () => {
        const IMyService = object({ value: string() });
        const sub = new SubscriptionBuilder('/ws/test').inject({ IMyService });
        expect(sub.introspect().serviceSchemas).toEqual({ IMyService });
    });
});
