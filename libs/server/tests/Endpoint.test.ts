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

    // --- .example() / .examples() / .producesFile() ---

    it('.example() stores value and chains', () => {
        const ep = endpoint
            .post('/api/items')
            .body(object({ name: string() }))
            .example({ name: 'Widget' });

        const meta = ep.introspect();
        expect(meta.example).toEqual({ name: 'Widget' });
    });

    it('.examples() stores map and chains', () => {
        const examples = {
            minimal: { summary: 'Minimal', value: { name: 'A' } },
            full: {
                summary: 'Full',
                description: 'A complete example',
                value: { name: 'B' }
            }
        };
        const ep = endpoint
            .post('/api/items')
            .body(object({ name: string() }))
            .examples(examples);

        const meta = ep.introspect();
        expect(meta.examples).toEqual(examples);
    });

    it('.producesFile() stores metadata and chains', () => {
        const ep = endpoint
            .get('/api/export')
            .producesFile('text/csv', 'CSV export');

        const meta = ep.introspect();
        expect(meta.producesFile).toEqual({
            contentType: 'text/csv',
            description: 'CSV export'
        });
    });

    it('.producesFile() defaults to no contentType when called without args', () => {
        const ep = endpoint.get('/api/download').producesFile();

        const meta = ep.introspect();
        expect(meta.producesFile).toEqual({
            contentType: undefined,
            description: undefined
        });
    });

    it('example/examples/producesFile default to null in introspect', () => {
        const ep = endpoint.get('/api/health');
        const meta = ep.introspect();
        expect(meta.example).toBeNull();
        expect(meta.examples).toBeNull();
        expect(meta.producesFile).toBeNull();
    });
});

describe('EndpointBuilder .produces() / .responseHeaders()', () => {
    it('.produces() stores content type map in introspect', () => {
        const csvSchema = string();
        const ep = endpoint
            .get('/api/items')
            .returns(object({ id: number() }))
            .produces({
                'text/csv': { schema: csvSchema },
                'application/xml': {}
            });

        const meta = ep.introspect();
        expect(meta.produces).toEqual({
            'text/csv': { schema: csvSchema },
            'application/xml': {}
        });
    });

    it('.produces() returns a new builder without mutating original', () => {
        const a = endpoint.get('/api/items');
        const b = a.produces({ 'text/csv': {} });
        expect(a).not.toBe(b);
        expect(a.introspect().produces).toBeNull();
        expect(b.introspect().produces).toEqual({ 'text/csv': {} });
    });

    it('.responseHeaders() stores schema in introspect', () => {
        const headerSchema = object({
            'X-Total-Count': number(),
            'X-Page': number()
        });
        const ep = endpoint.get('/api/items').responseHeaders(headerSchema);
        expect(ep.introspect().responseHeaderSchema).toBe(headerSchema);
    });

    it('.responseHeaders() returns a new builder without mutating original', () => {
        const headerSchema = object({ 'X-Request-Id': string() });
        const a = endpoint.get('/api/items');
        const b = a.responseHeaders(headerSchema);
        expect(a).not.toBe(b);
        expect(a.introspect().responseHeaderSchema).toBeNull();
        expect(b.introspect().responseHeaderSchema).toBe(headerSchema);
    });

    it('produces/responseHeaderSchema default to null in introspect', () => {
        const meta = endpoint.get('/api/items').introspect();
        expect(meta.produces).toBeNull();
        expect(meta.responseHeaderSchema).toBeNull();
    });
});

describe('EndpointBuilder .externalDocs() / .links() / .callbacks()', () => {
    it('.externalDocs() stores url and description in introspect', () => {
        const ep = endpoint
            .get('/api/items')
            .externalDocs('https://example.com/docs', 'Full docs');
        const meta = ep.introspect();
        expect(meta.externalDocs).toEqual({
            url: 'https://example.com/docs',
            description: 'Full docs'
        });
    });

    it('.externalDocs() returns a new builder without mutating original', () => {
        const a = endpoint.get('/api/items');
        const b = a.externalDocs('https://example.com');
        expect(a).not.toBe(b);
        expect(a.introspect().externalDocs).toBeNull();
        expect(b.introspect().externalDocs).toEqual({
            url: 'https://example.com',
            description: undefined
        });
    });

    it('externalDocs defaults to null in introspect', () => {
        expect(endpoint.get('/api/items').introspect().externalDocs).toBeNull();
    });

    it('.links() stores link definitions in introspect', () => {
        const defs = {
            GetUser: {
                operationId: 'getUser',
                parameters: { id: '$response.body#/id' }
            }
        };
        const ep = endpoint.get('/api/users').links(defs);
        expect(ep.introspect().links).toEqual(defs);
    });

    it('.links() returns a new builder without mutating original', () => {
        const a = endpoint.get('/api/users');
        const b = a.links({ Self: { operationId: 'getUser' } });
        expect(a).not.toBe(b);
        expect(a.introspect().links).toBeNull();
        expect(b.introspect().links).toEqual({
            Self: { operationId: 'getUser' }
        });
    });

    it('links defaults to null in introspect', () => {
        expect(endpoint.get('/api/items').introspect().links).toBeNull();
    });

    it('.callbacks() stores callback definitions in introspect', () => {
        const defs = {
            onEvent: {
                expression: '{$request.body#/callbackUrl}',
                method: 'POST'
            }
        };
        const ep = endpoint.post('/api/subscriptions').callbacks(defs);
        expect(ep.introspect().callbacks).toEqual(defs);
    });

    it('.callbacks() returns a new builder without mutating original', () => {
        const a = endpoint.post('/api/subscriptions');
        const b = a.callbacks({
            onEvent: { expression: '{$url}', method: 'POST' }
        });
        expect(a).not.toBe(b);
        expect(a.introspect().callbacks).toBeNull();
        expect(b.introspect().callbacks).toEqual({
            onEvent: { expression: '{$url}', method: 'POST' }
        });
    });

    it('callbacks defaults to null in introspect', () => {
        expect(endpoint.post('/api/items').introspect().callbacks).toBeNull();
    });
});
