import { number, object, parseString, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { endpoint } from './Endpoint.js';

describe('EndpointBuilder.path', () => {
    it('should return basePath for static endpoints', () => {
        const ep = endpoint.get('/health');
        expect(ep.path).toBe('/health');
    });

    it('should return basePath for root endpoint', () => {
        const ep = endpoint.get('/');
        expect(ep.path).toBe('/');
    });

    it('should return basePath + pathTemplate for static two-part paths', () => {
        const ep = endpoint.get('/api/users', '/active');
        expect(ep.path).toBe('/api/users/active');
    });

    it('should return basePath + :param for parameterized paths', () => {
        const pathSchema = parseString(
            object({ id: string().required() }),
            $t => $t`/${t => t.id}`
        );
        const ep = endpoint.get('/users', pathSchema);
        expect(ep.path).toBe('/users/:id');
    });

    it('should handle multiple parameters', () => {
        const pathSchema = parseString(
            object({
                userId: number().required(),
                todoId: number().required()
            }),
            $t => $t`/${t => t.userId}/todos/${t => t.todoId}`
        );
        const ep = endpoint.get('/api', pathSchema);
        expect(ep.path).toBe('/api/:userId/todos/:todoId');
    });

    it('should preserve path after builder chaining', () => {
        const ep = endpoint
            .get('/openapi.json')
            .summary('OpenAPI spec')
            .tags('docs')
            .operationId('getSpec');
        expect(ep.path).toBe('/openapi.json');
    });
});
