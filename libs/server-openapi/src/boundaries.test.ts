import {
    array,
    decode,
    lazy,
    number,
    object,
    type SchemaBuilder,
    schemaRef,
    string
} from '@cleverbrush/schema';
import { endpoint } from '@cleverbrush/server';
import { describe, expect, it } from 'vitest';
import { generateOpenApiSpec } from './generateOpenApiSpec.js';
import { SchemaRegistry, walkSchemas } from './schemaRegistry.js';

describe('schema boundaries in OpenAPI', () => {
    it('uses input requests, output responses, and directional nested components', () => {
        const size = decode(string(), number().isInteger(), Number).schemaName(
            'Size'
        );
        const request = object({ size: schemaRef(size) }).schemaName(
            'Envelope'
        );
        const contract = endpoint
            .post('/items')
            .body(request)
            .responses({ 200: request });
        const spec = generateOpenApiSpec({
            registrations: [
                { endpoint: contract.introspect(), handler: () => {} }
            ],
            info: { title: 'Boundaries', version: '1' }
        }) as any;
        expect(
            spec.paths['/items'].post.requestBody.content['application/json']
                .schema
        ).toEqual({ $ref: '#/components/schemas/EnvelopeInput' });
        expect(
            spec.paths['/items'].post.responses['200'].content[
                'application/json'
            ].schema
        ).toEqual({ $ref: '#/components/schemas/EnvelopeOutput' });
        expect(spec.components.schemas.SizeInput).toEqual({
            allOf: [{ type: 'string' }]
        });
        expect(spec.components.schemas.SizeOutput).toEqual({
            allOf: [{ type: 'integer' }]
        });
        expect(
            spec.components.schemas.EnvelopeInput.properties.size.allOf[0].$ref
        ).toBe('#/components/schemas/SizeInput');
    });

    it('registers one target with independently annotated references', () => {
        const user = object({ name: string() }).schemaName('User');
        const root = object({
            user,
            previous: schemaRef(user).nullable().optional().describe('Previous')
        });
        const registry = new SchemaRegistry();
        walkSchemas(root, registry);
        expect(
            [...registry.directionalEntries()].map(([name]) => name)
        ).toEqual(['User']);
        expect(() => walkSchemas(user.optional(), registry)).toThrow(
            /already registered/
        );
    });

    it('rejects generated-name collisions regardless of registration order', () => {
        const size = decode(string(), number(), Number).schemaName('Size');
        const collision = string().schemaName('SizeInput');
        for (const schemas of [
            [size, collision],
            [collision, size]
        ]) {
            const registry = new SchemaRegistry();
            for (const schema of schemas) walkSchemas(schema, registry);
            expect(() => [...registry.directionalEntries()]).toThrow(
                /SizeInput/
            );
        }
    });

    it('terminates on named recursive references', () => {
        type Node = { name: string; children: Node[] };
        const node: SchemaBuilder<Node> = object({
            name: string(),
            children: array(lazy(() => schemaRef(node)))
        }).schemaName('Node');
        const contract = endpoint.get('/nodes').responses({ 200: node });
        const spec = generateOpenApiSpec({
            registrations: [
                { endpoint: contract.introspect(), handler: () => {} }
            ],
            info: { title: 'Nodes', version: '1' }
        }) as any;
        expect(
            spec.components.schemas.Node.properties.children.items.allOf[0].$ref
        ).toBe('#/components/schemas/Node');
    });
});
