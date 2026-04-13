import { boolean, number, object, string } from '@cleverbrush/schema';
import type {
    EndpointMetadata,
    EndpointRegistration
} from '@cleverbrush/server';
import { describe, expect, it } from 'vitest';
import {
    generateOpenApiSpec,
    type OpenApiOptions
} from './generateOpenApiSpec.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMeta(partial: Partial<EndpointMetadata> = {}): EndpointMetadata {
    return {
        method: 'GET',
        basePath: '/api',
        pathTemplate: '/items',
        bodySchema: null,
        querySchema: null,
        headerSchema: null,
        serviceSchemas: null,
        authRoles: null,
        summary: null,
        description: null,
        tags: [],
        operationId: null,
        deprecated: false,
        responseSchema: null,
        ...partial
    };
}

function makeReg(meta: Partial<EndpointMetadata> = {}): EndpointRegistration {
    return {
        endpoint: makeMeta(meta),
        handler: () => {}
    };
}

function makeOptions(
    registrations: EndpointRegistration[],
    overrides: Partial<OpenApiOptions> = {}
): OpenApiOptions {
    return {
        registrations,
        info: { title: 'Test API', version: '1.0.0' },
        ...overrides
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateOpenApiSpec', () => {
    // --- Document structure ---

    it('produces a valid OpenAPI 3.1 skeleton', () => {
        const spec = generateOpenApiSpec(makeOptions([]));
        expect(spec['openapi']).toBe('3.1.0');
        expect(spec['info']).toEqual({ title: 'Test API', version: '1.0.0' });
        expect(spec['paths']).toEqual({});
    });

    it('includes servers when provided', () => {
        const spec = generateOpenApiSpec(
            makeOptions([], {
                servers: [
                    { url: 'https://api.example.com', description: 'Prod' }
                ]
            })
        );
        expect((spec['servers'] as any[])![0]).toEqual({
            url: 'https://api.example.com',
            description: 'Prod'
        });
    });

    it('omits servers when not provided', () => {
        const spec = generateOpenApiSpec(makeOptions([]));
        expect(spec['servers']).toBeUndefined();
    });

    it('includes info description and license when provided', () => {
        const spec = generateOpenApiSpec(
            makeOptions([], {
                info: {
                    title: 'My API',
                    version: '2.0.0',
                    description: 'A test API',
                    license: { name: 'MIT' }
                }
            })
        );
        const info = spec['info'] as any;
        expect(info.description).toBe('A test API');
        expect(info.license).toEqual({ name: 'MIT' });
    });

    // --- Paths ---

    it('groups endpoints by path', () => {
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'GET',
                    basePath: '/api',
                    pathTemplate: '/users'
                }),
                makeReg({
                    method: 'POST',
                    basePath: '/api',
                    pathTemplate: '/users'
                })
            ])
        );
        const paths = spec['paths'] as any;
        expect(paths['/api/users']).toBeDefined();
        expect(paths['/api/users']['get']).toBeDefined();
        expect(paths['/api/users']['post']).toBeDefined();
    });

    it('converts colon params to OpenAPI path params', () => {
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'GET',
                    basePath: '/api',
                    pathTemplate: '/users/:id'
                })
            ])
        );
        const paths = spec['paths'] as any;
        expect(paths['/api/users/{id}']).toBeDefined();
        const op = paths['/api/users/{id}']['get'];
        const pathParam = op.parameters.find(
            (p: any) => p.in === 'path' && p.name === 'id'
        );
        expect(pathParam).toBeDefined();
        expect(pathParam.required).toBe(true);
    });

    // --- Metadata ---

    it('includes summary, description, tags, operationId', () => {
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'GET',
                    basePath: '/api',
                    pathTemplate: '/items',
                    summary: 'List items',
                    description: 'Returns all items',
                    tags: ['items'],
                    operationId: 'listItems'
                })
            ])
        );
        const op = (spec['paths'] as any)['/api/items']['get'];
        expect(op.summary).toBe('List items');
        expect(op.description).toBe('Returns all items');
        expect(op.tags).toEqual(['items']);
        expect(op.operationId).toBe('listItems');
    });

    it('includes deprecated flag when true', () => {
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'GET',
                    basePath: '/api',
                    pathTemplate: '/old',
                    deprecated: true
                })
            ])
        );
        const op = (spec['paths'] as any)['/api/old']['get'];
        expect(op.deprecated).toBe(true);
    });

    it('omits metadata fields when not set', () => {
        const spec = generateOpenApiSpec(makeOptions([makeReg()]));
        const op = (spec['paths'] as any)['/api/items']['get'];
        expect(op.summary).toBeUndefined();
        expect(op.description).toBeUndefined();
        expect(op.tags).toBeUndefined();
        expect(op.operationId).toBeUndefined();
        expect(op.deprecated).toBeUndefined();
    });

    // --- Query parameters ---

    it('converts query schema to parameters', () => {
        const querySchema = object({
            page: number(),
            search: string().optional()
        });
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'GET',
                    basePath: '/api',
                    pathTemplate: '/items',
                    querySchema
                })
            ])
        );
        const op = (spec['paths'] as any)['/api/items']['get'];
        expect(op.parameters).toBeDefined();
        const pageParam = op.parameters.find(
            (p: any) => p.name === 'page' && p.in === 'query'
        );
        expect(pageParam).toBeDefined();
        expect(pageParam.required).toBe(true);

        const searchParam = op.parameters.find(
            (p: any) => p.name === 'search' && p.in === 'query'
        );
        expect(searchParam).toBeDefined();
        // notRequired means required is absent or false
        expect(searchParam.required).toBeFalsy();
    });

    // --- Header parameters ---

    it('converts header schema to parameters', () => {
        const headerSchema = object({
            'x-api-key': string()
        });
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'GET',
                    basePath: '/api',
                    pathTemplate: '/items',
                    headerSchema
                })
            ])
        );
        const op = (spec['paths'] as any)['/api/items']['get'];
        const headerParam = op.parameters.find(
            (p: any) => p.name === 'x-api-key' && p.in === 'header'
        );
        expect(headerParam).toBeDefined();
        expect(headerParam.required).toBe(true);
    });

    // --- Request body ---

    it('includes requestBody for endpoints with bodySchema', () => {
        const bodySchema = object({
            name: string(),
            active: boolean()
        });
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'POST',
                    basePath: '/api',
                    pathTemplate: '/items',
                    bodySchema
                })
            ])
        );
        const op = (spec['paths'] as any)['/api/items']['post'];
        expect(op.requestBody).toBeDefined();
        expect(op.requestBody.content['application/json']).toBeDefined();
        expect(op.requestBody.content['application/json'].schema).toBeDefined();
    });

    it('omits requestBody when no bodySchema', () => {
        const spec = generateOpenApiSpec(
            makeOptions([makeReg({ method: 'POST' })])
        );
        const op = (spec['paths'] as any)['/api/items']['post'];
        expect(op.requestBody).toBeUndefined();
    });

    // --- Responses ---

    it('includes response schema when responseSchema is set', () => {
        const responseSchema = object({ id: number(), name: string() });
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'GET',
                    basePath: '/api',
                    pathTemplate: '/items',
                    responseSchema
                })
            ])
        );
        const op = (spec['paths'] as any)['/api/items']['get'];
        expect(op.responses['200']).toBeDefined();
        expect(
            op.responses['200'].content['application/json'].schema
        ).toBeDefined();
    });

    it('uses 204 for DELETE when no responseSchema', () => {
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'DELETE',
                    basePath: '/api',
                    pathTemplate: '/items/:id'
                })
            ])
        );
        const op = (spec['paths'] as any)['/api/items/{id}']['delete'];
        expect(op.responses['204']).toBeDefined();
        expect(op.responses['204'].description).toBe('No content');
    });

    it('uses 200 for GET when no responseSchema', () => {
        const spec = generateOpenApiSpec(
            makeOptions([makeReg({ method: 'GET' })])
        );
        const op = (spec['paths'] as any)['/api/items']['get'];
        expect(op.responses['200']).toBeDefined();
        expect(op.responses['200'].description).toBe('Successful response');
    });

    // --- Security ---

    it('adds security schemes from authConfig', () => {
        const spec = generateOpenApiSpec(
            makeOptions(
                [
                    makeReg({
                        method: 'GET',
                        basePath: '/api',
                        pathTemplate: '/secure',
                        authRoles: ['admin']
                    })
                ],
                {
                    authConfig: {
                        defaultScheme: 'jwt',
                        schemes: [
                            {
                                name: 'jwt',
                                authenticate: async () => ({
                                    succeeded: false as const,
                                    failure: 'test'
                                }),
                                challenge: () => ({
                                    headerName: 'WWW-Authenticate',
                                    headerValue: 'Bearer'
                                })
                            }
                        ]
                    }
                }
            )
        );
        const components = spec['components'] as any;
        expect(components.securitySchemes['jwt']).toBeDefined();
        expect(components.securitySchemes['jwt'].type).toBe('http');
        expect(components.securitySchemes['jwt'].scheme).toBe('bearer');
    });

    it('adds operation-level security for authorized endpoints', () => {
        const spec = generateOpenApiSpec(
            makeOptions(
                [
                    makeReg({
                        method: 'GET',
                        basePath: '/api',
                        pathTemplate: '/secure',
                        authRoles: ['admin', 'editor']
                    })
                ],
                {
                    securitySchemes: {
                        jwt: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT'
                        }
                    }
                }
            )
        );
        const op = (spec['paths'] as any)['/api/secure']['get'];
        expect(op.security).toEqual([{ jwt: ['admin', 'editor'] }]);
    });

    it('omits operation security for public endpoints (authRoles null)', () => {
        const spec = generateOpenApiSpec(
            makeOptions(
                [
                    makeReg({
                        method: 'GET',
                        basePath: '/api',
                        pathTemplate: '/public',
                        authRoles: null
                    })
                ],
                {
                    securitySchemes: {
                        jwt: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT'
                        }
                    }
                }
            )
        );
        const op = (spec['paths'] as any)['/api/public']['get'];
        expect(op.security).toBeUndefined();
    });

    it('omits components when no security schemes', () => {
        const spec = generateOpenApiSpec(makeOptions([]));
        expect(spec['components']).toBeUndefined();
    });

    it('uses explicitly provided securitySchemes over authConfig', () => {
        const spec = generateOpenApiSpec(
            makeOptions(
                [
                    makeReg({
                        method: 'GET',
                        basePath: '/api',
                        pathTemplate: '/items',
                        authRoles: []
                    })
                ],
                {
                    authConfig: {
                        defaultScheme: 'jwt',
                        schemes: [
                            {
                                name: 'jwt',
                                authenticate: async () => ({
                                    succeeded: false as const,
                                    failure: ''
                                })
                            }
                        ]
                    },
                    securitySchemes: {
                        custom: { type: 'apiKey', in: 'header', name: 'X-Key' }
                    }
                }
            )
        );
        const components = spec['components'] as any;
        expect(components.securitySchemes['custom']).toBeDefined();
        expect(components.securitySchemes['jwt']).toBeUndefined();
    });

    // --- Multiple endpoints ---

    it('handles multiple endpoints on different paths', () => {
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'GET',
                    basePath: '/api',
                    pathTemplate: '/users'
                }),
                makeReg({
                    method: 'GET',
                    basePath: '/api',
                    pathTemplate: '/posts'
                }),
                makeReg({
                    method: 'POST',
                    basePath: '/api',
                    pathTemplate: '/posts'
                })
            ])
        );
        const paths = spec['paths'] as any;
        expect(Object.keys(paths)).toHaveLength(2);
        expect(paths['/api/users']['get']).toBeDefined();
        expect(paths['/api/posts']['get']).toBeDefined();
        expect(paths['/api/posts']['post']).toBeDefined();
    });
});
