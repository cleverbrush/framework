import { number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { endpoint } from '../src/Endpoint.js';
import { createServer } from '../src/Server.js';

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
