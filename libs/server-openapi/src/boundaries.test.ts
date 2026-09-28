import {
    array,
    lazy,
    object,
    type SchemaBuilder,
    schemaRef,
    string
} from '@cleverbrush/schema';
import { endpoint } from '@cleverbrush/server';
import { describe, expect, it } from 'vitest';
import { generateAsyncApiSpec } from './generateAsyncApiSpec.js';
import { generateOpenApiSpec } from './generateOpenApiSpec.js';
import { SchemaRegistry, walkSchemas } from './schemaRegistry.js';

describe('named schema references in API documents', () => {
    it('uses one canonical component for requests, responses and annotated references', () => {
        const user = object({ name: string() }).schemaName('User');
        const history = object({
            current: schemaRef(user),
            previous: schemaRef(user).nullable().optional().describe('Previous')
        });
        const contract = endpoint
            .post('/history')
            .body(history)
            .responses({ 200: history });
        const spec = generateOpenApiSpec({
            registrations: [
                { endpoint: contract.introspect(), handler: () => {} }
            ],
            info: { title: 'References', version: '1' }
        }) as any;
        expect(Object.keys(spec.components.schemas)).toEqual(['User']);
        const request =
            spec.paths['/history'].post.requestBody.content['application/json']
                .schema;
        const response =
            spec.paths['/history'].post.responses['200'].content[
                'application/json'
            ].schema;
        expect(request).toEqual(response);
        expect(request.required).toEqual(['current']);
        expect(request.properties.current.allOf[0].$ref).toBe(
            '#/components/schemas/User'
        );
        expect(request.properties.previous.description).toBe('Previous');
        expect(spec.components.schemas.User).toMatchObject({
            type: 'object',
            required: ['name']
        });
    });

    it('preserves strict instance-based naming conflicts', () => {
        const user = object({ name: string() }).schemaName('User');
        const registry = new SchemaRegistry();
        walkSchemas(
            object({
                current: user,
                previous: schemaRef(user).nullable().optional()
            }),
            registry
        );
        expect([...registry.entries()].map(([name]) => name)).toEqual(['User']);
        expect(() => walkSchemas(user.optional(), registry)).toThrow(
            /already registered/
        );
        expect(() =>
            walkSchemas(string().schemaName('User'), registry)
        ).toThrow(/already registered/);
    });

    it('terminates on named recursive references in OpenAPI and AsyncAPI', () => {
        type Node = { name: string; children: Node[] };
        const node: SchemaBuilder<Node> = object({
            name: string(),
            children: array(lazy(() => schemaRef(node)))
        }).schemaName('Node');
        const contract = endpoint.get('/nodes').responses({ 200: node });
        const openapi = generateOpenApiSpec({
            registrations: [
                { endpoint: contract.introspect(), handler: () => {} }
            ],
            info: { title: 'Nodes', version: '1' }
        }) as any;
        const asyncapi = generateAsyncApiSpec({
            subscriptions: [
                {
                    endpoint: {
                        protocol: 'subscription',
                        basePath: '/ws',
                        pathTemplate: '/nodes',
                        incomingSchema: schemaRef(node),
                        outgoingSchema: schemaRef(node),
                        querySchema: null,
                        headerSchema: null,
                        serviceSchemas: null,
                        authRoles: null,
                        summary: null,
                        description: null,
                        tags: [],
                        operationId: null,
                        deprecated: false,
                        externalDocs: null
                    },
                    handler: async function* () {}
                }
            ],
            info: { title: 'Nodes', version: '1' }
        }) as any;
        for (const spec of [openapi, asyncapi]) {
            expect(Object.keys(spec.components.schemas)).toEqual(['Node']);
            expect(
                spec.components.schemas.Node.properties.children.items.allOf[0]
                    .$ref
            ).toBe('#/components/schemas/Node');
        }
        const channels = Object.values(asyncapi.channels) as any[];
        expect(channels).toHaveLength(1);
        expect(channels[0].address).toBe('/ws/nodes');
        const messages = channels[0].messages;
        expect(messages.ClientMessage.payload).toEqual(
            messages.ServerEvent.payload
        );
    });
});
