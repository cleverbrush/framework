import { array, number, object, string } from '@cleverbrush/schema';
import { describe, expect, test } from 'vitest';
import { defineApi, endpoint, route } from './contract.js';

describe('defineApi', () => {
    test('returns a frozen contract with frozen groups', () => {
        const api = defineApi({
            todos: {
                list: endpoint
                    .get('/api/todos')
                    .responses({ 200: array(object({ id: number() })) })
            },
            auth: {
                login: endpoint
                    .post('/api/auth/login')
                    .body(object({ email: string(), password: string() }))
                    .responses({
                        200: object({ token: string() })
                    })
            }
        });

        expect(Object.isFrozen(api)).toBe(true);
        expect(Object.isFrozen(api.todos)).toBe(true);
        expect(Object.isFrozen(api.auth)).toBe(true);
    });

    test('preserves endpoint metadata', () => {
        const api = defineApi({
            users: {
                get: endpoint
                    .resource('/api/users')
                    .get(route({ id: number().coerce() })`/${t => t.id}`)
                    .responses({
                        200: object({ id: number(), name: string() })
                    })
            }
        });

        const meta = api.users.get.introspect();
        expect(meta.method).toBe('GET');
        expect(meta.basePath).toBe('/api/users');
        expect(meta.pathTemplate).toBeDefined();
        expect(typeof meta.pathTemplate).not.toBe('string');
    });

    test('identity — returns the same shape passed in', () => {
        const input = {
            items: {
                list: endpoint.get('/items')
            }
        };
        const api = defineApi(input);
        // The endpoint builder is the same object
        expect(api.items.list).toBe(input.items.list);
    });
});
