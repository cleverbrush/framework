// @cleverbrush/orm — DbSet
//
// `DbSet<TEntity>` is the typed query starter for an entity, modelled on
// EF Core's `DbSet<TEntity>`. It is structurally an `EntityQuery` whose
// underlying `SchemaQueryBuilder` is allocated lazily on each chain so
// independent chains never share state.
//
// Calling any query method (`.where()`, `.include()`, `.first()`, `.insert()`,
// etc.) on a `DbSet` allocates a fresh `SchemaQueryBuilder` and forwards the
// call to it.  Subsequent calls on the returned `EntityQuery` reuse that
// same underlying builder.

import type {
    Entity,
    EntityRelations,
    EntitySchema
} from '@cleverbrush/knex-schema';
import {
    type SchemaQueryBuilder,
    query as schemaQuery
} from '@cleverbrush/knex-schema';
import type { Knex } from 'knex';

import type { EntityResult, RelKeyTree, WithIncluded } from './result-types.js';

// ---------------------------------------------------------------------------
// EntityQuery — public typed query handle
// ---------------------------------------------------------------------------

/**
 * The typed query handle returned by every {@link DbSet} method that
 * initiates a query (e.g. `.where()`, `.include()`, `.first()`).
 *
 * Structurally it IS a {@link SchemaQueryBuilder} for the entity's schema,
 * with typed `.include()` / `.includeVariant()` methods overlaid. All other
 * `SchemaQueryBuilder` methods are available and `this`-returning chains
 * preserve the typed wrapper.
 *
 * @public
 */
export interface EntityQuery<TEntity extends Entity<any, any>, TResult>
    extends Omit<
        SchemaQueryBuilder<EntitySchema<TEntity>, TResult>,
        'include' | 'includeVariant'
    > {
    /**
     * Eager-load a relation declared on `TEntity` via `.hasOne()` /
     * `.hasMany()` / `.belongsTo()` / `.belongsToMany()`. Selector returns
     * the relation key as a string literal.
     */
    include<K extends keyof EntityRelations<TEntity> & string>(
        sel: (t: RelKeyTree<TEntity>) => K,
        customize?: (q: SchemaQueryBuilder<any, any>) => void
    ): EntityQuery<TEntity, WithIncluded<TEntity, TResult, K>>;

    /**
     * Eager-load a relation declared inside a polymorphic variant (CTI/STI).
     * The relation is only populated on rows whose discriminator matches
     * `variantKey`.
     */
    includeVariant(
        variantKey: string,
        relationName: string,
        customize?: (q: SchemaQueryBuilder<any, any>) => void
    ): EntityQuery<TEntity, TResult>;
}

// ---------------------------------------------------------------------------
// DbSet — public typed query starter
// ---------------------------------------------------------------------------

/**
 * Typed query starter for a registered entity. Structurally it behaves like
 * a fresh {@link EntityQuery} — every method invocation allocates a new
 * underlying `SchemaQueryBuilder` so chains stay isolated.
 *
 * Additional members beyond `EntityQuery`:
 *
 *  - `entity` — the wrapped {@link Entity} definition.
 *  - `query()` — explicit factory for a fresh `EntityQuery` (rarely needed).
 *  - `withTransaction(trx)` — return a new `DbSet` bound to a transaction.
 *
 * @public
 */
export interface DbSet<TEntity extends Entity<any, any>>
    extends EntityQuery<TEntity, EntityResult<TEntity>> {
    /** The wrapped entity definition. */
    readonly entity: TEntity;

    /**
     * Allocate a fresh `EntityQuery` (rarely needed; method shortcuts on the
     * `DbSet` itself already do this).
     */
    query(): EntityQuery<TEntity, EntityResult<TEntity>>;

    /**
     * Return a new {@link DbSet} bound to `trx`. All queries via the returned
     * set execute inside the transaction.
     */
    withTransaction(trx: Knex.Transaction): DbSet<TEntity>;
}

// ---------------------------------------------------------------------------
// Runtime construction
// ---------------------------------------------------------------------------

const ENTITY_KEY_TREE_CACHE = new WeakMap<object, Record<string, string>>();

