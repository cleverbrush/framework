import {
    number,
    object,
    parseString,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR,
    string
} from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import type { CacheTagPropertyAccessor } from '../src/CacheTag.js';
import {
    computeCacheKey,
    createCacheTagTree,
    serializeTag
} from '../src/CacheTag.js';

// ---------------------------------------------------------------------------
// createCacheTagTree
// ---------------------------------------------------------------------------

describe('createCacheTagTree', () => {
    it('returns a tree with params from a ParseStringSchemaBuilder', () => {
        const ps = parseString(
            object({ id: number() }),
            $t => $t`/todos/${t => t.id}`
        );
        const tree = createCacheTagTree({ paramsSchema: ps });

        const desc = tree.params?.id;
        expect(desc).toBeDefined();
        const inner = (desc as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
        const result = inner.getValue({ params: { id: 42 } });
        expect(result.success).toBe(true);
        expect(result.value).toBe(42);
    });

    it('returns a tree with body', () => {
        const bodySchema = object({ title: string() });
        const tree = createCacheTagTree({ bodySchema });

        const desc = tree.body?.title;
        expect(desc).toBeDefined();
        const inner = (desc as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
        const result = inner.getValue({ body: { title: 'hello' } });
        expect(result.success).toBe(true);
        expect(result.value).toBe('hello');
    });

    it('returns a tree with query', () => {
        const querySchema = object({ page: number() });
        const tree = createCacheTagTree({ querySchema });

        const desc = tree.query?.page;
        expect(desc).toBeDefined();
        const inner = (desc as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
        const result = inner.getValue({ query: { page: 3 } });
        expect(result.success).toBe(true);
        expect(result.value).toBe(3);
    });

    it('returns a tree with headers', () => {
        const headerSchema = object({ 'x-tenant': string() });
        const tree = createCacheTagTree({ headerSchema });

        const desc = tree.headers?.['x-tenant'];
        expect(desc).toBeDefined();
        const inner = (desc as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
        const result = inner.getValue({
            headers: { 'x-tenant': 'acme' }
        });
        expect(result.success).toBe(true);
        expect(result.value).toBe('acme');
    });

    it('omits null schemas', () => {
        const querySchema = object({ search: string() });
        const tree = createCacheTagTree({ querySchema });

        expect(tree.params).toBeUndefined();
        expect(tree.body).toBeUndefined();
        expect(tree.headers).toBeUndefined();
        expect(tree.query?.search).toBeDefined();
    });

    it('works with all schemas populated', () => {
        const ps = parseString(
            object({ id: string() }),
            $t => $t`/todos/${t => t.id}`
        );
        const bodySchema = object({ title: string() });
        const querySchema = object({ filter: string() });
        const headerSchema = object({ 'x-api-key': string() });

        const tree = createCacheTagTree({
            paramsSchema: ps,
            bodySchema,
            querySchema,
            headerSchema
        });

        expect(tree.params?.id).toBeDefined();
        expect(tree.body?.title).toBeDefined();
        expect(tree.query?.filter).toBeDefined();
        expect(tree.headers?.['x-api-key']).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// serializeTag
// ---------------------------------------------------------------------------

describe('serializeTag', () => {
    it('serializes a tag with named property accessors', () => {
        const bodySchema = object({
            id: number(),
            name: string()
        });
        const tree = createCacheTagTree({ bodySchema });

        const definition = serializeTag('todo', {
            id: tree.body?.id,
            fromName: tree.body?.name
        });

        expect(definition.name).toBe('todo');
        expect(Object.keys(definition.properties).sort()).toEqual([
            'fromName',
            'id'
        ]);

        // Accessor for id should extract body.id
        const idResult = definition.properties['id'].getValue({
            params: {},
            body: { id: 123, name: 'test' },
            query: {},
            headers: {}
        });
        expect(idResult.success).toBe(true);
        expect(idResult.value).toBe(123);

        // Accessor for fromName should extract body.name
        const nameResult = definition.properties['fromName'].getValue({
            params: {},
            body: { id: 123, name: 'test' },
            query: {},
            headers: {}
        });
        expect(nameResult.success).toBe(true);
        expect(nameResult.value).toBe('test');
    });

    it('returns a tag with empty properties when no descriptors given', () => {
        const definition = serializeTag('simple', {});
        expect(definition.name).toBe('simple');
        expect(definition.properties).toEqual({});
    });

    it('throws when a value is not a valid property descriptor', () => {
        expect(() =>
            serializeTag('bad', {
                notADescriptor: 'hello'
            })
        ).toThrow(/not a valid.*PropertyDescriptor/);
    });

    it('throws when a value is null', () => {
        expect(() =>
            serializeTag('bad', {
                missing: null
            })
        ).toThrow(/not a valid.*PropertyDescriptor/);
    });

    it('throws when a value is an object without the descriptor symbol', () => {
        expect(() =>
            serializeTag('bad', {
                plain: { foo: 'bar' }
            })
        ).toThrow(/not a valid.*PropertyDescriptor/);
    });
});

// ---------------------------------------------------------------------------
// computeCacheKey
// ---------------------------------------------------------------------------

describe('computeCacheKey', () => {
    function makeTag(
        name: string,
        accessors: Record<string, CacheTagPropertyAccessor>
    ) {
        return { name, properties: accessors };
    }

    function makeConstAccessor(value: unknown): CacheTagPropertyAccessor {
        return {
            getValue: () => ({ success: true, value })
        };
    }

    function makeFailingAccessor(): CacheTagPropertyAccessor {
        return {
            getValue: () => ({ success: false })
        };
    }

    const emptyRoot = {
        params: {},
        body: undefined,
        query: {},
        headers: {}
    };

    it('returns tag name for simple tags with no properties', () => {
        const tag = makeTag('invalidate-all', {});
        expect(computeCacheKey(tag, emptyRoot)).toBe('invalidate-all');
    });

    it('builds key with single property', () => {
        const tag = makeTag('todo', {
            id: makeConstAccessor(42)
        });
        expect(computeCacheKey(tag, emptyRoot)).toBe('todo:id=42');
    });

    it('builds key with multiple properties sorted alphabetically', () => {
        const tag = makeTag('todo', {
            z: makeConstAccessor('last'),
            a: makeConstAccessor('first'),
            m: makeConstAccessor('middle')
        });
        expect(computeCacheKey(tag, emptyRoot)).toBe(
            'todo:a=first,m=middle,z=last'
        );
    });

    it('skips properties where getValue returns success: false', () => {
        const tag = makeTag('todo', {
            id: makeConstAccessor(42),
            optional: makeFailingAccessor()
        });
        expect(computeCacheKey(tag, emptyRoot)).toBe('todo:id=42');
    });

    it('returns tag name when all properties fail', () => {
        const tag = makeTag('todo', {
            a: makeFailingAccessor(),
            b: makeFailingAccessor()
        });
        expect(computeCacheKey(tag, emptyRoot)).toBe('todo');
    });

    it('skips properties with undefined value', () => {
        const tag = makeTag('todo', {
            id: makeConstAccessor(undefined)
        });
        expect(computeCacheKey(tag, emptyRoot)).toBe('todo');
    });

    it('produces stable output for the same inputs', () => {
        const tag = makeTag('todo', {
            id: makeConstAccessor(42),
            name: makeConstAccessor('test')
        });
        const k1 = computeCacheKey(tag, emptyRoot);
        const k2 = computeCacheKey(tag, emptyRoot);
        expect(k1).toBe(k2);
    });
});

// ---------------------------------------------------------------------------
// Integration: createCacheTagTree + serializeTag + computeCacheKey
// ---------------------------------------------------------------------------

describe('integration', () => {
    it('end-to-end: descriptor tree → serialize → compute key', () => {
        const bodySchema = object({
            orgId: number(),
            userId: string()
        });
        const querySchema = object({ filter: string() });

        const tree = createCacheTagTree({ bodySchema, querySchema });

        const definition = serializeTag('resource', {
            orgId: tree.body?.orgId,
            userId: tree.body?.userId,
            filter: tree.query?.filter
        });

        const root = {
            params: {},
            body: { orgId: 10, userId: 'u1' },
            query: { filter: 'active' },
            headers: {}
        };

        const key = computeCacheKey(definition, root);
        // Sorted: filter, orgId, userId
        expect(key).toBe('resource:filter=active,orgId=10,userId=u1');
    });

    it('end-to-end with params and headers', () => {
        const ps = parseString(
            object({ orgId: number(), projectId: string() }),
            $t => $t`/orgs/${t => t.orgId}/projects/${t => t.projectId}`
        );
        const headerSchema = object({ 'x-tenant': string() });

        const tree = createCacheTagTree({
            paramsSchema: ps,
            headerSchema
        });

        const definition = serializeTag('project', {
            orgId: tree.params?.orgId,
            projectId: tree.params?.projectId,
            tenant: tree.headers?.['x-tenant']
        });

        const root = {
            params: { orgId: 42, projectId: 'p1' },
            body: undefined,
            query: {},
            headers: { 'x-tenant': 'acme' }
        };

        const key = computeCacheKey(definition, root);
        // Sorted: orgId, projectId, tenant
        expect(key).toBe('project:orgId=42,projectId=p1,tenant=acme');
    });
});
