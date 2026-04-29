import { array, number, object, string } from '@cleverbrush/schema';
import { describe, expect, expectTypeOf, test } from 'vitest';
import {
    defineApi,
    endpoint,
    mergeContracts,
    omitGroups,
    pickGroups,
    route
} from './contract.js';

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

// ---------------------------------------------------------------------------
// mergeContracts
// ---------------------------------------------------------------------------

describe('mergeContracts', () => {
    test('combines non-overlapping groups from both contracts', () => {
        const a = defineApi({
            todos: { list: endpoint.get('/api/todos') }
        });
        const b = defineApi({
            admin: { activityLog: endpoint.get('/api/admin/activity') }
        });

        const merged = mergeContracts(a, b);

        expect(merged.todos.list).toBe(a.todos.list);
        expect(merged.admin.activityLog).toBe(b.admin.activityLog);
    });

    test('merges endpoint maps for overlapping group keys', () => {
        const a = defineApi({
            users: { list: endpoint.get('/api/users') }
        });
        const b = defineApi({
            users: { create: endpoint.post('/api/users') }
        });

        const merged = mergeContracts(a, b);

        expect(merged.users.list).toBe(a.users.list);
        expect(merged.users.create).toBe(b.users.create);
    });

    test('later contract wins for duplicate endpoint keys within a shared group', () => {
        const original = endpoint.get('/api/users');
        const override = endpoint.get('/api/users/v2');

        const a = defineApi({ users: { list: original } });
        const b = defineApi({ users: { list: override } });

        const merged = mergeContracts(a, b);

        expect(merged.users.list).toBe(override);
    });

    test('returns a frozen contract and frozen groups', () => {
        const a = defineApi({ todos: { list: endpoint.get('/api/todos') } });
        const b = defineApi({ admin: { log: endpoint.get('/api/admin/log') } });

        const merged = mergeContracts(a, b);

        expect(Object.isFrozen(merged)).toBe(true);
        expect(Object.isFrozen(merged.todos)).toBe(true);
        expect(Object.isFrozen(merged.admin)).toBe(true);
    });

    test('does not mutate the source contracts', () => {
        const a = defineApi({ todos: { list: endpoint.get('/api/todos') } });
        const b = defineApi({ admin: { log: endpoint.get('/api/admin') } });

        mergeContracts(a, b);

        expect(Object.keys(a)).toEqual(['todos']);
        expect(Object.keys(b)).toEqual(['admin']);
    });

    test('inferred type includes groups from both contracts', () => {
        const a = defineApi({ todos: { list: endpoint.get('/api/todos') } });
        const b = defineApi({
            auth: { login: endpoint.post('/api/auth/login') }
        });

        const merged = mergeContracts(a, b);

        expectTypeOf(merged).toHaveProperty('todos');
        expectTypeOf(merged).toHaveProperty('auth');
    });

    test('inferred type merges endpoint maps for shared group keys', () => {
        const a = defineApi({ users: { list: endpoint.get('/api/users') } });
        const b = defineApi({
            users: { create: endpoint.post('/api/users') }
        });

        const merged = mergeContracts(a, b);

        expectTypeOf(merged.users).toHaveProperty('list');
        expectTypeOf(merged.users).toHaveProperty('create');
    });
});

// ---------------------------------------------------------------------------
// pickGroups
// ---------------------------------------------------------------------------

describe('pickGroups', () => {
    const api = defineApi({
        todos: { list: endpoint.get('/api/todos') },
        auth: {
            login: endpoint
                .post('/api/auth/login')
                .body(object({ email: string(), password: string() }))
                .responses({ 200: object({ token: string() }) })
        },
        admin: { activityLog: endpoint.get('/api/admin/activity') }
    });

    test('returns only the selected groups', () => {
        const picked = pickGroups(api, 'todos', 'auth');

        expect(Object.keys(picked)).toEqual(['todos', 'auth']);
        expect(picked.todos.list).toBe(api.todos.list);
        expect(picked.auth.login).toBe(api.auth.login);
    });

    test('excluded groups are absent at runtime', () => {
        const picked = pickGroups(api, 'todos', 'auth');

        expect(Object.hasOwn(picked, 'admin')).toBe(false);
    });

    test('returns a frozen contract and frozen groups', () => {
        const picked = pickGroups(api, 'todos');

        expect(Object.isFrozen(picked)).toBe(true);
        expect(Object.isFrozen(picked.todos)).toBe(true);
    });

    test('endpoint builders are the same references (not cloned)', () => {
        const picked = pickGroups(api, 'auth');

        expect(picked.auth.login).toBe(api.auth.login);
    });

    test('inferred return type is Pick<T, K> not ApiContract', () => {
        const picked = pickGroups(api, 'todos', 'auth');

        expectTypeOf(picked).toHaveProperty('todos');
        expectTypeOf(picked).toHaveProperty('auth');
        // @ts-expect-error — 'admin' was not picked
        const _admin = picked.admin;
        void _admin;
    });

    test('preserves endpoint metadata through pick', () => {
        const picked = pickGroups(api, 'auth');
        const meta = picked.auth.login.introspect();

        expect(meta.method).toBe('POST');
        expect(meta.basePath).toBe('/api/auth/login');
    });
});

