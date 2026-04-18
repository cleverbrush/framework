import { number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { endpoint, mapHandlers } from '../src/Endpoint.js';
import { createServer } from '../src/Server.js';
import { defineWebhook } from '../src/Webhook.js';

describe('ServerBuilder.getRegistrations()', () => {
    it('returns empty array when no endpoints registered', () => {
        const builder = createServer();
        expect(builder.getRegistrations()).toEqual([]);
    });

    it('returns all registered endpoints', () => {
        const builder = createServer()
            .handle(endpoint.get('/api/a'), () => 'a')
            .handle(endpoint.post('/api/b'), () => 'b')
            .handle(endpoint.put('/api/c'), () => 'c');

        expect(builder.getRegistrations()).toHaveLength(3);
    });

    it('returns defensive copy', () => {
        const builder = createServer().handle(
            endpoint.get('/api/a'),
            () => 'a'
        );
        const first = builder.getRegistrations();
        const second = builder.getRegistrations();
        expect(first).not.toBe(second);
        expect(first).toEqual(second);
    });

    it('registrations include full endpoint metadata', () => {
        const bodySchema = object({ name: string() });
        const querySchema = object({ page: number() });
        const responseSchema = object({ id: number() });

        const ep = endpoint
            .post('/api/items')
            .body(bodySchema)
            .query(querySchema)
            .summary('Create item')
            .tags('items')
            .returns(responseSchema);

        const builder = createServer().handle(ep, () => ({ id: 1 }));
        const regs = builder.getRegistrations();
        expect(regs).toHaveLength(1);

        const meta = regs[0].endpoint;
        expect(meta.method).toBe('POST');
        expect(meta.basePath).toBe('/api/items');
        expect(meta.bodySchema).not.toBeNull();
        expect(meta.querySchema).not.toBeNull();
        expect(meta.summary).toBe('Create item');
        expect(meta.tags).toEqual(['items']);
        expect(meta.responseSchema).not.toBeNull();
    });

    it('registration order matches handle() call order', () => {
        const builder = createServer()
            .handle(endpoint.get('/first'), () => '1')
            .handle(endpoint.get('/second'), () => '2')
            .handle(endpoint.get('/third'), () => '3');

        const regs = builder.getRegistrations();
        expect(regs[0].endpoint.basePath).toBe('/first');
        expect(regs[1].endpoint.basePath).toBe('/second');
        expect(regs[2].endpoint.basePath).toBe('/third');
    });
});

describe('ServerBuilder.getAuthenticationConfig()', () => {
    it('returns null when no auth configured', () => {
        const builder = createServer();
        expect(builder.getAuthenticationConfig()).toBeNull();
    });

    it('returns config after useAuthentication()', () => {
        const mockScheme = {
            name: 'jwt',
            authenticate: async () => ({
                succeeded: false as const,
                failure: 'test'
            })
        };
        const builder = createServer().useAuthentication({
            defaultScheme: 'jwt',
            schemes: [mockScheme]
        });

        const config = builder.getAuthenticationConfig();
        expect(config).not.toBeNull();
        expect(config!.defaultScheme).toBe('jwt');
        expect(config!.schemes).toHaveLength(1);
        expect(config!.schemes[0].name).toBe('jwt');
    });
});

describe('ServerBuilder.handleAll()', () => {
    const endpoints = {
        auth: {
            login: endpoint
                .post('/api/login')
                .body(object({ email: string() })),
            register: endpoint.post('/api/register')
        },
        items: {
            list: endpoint.get('/api/items'),
            create: endpoint.post('/api/items').body(object({ name: string() }))
        }
    };

    it('registers all endpoints from a mapping', () => {
        const mapping = mapHandlers(endpoints, {
            auth: { login: () => 'ok', register: () => 'ok' },
            items: { list: () => [], create: () => ({}) }
        });

        const builder = createServer().handleAll(mapping);
        expect(builder.getRegistrations()).toHaveLength(4);
    });

    it('registers correct handlers for each endpoint', () => {
        const loginHandler = () => 'logged in';
        const mapping = mapHandlers(endpoints, {
            auth: { login: loginHandler, register: () => 'ok' },
            items: { list: () => [], create: () => ({}) }
        });

        const builder = createServer().handleAll(mapping);
        const regs = builder.getRegistrations();
        const loginReg = regs.find(r => r.endpoint.basePath === '/api/login');
        expect(loginReg).toBeDefined();
        expect(loginReg!.handler).toBe(loginHandler);
    });

    it('registers middlewares from object entries', () => {
        const mw = async (_ctx: any, next: () => Promise<void>) => {
            await next();
        };
        const createHandler = () => ({ id: 1 });

        const mapping = mapHandlers(endpoints, {
            auth: { login: () => 'ok', register: () => 'ok' },
            items: {
                list: () => [],
                create: { handler: createHandler, middlewares: [mw] }
            }
        });

        const builder = createServer().handleAll(mapping);
        const regs = builder.getRegistrations();
        const createReg = regs.find(
            r =>
                r.endpoint.basePath === '/api/items' &&
                r.endpoint.method === 'POST'
        );
        expect(createReg).toBeDefined();
        expect(createReg!.handler).toBe(createHandler);
        expect(createReg!.middlewares).toEqual([mw]);
    });

    it('is chainable with handle()', () => {
        const extra = endpoint.get('/api/health');
        const mapping = mapHandlers(endpoints, {
            auth: { login: () => 'ok', register: () => 'ok' },
            items: { list: () => [], create: () => ({}) }
        });

        const builder = createServer()
            .handle(extra, () => 'ok')
            .handleAll(mapping);

        expect(builder.getRegistrations()).toHaveLength(5);
    });
});

describe('ServerBuilder.webhook() / getWebhooks()', () => {
    it('returns empty array when no webhooks registered', () => {
        const builder = createServer();
        expect(builder.getWebhooks()).toEqual([]);
    });

    it('.webhook() registers a webhook and .getWebhooks() returns it', () => {
        const bodySchema = object({ id: number() });
        const wh = defineWebhook('userCreated', {
            method: 'POST',
            summary: 'New user',
            body: bodySchema
        });
        const builder = createServer().webhook(wh);
        const webhooks = builder.getWebhooks();
        expect(webhooks).toHaveLength(1);
        expect(webhooks[0].name).toBe('userCreated');
        expect(webhooks[0].summary).toBe('New user');
        expect(webhooks[0].body).toBe(bodySchema);
    });

    it('.getWebhooks() returns a snapshot (not the internal array)', () => {
        const builder = createServer().webhook(defineWebhook('ping', {}));
        const a = builder.getWebhooks();
        const b = builder.getWebhooks();
        expect(a).not.toBe(b);
        expect(a).toEqual(b);
    });
});

describe('defineWebhook()', () => {
    it('creates a WebhookDefinition with the given name and options', () => {
        const respSchema = object({ ok: string() });
        const wh = defineWebhook('orderShipped', {
            method: 'POST',
            description: 'Fired when order ships',
            tags: ['orders'],
            response: respSchema
        });
        expect(wh.name).toBe('orderShipped');
        expect(wh.method).toBe('POST');
        expect(wh.description).toBe('Fired when order ships');
        expect(wh.tags).toEqual(['orders']);
        expect(wh.response).toBe(respSchema);
    });

    it('defaults to no method when not specified', () => {
        const wh = defineWebhook('ping', {});
        expect(wh.method).toBeUndefined();
    });
});
