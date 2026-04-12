import { number, object, parseString } from '@cleverbrush/schema';
import type { EndpointMetadata } from '@cleverbrush/server';
import { describe, expect, it } from 'vitest';
import { resolvePath } from './pathUtils.js';

function makeMeta(overrides: Partial<EndpointMetadata> = {}): EndpointMetadata {
    return {
        method: 'GET',
        basePath: '/api',
        pathTemplate: '/',
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
        ...overrides
    };
}

describe('pathUtils', () => {
    it('leaves static paths unchanged', () => {
        const result = resolvePath(makeMeta({ basePath: '/api/health' }));
        expect(result.path).toBe('/api/health');
        expect(result.parameters).toEqual([]);
    });

    it('converts :param to {param}', () => {
        const result = resolvePath(
            makeMeta({ basePath: '/users/:id', pathTemplate: '/' })
        );
        expect(result.path).toBe('/users/{id}');
        expect(result.parameters).toHaveLength(1);
        expect(result.parameters[0].name).toBe('id');
    });

    it('converts multiple params', () => {
        const result = resolvePath(
            makeMeta({
                basePath: '/users/:uid/posts/:pid',
                pathTemplate: '/'
            })
        );
        expect(result.path).toBe('/users/{uid}/posts/{pid}');
        expect(result.parameters).toHaveLength(2);
        expect(result.parameters[0].name).toBe('uid');
        expect(result.parameters[1].name).toBe('pid');
    });

    it('combines basePath and static pathTemplate', () => {
        const result = resolvePath(
            makeMeta({ basePath: '/api', pathTemplate: '/users' })
        );
        expect(result.path).toBe('/api/users');
    });

    it('combines basePath and dynamic pathTemplate', () => {
        const pathTemplate = parseString(
            object({ id: number().coerce() }),
            $t => $t`/${t => t.id}`
        );
        const result = resolvePath(
            makeMeta({ basePath: '/api/users', pathTemplate })
        );
        expect(result.path).toBe('/api/users/{id}');
        expect(result.parameters).toHaveLength(1);
        expect(result.parameters[0].name).toBe('id');
    });

    it('extracts param schemas from ParseStringSchemaBuilder', () => {
        const pathTemplate = parseString(
            object({ id: number().coerce() }),
            $t => $t`/${t => t.id}`
        );
        const result = resolvePath(
            makeMeta({ basePath: '/api/items', pathTemplate })
        );
        expect(result.parameters[0].schema).toHaveProperty('type');
    });

    it('normalizes double slashes', () => {
        const result = resolvePath(
            makeMeta({ basePath: '/api/', pathTemplate: '/users' })
        );
        expect(result.path).toBe('/api/users');
    });

    it('handles root path', () => {
        const result = resolvePath(
            makeMeta({ basePath: '/', pathTemplate: '/' })
        );
        expect(result.path).toBe('/');
    });
});