// ---------------------------------------------------------------------------
// omitGroups
// ---------------------------------------------------------------------------

describe('omitGroups', () => {
    const api = defineApi({
        todos: { list: endpoint.get('/api/todos') },
        auth: { login: endpoint.post('/api/auth/login') },
        admin: { activityLog: endpoint.get('/api/admin/activity') },
        debug: { echo: endpoint.post('/api/debug/echo') }
    });

    test('returns all groups except the omitted ones', () => {
        const result = omitGroups(api, 'admin', 'debug');

        expect(Object.keys(result)).toEqual(['todos', 'auth']);
    });

    test('omitted groups are absent at runtime', () => {
        const result = omitGroups(api, 'admin', 'debug');

        expect(Object.hasOwn(result, 'admin')).toBe(false);
        expect(Object.hasOwn(result, 'debug')).toBe(false);
    });

    test('returns a frozen contract and frozen groups', () => {
        const result = omitGroups(api, 'admin', 'debug');

        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.todos)).toBe(true);
        expect(Object.isFrozen(result.auth)).toBe(true);
    });

    test('endpoint builders are the same references (not cloned)', () => {
        const result = omitGroups(api, 'admin', 'debug');

        expect(result.todos.list).toBe(api.todos.list);
    });

    test('inferred return type is Omit<T, K> not ApiContract', () => {
        const result = omitGroups(api, 'admin', 'debug');

        expectTypeOf(result).toHaveProperty('todos');
        expectTypeOf(result).toHaveProperty('auth');
        // @ts-expect-error — 'admin' was omitted
        const _admin = result.admin;
        void _admin;
        // @ts-expect-error — 'debug' was omitted
        const _debug = result.debug;
        void _debug;
    });

    test('omitting no groups returns all groups', () => {
        const result = omitGroups(api);

        expect(Object.keys(result)).toEqual([
            'todos',
            'auth',
            'admin',
            'debug'
        ]);
    });

    test('preserves endpoint metadata through omit', () => {
        const result = omitGroups(api, 'admin', 'debug');
        const meta = result.todos.list.introspect();

        expect(meta.method).toBe('GET');
        expect(meta.basePath).toBe('/api/todos');
    });
});

// ---------------------------------------------------------------------------
// composition: mergeContracts + pickGroups / omitGroups
// ---------------------------------------------------------------------------

describe('composition', () => {
    test('mergeContracts then pickGroups', () => {
        const publicApi = defineApi({
            todos: { list: endpoint.get('/api/todos') },
            auth: { login: endpoint.post('/api/auth/login') }
        });
        const adminApi = defineApi({
            admin: {
                activityLog: endpoint.get('/api/admin/activity')
            }
        });

        const fullApi = mergeContracts(publicApi, adminApi);
        const clientFacingApi = pickGroups(fullApi, 'todos', 'auth');

        expect(Object.keys(clientFacingApi)).toEqual(['todos', 'auth']);
        expect(Object.hasOwn(clientFacingApi, 'admin')).toBe(false);
    });

    test('mergeContracts with shared group then pick the shared group', () => {
        const publicApi = defineApi({
            users: { list: endpoint.get('/api/users') }
        });
        const adminApi = defineApi({
            users: { delete: endpoint.delete('/api/users') }
        });

        const fullApi = mergeContracts(publicApi, adminApi);
        const adminView = pickGroups(fullApi, 'users');

        // Both endpoints visible in admin view
        expect(adminView.users.list).toBe(publicApi.users.list);
        expect(adminView.users.delete).toBe(adminApi.users.delete);
    });
});
