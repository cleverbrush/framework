import {
    array,
    lazy,
    number,
    object,
    type SchemaBuilder,
    string,
    union
} from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { SchemaRegistry, walkSchemas } from './schemaRegistry.js';

// ---------------------------------------------------------------------------
// SchemaRegistry
// ---------------------------------------------------------------------------

describe('SchemaRegistry', () => {
    describe('register()', () => {
        it('registers a named schema and makes it retrievable by getName()', () => {
            const registry = new SchemaRegistry();
            const UserSchema = object({ id: number() }).schemaName('User');
            registry.register(UserSchema);
            expect(registry.getName(UserSchema)).toBe('User');
        });

        it('silently skips schemas without a schemaName', () => {
            const registry = new SchemaRegistry();
            const anon = object({ id: number() });
            registry.register(anon);
            expect(registry.getName(anon)).toBeNull();
        });

        it('is idempotent — re-registering the same instance is a no-op', () => {
            const registry = new SchemaRegistry();
            const UserSchema = object({ id: number() }).schemaName('User');
            registry.register(UserSchema);
            expect(() => registry.register(UserSchema)).not.toThrow();
            expect(registry.getName(UserSchema)).toBe('User');
        });

        it('throws when two different instances share the same name', () => {
            const registry = new SchemaRegistry();
            const A = object({ x: string() }).schemaName('Thing');
            const B = object({ y: number() }).schemaName('Thing');
            registry.register(A);
            expect(() => registry.register(B)).toThrow(/Thing/);
        });
    });

    describe('getName()', () => {
        it('returns null for an unregistered schema', () => {
            const registry = new SchemaRegistry();
            expect(registry.getName(string())).toBeNull();
        });

        it('returns the name for a registered schema', () => {
            const registry = new SchemaRegistry();
            const s = string().schemaName('MyString');
            registry.register(s);
            expect(registry.getName(s)).toBe('MyString');
        });
    });

    describe('entries()', () => {
        it('yields all registered [name, schema] pairs', () => {
            const registry = new SchemaRegistry();
            const A = string().schemaName('A');
            const B = number().schemaName('B');
            registry.register(A);
            registry.register(B);
            const entries = [...registry.entries()];
            expect(entries).toHaveLength(2);
            expect(entries.map(([n]) => n)).toEqual(['A', 'B']);
        });

        it('yields nothing when empty', () => {
            const registry = new SchemaRegistry();
            expect([...registry.entries()]).toHaveLength(0);
        });
    });

    describe('isEmpty', () => {
        it('is true for a fresh registry', () => {
            expect(new SchemaRegistry().isEmpty).toBe(true);
        });

        it('is false after a named schema is registered', () => {
            const registry = new SchemaRegistry();
            registry.register(string().schemaName('S'));
            expect(registry.isEmpty).toBe(false);
        });

        it('is true when only unnamed schemas were registered', () => {
            const registry = new SchemaRegistry();
            registry.register(string());
            expect(registry.isEmpty).toBe(true);
        });
    });
});

// ---------------------------------------------------------------------------
// walkSchemas
// ---------------------------------------------------------------------------

describe('walkSchemas', () => {
    it('registers a top-level named schema', () => {
        const registry = new SchemaRegistry();
        const UserSchema = object({ id: number() }).schemaName('User');
        walkSchemas(UserSchema, registry);
        expect(registry.getName(UserSchema)).toBe('User');
    });

    it('recurses into object properties', () => {
        const registry = new SchemaRegistry();
        const AddressSchema = object({ city: string() }).schemaName('Address');
        const UserSchema = object({ address: AddressSchema });
        walkSchemas(UserSchema, registry);
        expect(registry.getName(AddressSchema)).toBe('Address');
    });

    it('recurses into array element schema', () => {
        const registry = new SchemaRegistry();
        const TagSchema = object({ label: string() }).schemaName('Tag');
        walkSchemas(array(TagSchema), registry);
        expect(registry.getName(TagSchema)).toBe('Tag');
    });

    it('recurses into union options', () => {
        const registry = new SchemaRegistry();
        const CatSchema = object({ meow: string() }).schemaName('Cat');
        const DogSchema = object({ bark: string() }).schemaName('Dog');
        walkSchemas(union(CatSchema).or(DogSchema), registry);
        expect(registry.getName(CatSchema)).toBe('Cat');
        expect(registry.getName(DogSchema)).toBe('Dog');
    });

    it('does not visit the same instance twice (cycle safety)', () => {
        const registry = new SchemaRegistry();
        const Shared = object({ x: number() }).schemaName('Shared');
        // Shared appears as both a property value and the root's sibling
        const root = object({ a: Shared, b: Shared });
        expect(() => walkSchemas(root, registry)).not.toThrow();
        expect(registry.getName(Shared)).toBe('Shared');
    });

    it('throws when two different named schemas share a name (conflict)', () => {
        const registry = new SchemaRegistry();
        const A = object({ x: string() }).schemaName('Thing');
        const B = object({ y: number() }).schemaName('Thing');
        const root = object({ a: A, b: B });
        expect(() => walkSchemas(root, registry)).toThrow(/Thing/);
    });

    it('skips lazy schemas without recursing (legacy sentinel test)', () => {
        const registry = new SchemaRegistry();
        // A real LazySchemaBuilder pointing to a simple schema — should not throw
        const lazySchema = lazy(() => string());
        expect(() => walkSchemas(lazySchema, registry)).not.toThrow();
    });

    it('resolves lazy and registers named schema behind the boundary', () => {
        const registry = new SchemaRegistry();
        const Inner = object({ id: number() }).schemaName('Inner');
        const root = object({ child: lazy(() => Inner) });
        walkSchemas(root, registry);
        expect(registry.getName(Inner)).toBe('Inner');
    });

    it('handles self-referential lazy without infinite loop', () => {
        const registry = new SchemaRegistry();
        const treeNode: SchemaBuilder<any, any, any, any, any> = object({
            value: number(),
            children: array(lazy(() => treeNode))
        }).schemaName('TreeNode');
        expect(() => walkSchemas(treeNode, registry)).not.toThrow();
        expect(registry.getName(treeNode)).toBe('TreeNode');
    });
});