function getEntityKeyTree(entity: Entity<any, any>): Record<string, string> {
    const cached = ENTITY_KEY_TREE_CACHE.get(entity);
    if (cached) return cached;
    const props =
        (
            entity.schema as {
                introspect?: () => { properties?: Record<string, unknown> };
            }
        ).introspect?.()?.properties ?? {};
    const tree: Record<string, string> = {};
    for (const k of Object.keys(props)) tree[k] = k;
    ENTITY_KEY_TREE_CACHE.set(entity, tree);
    return tree;
}

/**
 * Wrap a `SchemaQueryBuilder` in a Proxy that overlays typed
 * `.include()` / `.includeVariant()` methods and re-wraps `this`-returning
 * methods so chains keep their typed wrapper.
 *
 * @internal
 */
function wrapQuery<TEntity extends Entity<any, any>, TResult>(
    sqb: SchemaQueryBuilder<EntitySchema<TEntity>, TResult>,
    entity: TEntity
): EntityQuery<TEntity, TResult> {
    const proxy: EntityQuery<TEntity, TResult> = new Proxy(
        sqb as unknown as object,
        {
            get(target, prop, receiver) {
                if (prop === 'include') {
                    return (
                        sel: (t: Record<string, string>) => string,
                        customize?: (q: SchemaQueryBuilder<any, any>) => void
                    ) => {
                        const name = sel(getEntityKeyTree(entity));
                        (
                            sqb as unknown as {
                                include: (
                                    n: string,
                                    c?: (
                                        q: SchemaQueryBuilder<any, any>
                                    ) => void
                                ) => void;
                            }
                        ).include(name, customize);
                        return proxy;
                    };
                }
                if (prop === 'includeVariant') {
                    return (
                        variantKey: string,
                        relationName: string,
                        customize?: (q: SchemaQueryBuilder<any, any>) => void
                    ) => {
                        (
                            sqb as unknown as {
                                includeVariant: (
                                    v: string,
                                    r: string,
                                    c?: (
                                        q: SchemaQueryBuilder<any, any>
                                    ) => void
                                ) => void;
                            }
                        ).includeVariant(variantKey, relationName, customize);
                        return proxy;
                    };
                }
                if (prop === '_sqb') return sqb;
                if (prop === '_entity') return entity;

                const value = Reflect.get(target, prop, receiver);
                if (typeof value !== 'function') return value;
                return function (this: unknown, ...args: unknown[]) {
                    const result = (value as Function).apply(sqb, args);
                    // Re-wrap `this`-returning methods so chains keep typing.
                    return result === sqb ? proxy : result;
                };
            }
        }
    ) as unknown as EntityQuery<TEntity, TResult>;
    return proxy;
}

/**
 * Construct a typed {@link DbSet} for an entity, bound to a Knex instance.
 *
 * @internal — use {@link createDb} for normal application code.
 */
export function makeDbSet<TEntity extends Entity<any, any>>(
    knex: Knex,
    entity: TEntity
): DbSet<TEntity> {
    const proxy: DbSet<TEntity> = new Proxy({} as object, {
        get(_target, prop) {
            if (prop === 'entity') return entity;
            if (prop === 'query') {
                return () => {
                    const sqb = schemaQuery(
                        knex,
                        entity.schema as EntitySchema<TEntity>
                    );
                    return wrapQuery(
                        sqb as SchemaQueryBuilder<
                            EntitySchema<TEntity>,
                            EntityResult<TEntity>
                        >,
                        entity
                    );
                };
            }
            if (prop === 'withTransaction') {
                return (trx: Knex.Transaction) =>
                    makeDbSet(trx as unknown as Knex, entity);
            }
            // Any other property/method: allocate a fresh query and
            // forward.  Methods are bound so callers can use `.method(...)`.
            const fresh = schemaQuery(
                knex,
                entity.schema as EntitySchema<TEntity>
            );
            const query = wrapQuery(
                fresh as SchemaQueryBuilder<
                    EntitySchema<TEntity>,
                    EntityResult<TEntity>
                >,
                entity
            );
            const value = (
                query as unknown as Record<string | symbol, unknown>
            )[prop];
            if (typeof value !== 'function') return value;
            return (value as Function).bind(query);
        }
    }) as DbSet<TEntity>;
    return proxy;
}
