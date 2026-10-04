import { object, string } from '@cleverbrush/schema';
import { endpoint } from '@cleverbrush/server';
import { expect, it } from 'vitest';
import { generateOpenApiSpec } from './generateOpenApiSpec.js';

it('documents optional replay headers and framework errors without replacing domain errors', () => {
    const ep = endpoint
        .post('/items')
        .idempotent()
        .responses({ 201: string(), 409: object({ message: string() }) });
    const spec = generateOpenApiSpec({
        info: { title: 'Items', version: '1' },
        registrations: [{ endpoint: ep.introspect(), handler: () => undefined }]
    }) as any;
    const operation = spec.paths['/items'].post;
    expect(operation.parameters).toContainEqual(
        expect.objectContaining({
            in: 'header',
            name: 'X-Idempotency-Key'
        })
    );
    expect(operation.parameters[0].required).not.toBe(true);
    expect(operation.responses['409'].content).toHaveProperty(
        'application/json'
    );
    expect(operation.responses['409'].content).toHaveProperty(
        'application/problem+json'
    );
    expect(operation.responses['503'].content).toHaveProperty(
        'application/problem+json'
    );
});

it('does not duplicate a manually declared key header', () => {
    const ep = endpoint
        .post('/items')
        .idempotent()
        .headers(
            object({
                'x-idempotency-key': string().optional(),
                'x-request-id': string().optional()
            })
        );
    const spec = generateOpenApiSpec({
        info: { title: 'Items', version: '1' },
        registrations: [{ endpoint: ep.introspect(), handler: () => undefined }]
    }) as any;
    expect(
        spec.paths['/items'].post.parameters.filter(
            (value: any) => value.name.toLowerCase() === 'x-idempotency-key'
        )
    ).toHaveLength(1);
});
