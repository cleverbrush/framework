import { number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import {
    ActionResult,
    createServer,
    defineApi,
    endpoint,
    errorMap,
    implement,
    type Middleware,
    pickGroups
} from './index.js';

const Db = object({ name: string() });
const Mailer = object({ host: string() });
const Principal = object({ userId: string() });
const Message = object({ message: string() });
function contract() {
    return defineApi({
        items: {
            list: endpoint.get('/items').responses({ 200: string() }),
            remove: endpoint
                .delete('/items')
                .responses({ 204: null, 404: Message })
        },
        live: { changes: endpoint.subscription('/changes').outgoing(string()) }
    });
}

describe('contract-bound implementations', () => {
    it('composes split scopes, partial roots and contract slices', () => {
        const api = contract();
        const items = implement(pickGroups(api, 'items')).group('items', {
            inject: { db: Db }
        });
        const reads = items
            .pick('list')
            .withHandlers({ list: (_ctx, { db }) => db.name });
        const writes = items
            .pick('remove')
            .withHandlers({ remove: () => ActionResult.noContent() });
        const feature = implement(api).use(reads, writes);
        const live = implement(api)
            .group('live')
            .withHandlers({
                changes: async function* () {
                    yield 'changed';
                }
            });
        const mapping = implement(api).use(feature, live).complete();
        expect(mapping._entries).toHaveLength(2);
        expect(mapping._subscriptions).toHaveLength(1);
        const server = createServer().handleAll(mapping);
        expect(server.getRegistrations()).toHaveLength(2);
        expect(server.getSubscriptionRegistrations()).toHaveLength(1);
        expect(() => (feature as any).complete()).toThrow('live.changes');
    });

    it('merges injections and preserves all unrelated metadata without mutating the source', () => {
        const source = endpoint
            .post('/upload')
            .authorize(Principal, 'admin')
            .inject({ db: Db, original: Db })
            .body(object({ title: string() }))
            .query(object({ page: number() }))
            .headers(object({ authorization: string() }))
            .responses({ 204: null })
            .upload({ maxFileSize: 1000 })
            .summary('Original')
            .description('Keep me')
            .tags('original')
            .operationId('uploadItem')
            .deprecated()
            .clearsCacheTag('items');
        const api = defineApi({ items: { upload: source } });
        const Replacement = object({ replacement: string() });
        const scope = implement(api).group('items', {
            authorize: Principal,
            inject: { db: Mailer },
            tags: ['shared'],
            operations: {
                upload: {
                    inject: { db: Replacement, mailer: Mailer },
                    summary: 'Configured',
                    tags: ['specific']
                }
            }
        });
        const before = source.introspect();
        const after = scope.endpoints.upload.introspect();
        expect(after.serviceSchemas).toEqual({
            original: Db,
            db: Replacement,
            mailer: Mailer
        });
        expect(after).toEqual({
            ...before,
            summary: 'Configured',
            tags: ['specific'],
            serviceSchemas: after.serviceSchemas
        });
        expect(source.introspect()).toEqual(before);
        expect(Object.isFrozen(scope.endpoints)).toBe(true);
        expect(implement(api).group('items').endpoints.upload).toBe(source);
    });

    it('keeps configuration-only scopes independent and includes endpoint middleware', () => {
        const api = defineApi({ items: { list: endpoint.get('/items') } });
        const scope = implement(api).group('items');
        const middleware: Middleware = async (_ctx, next) => next();
        const middlewares = [middleware];
        const module = scope.withHandlers({
            list: { handler: () => 'ok', middlewares }
        });
        middlewares.length = 0;
        const root = implement(api).use(module);
        expect(root.complete()._entries[0].middlewares).toEqual([middleware]);
        expect(() => (implement(api) as any).complete()).toThrow('items.list');
    });

    it('applies endpoint-checked error policies when binding handlers', async () => {
        class Missing extends Error {}
        const api = defineApi({
            items: {
                remove: endpoint
                    .delete('/items')
                    .responses({ 204: null, 404: Message })
            }
        });
        const scope = implement(api).group('items');
        const errors = errorMap().on(Missing, () =>
            ActionResult.notFound({ message: 'Missing' })
        );
        const module = scope.withHandlers({
            remove: {
                handler: () => {
                    throw new Missing();
                },
                errors
            }
        });
        const mapping = implement(api).use(module).complete();
        expect(await mapping._entries[0].handler({})).toMatchObject({
            status: 404,
            body: { message: 'Missing' }
        });
    });

    it('checks missing, unknown, duplicate and incompatible bindings at runtime', () => {
        const api = contract();
        const root = implement(api);
        const scope = root.group('items');
        const reads = scope.pick('list').withHandlers({ list: () => 'ok' });
        expect(() => (root as any).group('missing')).toThrow(
            'Unknown contract group'
        );
        expect(() =>
            (root as any).group('items', { operations: { missing: {} } })
        ).toThrow('Unknown operation');
        expect(() => (scope as any).pick('missing')).toThrow(
            'Unknown operation'
        );
        expect(() => scope.pick('list', 'list')).toThrow('Duplicate operation');
        expect(() => (scope as any).withHandlers({ list: () => 'ok' })).toThrow(
            'Missing handler items.remove'
        );
        expect(() =>
            (scope as any).withHandlers({ extra: () => null })
        ).toThrow('Unknown handler');
        expect(() => (root as any).use(reads, reads)).toThrow(
            'Duplicate implementation'
        );
        const different = contract();
        const foreign = implement(different)
            .group('items')
            .pick('list')
            .withHandlers({ list: () => 'foreign' });
        expect(() => root.use(foreign)).toThrow('Incompatible source endpoint');
        expect(() => (root as any).use({})).toThrow(
            'Expected an implementation module'
        );
        expect(() =>
            (root.group('live') as any).withHandlers({
                changes: { handler: async function* () {}, errors: errorMap() }
            })
        ).toThrow('HTTP error policies');
    });

    it('treats unusual group and operation names as literal keys, not prototype properties', () => {
        const api = defineApi({
            ['__proto__']: { ['constructor']: endpoint.get('/special') }
        });
        const module = implement(api)
            .group('__proto__')
            .pick('constructor')
            .withHandlers({ constructor: () => 'ok' });
        expect(implement(api).use(module).complete()._entries).toHaveLength(1);
    });
});
