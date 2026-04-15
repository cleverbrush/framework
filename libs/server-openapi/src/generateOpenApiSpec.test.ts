import { boolean, number, object, string, union } from '@cleverbrush/schema';
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
        responsesSchemas: null,
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

// ---------------------------------------------------------------------------
// $ref / component schema deduplication via .schemaName()
// ---------------------------------------------------------------------------

describe('generateOpenApiSpec — $ref deduplication', () => {
    it('emits components.schemas entry for a named response schema', () => {
        const UserSchema = object({ id: number(), name: string() }).schemaName(
            'User'
        );
        const spec = generateOpenApiSpec(
            makeOptions([makeReg({ responseSchema: UserSchema })])
        );
        const components = spec['components'] as any;
        expect(components).toBeDefined();
        expect(components['schemas']['User']).toMatchObject({ type: 'object' });
    });

    it('emits $ref in operation response when schema is named', () => {
        const UserSchema = object({ id: number() }).schemaName('User');
        const spec = generateOpenApiSpec(
            makeOptions([makeReg({ responseSchema: UserSchema })])
        );
        const paths = spec['paths'] as any;
        const content =
            paths['/api/items']['get']['responses']['200']['content'];
        expect(content['application/json']['schema']).toEqual({
            $ref: '#/components/schemas/User'
        });
    });

    it('shares a single components.schemas entry across two endpoints', () => {
        const UserSchema = object({ id: number() }).schemaName('User');
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    basePath: '/api',
                    pathTemplate: '/users',
                    method: 'GET',
                    responseSchema: UserSchema
                }),
                makeReg({
                    basePath: '/api',
                    pathTemplate: '/admin/user',
                    method: 'GET',
                    responseSchema: UserSchema
                })
            ])
        );
        const schemas = (spec['components'] as any)['schemas'];
        expect(Object.keys(schemas)).toEqual(['User']);

        const paths = spec['paths'] as any;
        const ref1 =
            paths['/api/users']['get']['responses']['200']['content'][
                'application/json'
            ]['schema'];
        const ref2 =
            paths['/api/admin/user']['get']['responses']['200']['content'][
                'application/json'
            ]['schema'];
        expect(ref1).toEqual({ $ref: '#/components/schemas/User' });
        expect(ref2).toEqual({ $ref: '#/components/schemas/User' });
    });

    it('inlines unnamed schemas as before', () => {
        const AnonSchema = object({ val: string() });
        const spec = generateOpenApiSpec(
            makeOptions([makeReg({ responseSchema: AnonSchema })])
        );
        const paths = spec['paths'] as any;
        const schema =
            paths['/api/items']['get']['responses']['200']['content'][
                'application/json'
            ]['schema'];
        expect(schema).toMatchObject({ type: 'object' });
        expect(schema).not.toHaveProperty('$ref');
        // No components.schemas when everything is inline + no security
        const components = spec['components'] as any;
        expect(components?.schemas).toBeUndefined();
    });

    it('emits $ref for a named schema nested inside the body', () => {
        const AddressSchema = object({ city: string() }).schemaName('Address');
        const CreateUserBody = object({ address: AddressSchema });
        const spec = generateOpenApiSpec(
            makeOptions([makeReg({ bodySchema: CreateUserBody })])
        );
        const schemas = (spec['components'] as any)['schemas'];
        expect(schemas['Address']).toMatchObject({ type: 'object' });

        const paths = spec['paths'] as any;
        const bodySchema =
            paths['/api/items']['get']['requestBody']['content'][
                'application/json'
            ]['schema'];
        // The top-level body is anonymous — inlined
        expect(bodySchema['properties']['address']).toEqual({
            $ref: '#/components/schemas/Address'
        });
    });

    it('throws when two different schema instances share a name', () => {
        const A = object({ x: string() }).schemaName('Conflict');
        const B = object({ y: number() }).schemaName('Conflict');
        expect(() =>
            generateOpenApiSpec(
                makeOptions([
                    makeReg({
                        basePath: '/api',
                        pathTemplate: '/a',
                        responseSchema: A
                    }),
                    makeReg({
                        basePath: '/api',
                        pathTemplate: '/b',
                        responseSchema: B
                    })
                ])
            )
        ).toThrow(/Conflict/);
    });

    it('handles the same named schema in body and response without error', () => {
        const UserSchema = object({ id: number() }).schemaName('User');
        expect(() =>
            generateOpenApiSpec(
                makeOptions([
                    makeReg({
                        bodySchema: UserSchema,
                        responseSchema: UserSchema
                    })
                ])
            )
        ).not.toThrow();
        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({ bodySchema: UserSchema, responseSchema: UserSchema })
            ])
        );
        const schemas = (spec['components'] as any)['schemas'];
        expect(Object.keys(schemas)).toEqual(['User']);
    });
});

