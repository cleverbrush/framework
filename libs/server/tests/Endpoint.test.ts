import { number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { endpoint } from '../src/Endpoint.js';

describe('EndpointBuilder metadata', () => {
    it('summary() stores summary in introspect', () => {
        const ep = endpoint.post('/api/items').summary('Create item');
        expect(ep.introspect().summary).toBe('Create item');
    });

    it('description() stores description in introspect', () => {
        const ep = endpoint.get('/api/items').description('Returns all items');
        expect(ep.introspect().description).toBe('Returns all items');
    });

    it('tags() stores tags in introspect', () => {
        const ep = endpoint.get('/api/items').tags('items', 'admin');
        expect(ep.introspect().tags).toEqual(['items', 'admin']);
    });

    it('operationId() stores operationId in introspect', () => {
        const ep = endpoint.get('/api/items').operationId('listItems');
        expect(ep.introspect().operationId).toBe('listItems');
    });

    it('deprecated() sets deprecated flag', () => {
        const ep = endpoint.get('/api/old').deprecated();
        expect(ep.introspect().deprecated).toBe(true);
    });

    it('deprecated defaults to false', () => {
        const ep = endpoint.get('/api/items');
        expect(ep.introspect().deprecated).toBe(false);
    });

    it('metadata defaults to null/empty when not set', () => {
        const meta = endpoint.get('/api/items').introspect();
        expect(meta.summary).toBeNull();
        expect(meta.description).toBeNull();
        expect(meta.tags).toEqual([]);
        expect(meta.operationId).toBeNull();
        expect(meta.deprecated).toBe(false);
        expect(meta.responseSchema).toBeNull();
    });
});

describe('EndpointBuilder metadata immutability', () => {
    it('summary() returns a new builder', () => {
        const a = endpoint.get('/api/items');
        const b = a.summary('test');
        expect(a).not.toBe(b);
        expect(a.introspect().summary).toBeNull();
        expect(b.introspect().summary).toBe('test');
    });

    it('tags() returns a new builder without mutating original', () => {
        const a = endpoint.get('/api/items');
        const b = a.tags('users');
        expect(a).not.toBe(b);
        expect(a.introspect().tags).toEqual([]);
        expect(b.introspect().tags).toEqual(['users']);
    });

    it('chaining metadata preserves all fields', () => {
        const bodySchema = object({ name: string() });
        const querySchema = object({ page: number() });
        const responseSchema = object({ id: number() });

        const ep = endpoint
            .post('/api/items')
            .body(bodySchema)
            .query(querySchema)
            .summary('Create')
            .description('Creates a new item')
            .tags('items')
            .operationId('createItem')
            .deprecated()
            .returns(responseSchema);

        const meta = ep.introspect();
        expect(meta.method).toBe('POST');
        expect(meta.basePath).toBe('/api/items');
        expect(meta.bodySchema).not.toBeNull();
        expect(meta.querySchema).not.toBeNull();
        expect(meta.summary).toBe('Create');
        expect(meta.description).toBe('Creates a new item');
        expect(meta.tags).toEqual(['items']);
        expect(meta.operationId).toBe('createItem');
        expect(meta.deprecated).toBe(true);
        expect(meta.responseSchema).not.toBeNull();
    });
});

describe('EndpointBuilder .returns() schema storage', () => {
    it('returns(schema) stores schema in introspect', () => {
        const responseSchema = string();
        const ep = endpoint.get('/api/health').returns(responseSchema);
        expect(ep.introspect().responseSchema).toBe(responseSchema);
    });

    it('returns() without args does not store schema', () => {
        const ep = endpoint.get('/api/health').returns();
        expect(ep.introspect().responseSchema).toBeNull();
    });

    it('returns(schema) preserves other metadata', () => {
        const bodySchema = object({ name: string() });
        const querySchema = object({ page: number() });
        const responseSchema = object({ id: number(), name: string() });

        const ep = endpoint
            .post('/api/items')
            .body(bodySchema)
            .query(querySchema)
            .returns(responseSchema);

        const meta = ep.introspect();
        expect(meta.bodySchema).not.toBeNull();
        expect(meta.querySchema).not.toBeNull();
        expect(meta.responseSchema).toBe(responseSchema);
    });
});
