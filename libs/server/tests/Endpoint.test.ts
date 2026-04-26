import { number, object, parseString, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { endpoint, mapHandlers } from '../src/Endpoint.js';

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

describe('mapHandlers()', () => {
    const endpoints = {
        auth: {
            login: endpoint
                .post('/api/login')
                .body(object({ email: string() })),
            register: endpoint
                .post('/api/register')
                .body(object({ email: string() }))
        },
        items: {
            list: endpoint.get('/api/items'),
            create: endpoint.post('/api/items').body(object({ name: string() }))
        }
    };

    it('produces an entry for every endpoint', () => {
        const mapping = mapHandlers(endpoints, {
            auth: {
                login: () => 'login',
                register: () => 'register'
            },
            items: {
                list: () => [],
                create: () => ({ id: 1 })
            }
        });

        expect(mapping._entries).toHaveLength(4);
    });

    it('bare function handlers are extracted correctly', () => {
        const loginHandler = () => 'ok';
        const mapping = mapHandlers(endpoints, {
            auth: { login: loginHandler, register: () => 'r' },
            items: { list: () => [], create: () => ({}) }
        });

        const loginEntry = mapping._entries.find(
            e => e.endpoint.introspect().basePath === '/api/login'
        );
        expect(loginEntry).toBeDefined();
        expect(loginEntry!.handler).toBe(loginHandler);
        expect(loginEntry!.middlewares).toBeUndefined();
    });

    it('object entries with middlewares are extracted', () => {
        const createHandler = () => ({ id: 1 });
        const mw = async (_ctx: any, next: () => Promise<void>) => {
            await next();
        };

        const mapping = mapHandlers(endpoints, {
            auth: { login: () => 'ok', register: () => 'r' },
            items: {
                list: () => [],
                create: { handler: createHandler, middlewares: [mw] }
            }
        });

        const createEntry = mapping._entries.find(
            e =>
                e.endpoint.introspect().basePath === '/api/items' &&
                e.endpoint.introspect().method === 'POST'
        );
        expect(createEntry).toBeDefined();
        expect(createEntry!.handler).toBe(createHandler);
        expect(createEntry!.middlewares).toEqual([mw]);
    });

    it('preserves endpoint references', () => {
        const mapping = mapHandlers(endpoints, {
            auth: { login: () => 'ok', register: () => 'r' },
            items: { list: () => [], create: () => ({}) }
        });

        const listEntry = mapping._entries.find(
            e =>
                e.endpoint.introspect().basePath === '/api/items' &&
                e.endpoint.introspect().method === 'GET'
        );
        expect(listEntry!.endpoint).toBe(endpoints.items.list);
    });
});

describe('EndpointBuilder .headers() / .inject()', () => {
    it('headers(schema) stores headerSchema in introspect', () => {
        const headerSchema = object({ 'x-api-key': string() });
        const ep = endpoint.get('/api/items').headers(headerSchema);
        expect(ep.introspect().headerSchema).toBe(headerSchema);
    });

    it('headers() returns a new builder without mutating original', () => {
        const headerSchema = object({ authorization: string() });
        const a = endpoint.get('/api/items');
        const b = a.headers(headerSchema);
        expect(a).not.toBe(b);
        expect(a.introspect().headerSchema).toBeNull();
        expect(b.introspect().headerSchema).toBe(headerSchema);
    });

    it('inject({ name: schema }) stores serviceSchemas in introspect', () => {
        const userServiceSchema = object({ id: number() });
        const ep = endpoint
            .get('/api/items')
            .inject({ userService: userServiceSchema });
        expect(ep.introspect().serviceSchemas).toEqual({
            userService: userServiceSchema
        });
    });

    it('inject() returns a new builder without mutating original', () => {
        const schema = object({ id: number() });
        const a = endpoint.get('/api/items');
        const b = a.inject({ db: schema });
        expect(a).not.toBe(b);
        expect(a.introspect().serviceSchemas).toBeNull();
        expect(b.introspect().serviceSchemas).toEqual({ db: schema });
    });

    it('headerSchema and serviceSchemas default to null', () => {
        const meta = endpoint.get('/api/items').introspect();
        expect(meta.headerSchema).toBeNull();
        expect(meta.serviceSchemas).toBeNull();
    });
});

describe('EndpointBuilder .authorize()', () => {
    it('authorize(schema, role) stores authRoles and principal schema overload', () => {
        const principalSchema = object({ id: number(), role: string() });
        const ep = endpoint
            .get('/api/admin')
            .authorize(principalSchema, 'admin');
        expect(ep.introspect().authRoles).toEqual(['admin']);
    });

    it('authorize(schema) with no roles sets empty authRoles array', () => {
        const principalSchema = object({ id: number() });
        const ep = endpoint.get('/api/secure').authorize(principalSchema);
        expect(ep.introspect().authRoles).toEqual([]);
    });

    it('authorize(...roles) without schema sets authRoles', () => {
        const ep = endpoint.get('/api/items').authorize('admin', 'moderator');
        expect(ep.introspect().authRoles).toEqual(['admin', 'moderator']);
    });

    it('authorize() with no args sets empty authRoles', () => {
        const ep = endpoint.get('/api/me').authorize();
        expect(ep.introspect().authRoles).toEqual([]);
    });

    it('chaining authorize() merges roles', () => {
        const ep = endpoint
            .get('/api/items')
            .authorize('admin')
            .authorize('moderator');
        expect(ep.introspect().authRoles).toEqual(['admin', 'moderator']);
    });

    it('authRoles defaults to null when not set', () => {
        expect(endpoint.get('/api/items').introspect().authRoles).toBeNull();
    });
});

describe('EndpointBuilder .responses()', () => {
    it('responses(map) stores responsesSchemas in introspect', () => {
        const okSchema = object({ id: number() });
        const errSchema = object({ message: string() });
        const ep = endpoint
            .get('/api/items/:id')
            .responses({ 200: okSchema, 404: errSchema });
        const meta = ep.introspect();
        expect(meta.responsesSchemas).toEqual({
            200: okSchema,
            404: errSchema
        });
    });

    it('responses() with null schema for 204 is stored correctly', () => {
        const ep = endpoint
            .delete('/api/items/:id')
            .responses({ 204: null, 404: object({ message: string() }) });
        const meta = ep.introspect();
        expect(meta.responsesSchemas![204]).toBeNull();
        expect(meta.responsesSchemas![404]).toBeDefined();
    });

    it('responses() returns a new builder without mutating original', () => {
        const a = endpoint.get('/api/items/:id');
        const b = a.responses({ 200: object({ id: number() }) });
        expect(a).not.toBe(b);
        expect(a.introspect().responsesSchemas).toBeNull();
        expect(b.introspect().responsesSchemas).not.toBeNull();
    });

    it('responsesSchemas defaults to null', () => {
        expect(
            endpoint.get('/api/items').introspect().responsesSchemas
        ).toBeNull();
    });
});

describe('EndpointBuilder .path getter', () => {
    it('path returns basePath for default "/" pathTemplate', () => {
        const ep = endpoint.get('/api/items');
        expect(ep.path).toBe('/api/items');
    });

    it('path concatenates basePath and static pathTemplate', () => {
        // When a string pathTemplate is provided it is appended to basePath
        const ep = endpoint.get('/api', '/items');
        expect(ep.path).toBe('/api/items');
    });

    it('path with ParseStringSchemaBuilder expands :params from segments', () => {
        const paramsSchema = object({ id: number() });
        const tpl = parseString(paramsSchema, $t => $t`/${t => t.id}`);
        const ep = endpoint.get('/api/items', tpl as any);
        expect(ep.path).toBe('/api/items/:id');
    });

    it('path with multi-segment ParseStringSchemaBuilder builds full path', () => {
        const paramsSchema = object({ org: string(), repo: string() });
        const tpl = parseString(
            paramsSchema,
            $t => $t`/${t => t.org}/${t => t.repo}`
        );
        const ep = endpoint.get('/api', tpl as any);
        expect(ep.path).toBe('/api/:org/:repo');
    });
});

describe('mapHandlers() with subscription endpoints', () => {
    it('routes subscription endpoints to _subscriptions not _entries', () => {
        const subEndpoint = endpoint.subscription('/ws/events');
        const regularEndpoint = endpoint.get('/api/items');

        const mapping = mapHandlers(
            { ws: { events: subEndpoint }, api: { list: regularEndpoint } },
            {
                ws: { events: async function* () {} },
                api: { list: () => [] }
            }
        );

        expect(mapping._subscriptions).toHaveLength(1);
        expect(mapping._entries).toHaveLength(1);
        expect(mapping._subscriptions[0]!.endpoint).toBe(subEndpoint);
        expect(mapping._entries[0]!.endpoint).toBe(regularEndpoint);
    });
});

describe('SubscriptionBuilder .authorize()', () => {
    it('authorize(schema, role) stores typed principal schema overload (line 591)', () => {
        const principalSchema = object({ id: number() });
        const sub = endpoint
            .subscription('/ws/events')
            .authorize(principalSchema, 'admin');

        const meta = sub.introspect();
        expect(meta.authRoles).toEqual(['admin']);
    });

    it('authorize(schema) with no roles sets empty authRoles (Subscription)', () => {
        const principalSchema = object({ id: number() });
        const sub = endpoint
            .subscription('/ws/events')
            .authorize(principalSchema);

        const meta = sub.introspect();
        expect(meta.authRoles).toEqual([]);
    });

    it('authorize(...roles) without schema sets authRoles (Subscription)', () => {
        const sub = endpoint
            .subscription('/ws/events')
            .authorize('admin', 'moderator');

        const meta = sub.introspect();
        expect(meta.authRoles).toEqual(['admin', 'moderator']);
    });
});

describe('endpoint HTTP method factories', () => {
    it('patch() creates a PATCH endpoint', () => {
        const ep = endpoint.patch('/api/items');
        expect(ep.introspect().method).toBe('PATCH');
    });

    it('head() creates a HEAD endpoint', () => {
        const ep = endpoint.head('/api/items');
        expect(ep.introspect().method).toBe('HEAD');
    });

    it('options() creates an OPTIONS endpoint', () => {
        const ep = endpoint.options('/api/items');
        expect(ep.introspect().method).toBe('OPTIONS');
    });
});