// ---------------------------------------------------------------------------
// Discriminated union → discriminator keyword
// ---------------------------------------------------------------------------

describe('discriminated union discriminator keyword', () => {
    it('emits discriminator on inline discriminated union body schema', () => {
        const bodySchema = union(
            object({ type: string('cat'), name: string() })
        ).or(object({ type: string('dog'), breed: string() }));

        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'POST',
                    bodySchema
                })
            ])
        );

        const body = (spec['paths'] as any)['/api/items']['post'][
            'requestBody'
        ]['content']['application/json']['schema'];
        expect(body['discriminator']).toEqual({ propertyName: 'type' });
        expect(body['anyOf']).toBeDefined();
    });

    it('emits discriminator with mapping when branches are named schemas', () => {
        const CatSchema = object({
            type: string('cat'),
            name: string()
        }).schemaName('Cat');
        const DogSchema = object({
            type: string('dog'),
            breed: string()
        }).schemaName('Dog');
        const bodySchema = union(CatSchema).or(DogSchema);

        const spec = generateOpenApiSpec(
            makeOptions([
                makeReg({
                    method: 'POST',
                    bodySchema
                })
            ])
        );

        const body = (spec['paths'] as any)['/api/items']['post'][
            'requestBody'
        ]['content']['application/json']['schema'];
        expect(body['discriminator']).toEqual({
            propertyName: 'type',
            mapping: {
                cat: '#/components/schemas/Cat',
                dog: '#/components/schemas/Dog'
            }
        });
        expect(body['anyOf']).toEqual([
            { $ref: '#/components/schemas/Cat' },
            { $ref: '#/components/schemas/Dog' }
        ]);
        // Components should contain both schemas
        const schemas = (spec['components'] as any)['schemas'];
        expect(schemas['Cat']).toBeDefined();
        expect(schemas['Dog']).toBeDefined();
    });

    // --- Default values ---

    it('propagates default values in query parameters', () => {
        const querySchema = object({
            page: number().default(1).optional(),
            search: string()
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
        const pageParam = op.parameters.find(
            (p: any) => p.name === 'page' && p.in === 'query'
        );
        expect(pageParam.schema).toHaveProperty('default', 1);
    });

    it('propagates default values in header parameters', () => {
        const headerSchema = object({
            'x-version': string().default('v1').optional()
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
        const versionParam = op.parameters.find(
            (p: any) => p.name === 'x-version' && p.in === 'header'
        );
        expect(versionParam.schema).toHaveProperty('default', 'v1');
    });

    it('propagates default values in request body properties', () => {
        const bodySchema = object({
            active: boolean().default(true).optional()
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
        const schema = (spec['paths'] as any)['/api/items']['post'].requestBody
            .content['application/json'].schema;
        expect(schema.properties.active).toHaveProperty('default', true);
    });

    it('omits factory defaults from request body properties', () => {
        const bodySchema = object({
            tags: string()
                .default(() => 'none')
                .optional()
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
        const schema = (spec['paths'] as any)['/api/items']['post'].requestBody
            .content['application/json'].schema;
        expect(schema.properties.tags).not.toHaveProperty('default');
    });
});
