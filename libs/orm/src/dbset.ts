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
    ColumnRef,
    Entity,
    EntityRelations,
    EntitySchema,
    PrimaryKeyValueOf
} from '@cleverbrush/knex-schema';
import {
    getPrimaryKeyColumns,
    getVariants,
    type SchemaQueryBuilder,
    query as schemaQuery
} from '@cleverbrush/knex-schema';
import type { Knex } from 'knex';

import { EntityNotFoundError } from './errors.js';
import type {
    EntityResult,
    RelKeyTree,
    SaveGraph,
    VariantInsertPayload,
    VariantResult,
    VariantUpdatePayload,
    WithIncluded,
    WithVariantIncluded
} from './result-types.js';
import { saveGraph } from './save-graph.js';
import {
    deleteVariant as _deleteVariant,
    insertVariant as _insertVariant,
    updateVariant as _updateVariant
} from './variant-write.js';

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
export interface EntityQuery<TEntity extends Entity<any, any, any>, TResult>
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
     * `variantKey`. Type-level: when `relationName` is a key of the
     * entity's relations, it appears only on the matching branch of the
     * discriminated-union result; otherwise the result type is unchanged.
     */
    includeVariant<TVariant extends string, TRel extends string>(
        variantKey: TVariant,
        relationName: TRel,
        customize?: (q: SchemaQueryBuilder<any, any>) => void
    ): EntityQuery<
        TEntity,
        TRel extends keyof EntityRelations<TEntity> & string
            ? WithVariantIncluded<TEntity, TResult, TVariant, TRel>
            : TResult
    >;

    /**
     * Look up a single entity by primary key. Returns `undefined` when no
     * row matches.
     *
     * The PK column(s) are resolved automatically from the entity's schema
     * via the `primaryKey` / `hasPrimaryKey` extensions. Composite PKs are
     * passed as a tuple in declaration order:
     *
     * ```ts
     * await db.todos.find(42);                 // single PK
     * await db.userRoles.find([userId, role]); // composite PK
     * ```
     *
     * Any chained `.include()` / `.includeVariant()` calls on this query
     * are honoured by the underlying `SELECT`.
     */
    find(
        pk: PrimaryKeyValueOf<EntitySchema<TEntity>>
    ): Promise<TResult | undefined>;

    /**
     * Like {@link find} but throws {@link EntityNotFoundError} when no row
     * matches.
     */
    findOrFail(pk: PrimaryKeyValueOf<EntitySchema<TEntity>>): Promise<TResult>;

    /**
     * Look up multiple entities by primary key in a single SQL statement.
     * Returns rows in DB order (no ordering guarantee relative to `pks`).
     *
     * For composite PKs each element of `pks` is a tuple matching
     * declaration order. Returns `[]` when `pks` is empty.
     */
    findMany(
        pks: ReadonlyArray<PrimaryKeyValueOf<EntitySchema<TEntity>>>
    ): Promise<TResult[]>;
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
export interface DbSet<TEntity extends Entity<any, any, any>>
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

    /**
     * Persist a nested write graph (root + related entities) in a single
     * transaction. Each node is INSERTed when its primary-key fields are
     * absent and UPDATEd when they are present (composite-PK aware).
     *
     * Topology:
     * - `belongsTo` parents are saved first; their PKs feed the root's FK.
     * - The root row is then written.
     * - `hasOne` / `hasMany` / `belongsToMany` children inherit the root's
     *   PK into their FK column.
     * - `belongsToMany` children may be passed as full nested graphs (new
     *   rows) or as `{ pk: value }` references (link existing rows).
     *
     * If called inside an existing transaction (via `withTransaction`), the
     * outer transaction is reused; otherwise a fresh one is opened and
     * automatically rolled back on failure.
     */
    save(graph: SaveGraph<TEntity>): Promise<EntityResult<TEntity>>;

    /**
     * Return a typed variant view pre-filtered to `variantKey`.
     *
     * Behaves like EF Core's `Set<DerivedType>()`: all reads automatically
     * filter by the discriminator value, and `insert` / `update` / `delete`
     * apply the correct single-table (STI) or two-table (CTI) logic.
     *
     * ```ts
     * const assigned = db.activities.ofVariant('assigned');
     *
     * // Insert a new variant row (discriminator set automatically):
     * await assigned.insert({ todoId: 42, userId: 7, assigneeId: 9 });
     *
     * // Update variant-specific columns for matching rows:
     * await assigned.where(t => t.id, activityId).update({ assigneeId: 10 });
     *
     * // Delete variant rows (CTI: variant table first, then base):
     * await assigned.where(t => t.id, activityId).delete();
     *
     * // Find by PK (result is narrowed to the variant branch):
     * const a = await assigned.find(activityId);
     * // a.type === 'assigned' and a.assigneeId is available
     * ```
     */
    ofVariant<K extends string>(variantKey: K): VariantDbSet<TEntity, K>;
}

// ---------------------------------------------------------------------------
// VariantDbSet — typed view scoped to a single polymorphic variant
// ---------------------------------------------------------------------------

/**
 * A `DbSet`-like handle scoped to a single polymorphic variant (one branch
 * of a discriminated union entity). All reads are automatically pre-filtered
 * by the discriminator; all writes apply the correct STI / CTI logic.
 *
 * Obtain via `DbSet.ofVariant('key')` — analogous to EF Core's
 * `Set<DerivedType>()`.
 *
 * @public
 */
export interface VariantDbSet<
    TEntity extends Entity<any, any, any>,
    K extends string
> extends Omit<
        SchemaQueryBuilder<EntitySchema<TEntity>, VariantResult<TEntity, K>>,
        'include' | 'includeVariant' | 'insert' | 'update' | 'delete' | 'where'
    > {
    // Re-declared so that `this` resolves to `VariantDbSet<TEntity, K>`
    // rather than the raw `SchemaQueryBuilder` (Omit doesn't preserve `this`).
    where(
        column: ColumnRef<EntitySchema<TEntity>>,
        operator: string,
        value: any
    ): this;
    where(column: ColumnRef<EntitySchema<TEntity>>, value: any): this;
    where(raw: Knex.Raw, operator: string, value: any): this;
    where(callback: (builder: Knex.QueryBuilder) => void): this;
    where(record: Record<string, any>): this;
    where(raw: Knex.Raw): this;
    /**
     * Eager-load a relation declared on `TEntity`. Identical to
     * {@link EntityQuery.include}.
     */
    include<R extends keyof EntityRelations<TEntity> & string>(
        sel: (t: RelKeyTree<TEntity>) => R,
        customize?: (q: SchemaQueryBuilder<any, any>) => void
    ): VariantDbSet<TEntity, K>;

    /** Look up a single row by PK, typed to this variant. */
    find(
        pk: PrimaryKeyValueOf<EntitySchema<TEntity>>
    ): Promise<VariantResult<TEntity, K> | undefined>;

    /** Like {@link find} but throws {@link EntityNotFoundError} when absent. */
    findOrFail(
        pk: PrimaryKeyValueOf<EntitySchema<TEntity>>
    ): Promise<VariantResult<TEntity, K>>;

    /** Look up multiple rows by PK, typed to this variant. */
    findMany(
        pks: ReadonlyArray<PrimaryKeyValueOf<EntitySchema<TEntity>>>
    ): Promise<VariantResult<TEntity, K>[]>;

    /**
     * Insert a new variant row. The discriminator is set automatically.
     *
     * For CTI: inserts the base row first, then the variant row (transactional).
     */
    insert(
        payload: VariantInsertPayload<TEntity, K>
    ): Promise<VariantResult<TEntity, K>>;

    /**
     * Update variant-specific columns for rows matched by the current
     * WHERE clause. For CTI, only the variant table is updated.
     */
    update(patch: VariantUpdatePayload<TEntity, K>): Promise<void>;

    /** Delete rows matched by the current WHERE clause (CTI: atomic). */
    delete(): Promise<void>;

    /** Return a new variant view bound to `trx`. */
    withTransaction(trx: Knex.Transaction): VariantDbSet<TEntity, K>;
}

// ---------------------------------------------------------------------------
// Runtime construction
// ---------------------------------------------------------------------------

const ENTITY_KEY_TREE_CACHE = new WeakMap<object, Record<string, string>>();

function getEntityKeyTree(
    entity: Entity<any, any, any>
): Record<string, string> {
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
 * Extract the Knex instance from a `SchemaQueryBuilder`.
 * SchemaQueryBuilder stores it as `#knex` (private), but the `query()`
 * factory function passes it as the first constructor argument.
 * We retrieve it via the `.toQuery()` builder's knex client reference.
 * @internal
 */

/**
 * Wrap a `SchemaQueryBuilder` in a Proxy that overlays typed
 * `.include()` / `.includeVariant()` methods and re-wraps `this`-returning
 * methods so chains keep their typed wrapper.
 *
 * @internal
 */
function wrapQuery<TEntity extends Entity<any, any, any>, TResult>(
    sqb: SchemaQueryBuilder<EntitySchema<TEntity>, TResult>,
    entity: TEntity,
    _knexInst: Knex,
    onResults?: (items: unknown[]) => unknown[] | undefined
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

                if (
                    prop === 'find' ||
                    prop === 'findOrFail' ||
                    prop === 'findMany'
                ) {
                    return makeFindMethod(
                        prop as 'find' | 'findOrFail' | 'findMany',
                        sqb as unknown as SchemaQueryBuilder<any, any>,
                        entity,
                        proxy as unknown as EntityQuery<TEntity, TResult>
                    );
                }

                // Guard: block direct update/delete/insert on polymorphic
                // entities — callers must use db.set.ofVariant('key').op().
                if (
                    prop === 'update' ||
                    prop === 'delete' ||
                    prop === 'insert'
                ) {
                    if (getVariants((entity as any).schema)) {
                        return () => {
                            throw new Error(
                                `${String(prop)}() cannot be called directly on a polymorphic entity set. ` +
                                    `Use db.set.ofVariant('key').${String(prop)}() instead.`
                            );
                        };
                    }
                }

                const value = Reflect.get(target, prop, receiver);
                if (typeof value !== 'function') return value;
                return function (this: unknown, ...args: unknown[]) {
                    const result = (value as Function).apply(sqb, args);
                    // Re-wrap `this`-returning methods so chains keep typing.
                    if (result === sqb) return proxy;
                    // Wrap Promise results to auto-attach tracked entities.
                    if (
                        onResults != null &&
                        result != null &&
                        typeof (result as any).then === 'function'
                    ) {
                        return (result as Promise<unknown>).then(
                            (resolved: unknown) => {
                                if (Array.isArray(resolved)) {
                                    const entities = resolved.filter(
                                        r =>
                                            r !== null &&
                                            r !== undefined &&
                                            typeof r === 'object'
                                    );
                                    if (entities.length > 0) {
                                        const mapped = onResults(entities);
                                        if (mapped) {
                                            const entityToMapped = new Map<
                                                unknown,
                                                unknown
                                            >();
                                            for (
                                                let i = 0;
                                                i < entities.length;
                                                i++
                                            ) {
                                                entityToMapped.set(
                                                    entities[i],
                                                    mapped[i]
                                                );
                                            }
                                            return resolved.map(
                                                r => entityToMapped.get(r) ?? r
                                            );
                                        }
                                    }
                                } else if (
                                    resolved !== null &&
                                    resolved !== undefined &&
                                    typeof resolved === 'object'
                                ) {
                                    const mapped = onResults([resolved]);
                                    if (mapped && mapped.length > 0)
                                        return mapped[0];
                                }
                                return resolved;
                            }
                        );
                    }
                    return result;
                };
            }
        }
    ) as unknown as EntityQuery<TEntity, TResult>;
    return proxy;
}

// ---------------------------------------------------------------------------
// find / findOrFail / findMany
// ---------------------------------------------------------------------------

/**
 * Build the runtime implementation of `find` / `findOrFail` / `findMany`
 * for a given underlying `SchemaQueryBuilder` and entity.
 *
 * Honours composite primary keys; `pks`/`pk` are accepted as either scalars
 * (single-column PK) or tuples (composite PK).
 *
 * @internal
 */
function makeFindMethod<TEntity extends Entity<any, any, any>>(
    method: 'find' | 'findOrFail' | 'findMany',
    sqb: SchemaQueryBuilder<any, any>,
    entity: TEntity,
    proxy: EntityQuery<TEntity, unknown>
): (...args: unknown[]) => Promise<unknown> {
    return async (...args: unknown[]): Promise<unknown> => {
        const pkInfo = getPrimaryKeyColumns(
            entity.schema as Parameters<typeof getPrimaryKeyColumns>[0]
        );
        if (pkInfo.propertyKeys.length === 0) {
            throw new Error(
                `${method}(): entity has no primary key declared. ` +
                    `Use \`.primaryKey()\` on a column or \`.hasPrimaryKey([...])\` on the schema.`
            );
        }
        const propertyKeys = pkInfo.propertyKeys;
        const isComposite = propertyKeys.length > 1;
        const tableName =
            (
                entity.schema as {
                    getExtension?: (k: string) => unknown;
                }
            ).getExtension?.('tableName') ?? '<entity>';
        const entityLabel = String(tableName);

        const applyPkFilter = (pk: unknown): void => {
            const tuple = normalisePkTuple(pk, isComposite, method);
            if (tuple.length !== propertyKeys.length) {
                throw new Error(
                    `${method}(): expected ${propertyKeys.length} primary-key value(s), got ${tuple.length}.`
                );
            }
            for (let i = 0; i < propertyKeys.length; i++) {
                (
                    proxy as unknown as {
                        andWhere: (
                            col: string,
                            op: string,
                            val: unknown
                        ) => void;
                    }
                ).andWhere(propertyKeys[i], '=', tuple[i]);
            }
        };

        if (method === 'findMany') {
            const pks = (args[0] ?? []) as ReadonlyArray<unknown>;
            if (!Array.isArray(pks)) {
                throw new Error(
                    'findMany(): expected an array of primary-key values.'
                );
            }
            if (pks.length === 0) return [];
            if (!isComposite) {
                const propKey = propertyKeys[0];
                const tuples = pks.map(p =>
                    normalisePkTuple(p, false, 'findMany')
                );
                (
                    proxy as unknown as {
                        whereIn: (
                            col: string,
                            vals: readonly unknown[]
                        ) => void;
                    }
                ).whereIn(
                    propKey,
                    tuples.map(t => t[0])
                );
                return await (
                    proxy as unknown as { execute: () => Promise<unknown[]> }
                ).execute();
            }
            // Composite PK — emit OR-grouped predicates. We must use
            // COLUMN names (not property names) here because the inner
            // knex `apply()` callback bypasses SchemaQueryBuilder's
            // property-to-column translation.
            const columnNames = pkInfo.columnNames;
            (
                sqb as unknown as {
                    apply: (fn: (qb: Knex.QueryBuilder) => void) => void;
                }
            ).apply(qb => {
                qb.andWhere(function (this: Knex.QueryBuilder) {
                    for (const pk of pks) {
                        const tuple = normalisePkTuple(pk, true, 'findMany');
                        this.orWhere(function (this: Knex.QueryBuilder) {
                            for (let i = 0; i < columnNames.length; i++) {
                                this.andWhere(columnNames[i], tuple[i] as any);
                            }
                        });
                    }
                });
            });
            return await (
                proxy as unknown as { execute: () => Promise<unknown[]> }
            ).execute();
        }

        // find / findOrFail
        applyPkFilter(args[0]);
        const row = await (
            proxy as unknown as {
                first: () => Promise<unknown | undefined>;
            }
        ).first();
        if (row === undefined && method === 'findOrFail') {
            throw new EntityNotFoundError(entityLabel, args[0]);
        }
        return row;
    };
}

/**
 * Normalise a `find` / `findMany` PK argument to a tuple of values.
 * Single-column PKs accept either a scalar or a length-1 tuple; composite
 * PKs require a tuple.
 *
 * @internal
 */
function normalisePkTuple(
    pk: unknown,
    isComposite: boolean,
    method: string
): readonly unknown[] {
    if (isComposite) {
        if (!Array.isArray(pk)) {
            throw new Error(
                `${method}(): composite primary key requires a tuple argument.`
            );
        }
        return pk as readonly unknown[];
    }
    if (Array.isArray(pk)) return pk as readonly unknown[];
    return [pk];
}

/**
 * Construct a typed {@link DbSet} for an entity, bound to a Knex instance.
 *
 * @internal — use {@link createDb} for normal application code.
 */
export function makeDbSet<TEntity extends Entity<any, any, any>>(
    knex: Knex,
    entity: TEntity,
    onResults?: (items: unknown[]) => unknown[] | undefined
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
                        entity,
                        knex,
                        onResults
                    );
                };
            }
            if (prop === 'withTransaction') {
                return (trx: Knex.Transaction) =>
                    makeDbSet(trx as unknown as Knex, entity, onResults);
            }
            if (prop === 'save') {
                return (graph: Record<string, unknown>) => {
                    // If `knex` is already a transaction handle (from
                    // `withTransaction`), reuse it; otherwise saveGraph
                    // opens a fresh transaction internally.
                    const maybeTrx = (
                        knex as unknown as { isTransaction?: boolean }
                    ).isTransaction
                        ? (knex as unknown as Knex.Transaction)
                        : undefined;
                    return saveGraph(
                        knex,
                        entity.schema,
                        graph,
                        maybeTrx
                    ) as Promise<unknown>;
                };
            }
            if (prop === 'ofVariant') {
                return (variantKey: string) => {
                    if (!getVariants((entity as any).schema)) {
                        throw new Error(
                            `ofVariant(): entity schema is not polymorphic (no variants declared).`
                        );
                    }
                    return makeVariantDbSet(
                        knex,
                        entity,
                        variantKey,
                        onResults
                    );
                };
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
                entity,
                knex,
                onResults
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

// ---------------------------------------------------------------------------
// VariantDbSet runtime
// ---------------------------------------------------------------------------

/**
 * Wrap an SQB (which must already have `selectVariants([variantKey])` applied)
 * in a proxy that routes `insert`, `update`, and `delete` through the
 * variant-aware helpers, and re-wraps `this`-returning chain methods so that
 * chains stay within the variant proxy rather than escaping to a plain
 * `SchemaQueryBuilder`.
 *
 * @internal
 */
function wrapVariantQuery<
    TEntity extends Entity<any, any, any>,
    K extends string
>(
    sqb: SchemaQueryBuilder<EntitySchema<TEntity>, VariantResult<TEntity, K>>,
    entity: TEntity,
    variantKey: K,
    knexInst: Knex,
    onResults?: (items: unknown[]) => unknown[] | undefined
): VariantDbSet<TEntity, K> {
    const proxy: VariantDbSet<TEntity, K> = new Proxy(
        sqb as unknown as object,
        {
            get(target, prop, receiver) {
                // --- Typed include override (same as wrapQuery) ---
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
                        vk: string,
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
                        ).includeVariant(vk, relationName, customize);
                        return proxy;
                    };
                }

                if (prop === '_sqb') return sqb;
                if (prop === '_entity') return entity;

                // --- find* delegated to the shared helper ---
                if (
                    prop === 'find' ||
                    prop === 'findOrFail' ||
                    prop === 'findMany'
                ) {
                    return makeFindMethod(
                        prop as 'find' | 'findOrFail' | 'findMany',
                        sqb as unknown as SchemaQueryBuilder<any, any>,
                        entity,
                        proxy as unknown as EntityQuery<
                            TEntity,
                            VariantResult<TEntity, K>
                        >
                    );
                }

                // --- Variant-aware insert ---
                if (prop === 'insert') {
                    return async (
                        payload: Record<string, unknown>
                    ): Promise<unknown> => {
                        const maybeTrx = (
                            knexInst as unknown as { isTransaction?: boolean }
                        ).isTransaction
                            ? (knexInst as unknown as Knex.Transaction)
                            : undefined;
                        const result = await _insertVariant(
                            knexInst,
                            entity.schema,
                            variantKey,
                            payload,
                            maybeTrx
                        );
                        if (
                            onResults &&
                            result != null &&
                            typeof result === 'object'
                        ) {
                            onResults([result]);
                        }
                        return result;
                    };
                }

                // --- Variant-aware update (collect PKs first, then UPDATE) ---
                if (prop === 'update') {
                    return async (
                        set: Record<string, unknown>
                    ): Promise<void> => {
                        const pkInfo = getPrimaryKeyColumns(
                            entity.schema as Parameters<
                                typeof getPrimaryKeyColumns
                            >[0]
                        );
                        const rows = (await (
                            proxy as unknown as {
                                execute: () => Promise<
                                    Array<Record<string, unknown>>
                                >;
                            }
                        ).execute()) as Array<Record<string, unknown>>;
                        const pkProp = pkInfo.propertyKeys[0];
                        const pkValues = rows
                            .map(r => r[pkProp])
                            .filter(v => v !== undefined);
                        const maybeTrx = (
                            knexInst as unknown as { isTransaction?: boolean }
                        ).isTransaction
                            ? (knexInst as unknown as Knex.Transaction)
                            : undefined;
                        await _updateVariant(
                            knexInst,
                            entity.schema,
                            variantKey,
                            set,
                            pkValues,
                            maybeTrx
                        );
                    };
                }

                // --- Variant-aware delete (collect PKs first, then DELETE) ---
                if (prop === 'delete') {
                    return async (): Promise<void> => {
                        const pkInfo = getPrimaryKeyColumns(
                            entity.schema as Parameters<
                                typeof getPrimaryKeyColumns
                            >[0]
                        );
                        const rows = (await (
                            proxy as unknown as {
                                execute: () => Promise<
                                    Array<Record<string, unknown>>
                                >;
                            }
                        ).execute()) as Array<Record<string, unknown>>;
                        const pkProp = pkInfo.propertyKeys[0];
                        const pkValues = rows
                            .map(r => r[pkProp])
                            .filter(v => v !== undefined);
                        const maybeTrx = (
                            knexInst as unknown as { isTransaction?: boolean }
                        ).isTransaction
                            ? (knexInst as unknown as Knex.Transaction)
                            : undefined;
                        await _deleteVariant(
                            knexInst,
                            entity.schema,
                            variantKey,
                            pkValues,
                            maybeTrx
                        );
                    };
                }

                // --- Catch-all: forward to SQB; re-wrap this-returning calls ---
                const value = Reflect.get(target, prop, receiver);
                if (typeof value !== 'function') return value;
                return function (this: unknown, ...args: unknown[]) {
                    const result = (value as Function).apply(sqb, args);
                    if (result === sqb) return proxy;
                    if (
                        onResults != null &&
                        result != null &&
                        typeof (result as any).then === 'function'
                    ) {
                        return (result as Promise<unknown>).then(
                            (resolved: unknown) => {
                                if (Array.isArray(resolved)) {
                                    const entities = resolved.filter(
                                        r =>
                                            r !== null &&
                                            r !== undefined &&
                                            typeof r === 'object'
                                    );
                                    if (entities.length > 0) {
                                        const mapped = onResults(entities);
                                        if (mapped) {
                                            const entityToMapped = new Map<
                                                unknown,
                                                unknown
                                            >();
                                            for (
                                                let i = 0;
                                                i < entities.length;
                                                i++
                                            ) {
                                                entityToMapped.set(
                                                    entities[i],
                                                    mapped[i]
                                                );
                                            }
                                            return resolved.map(
                                                r => entityToMapped.get(r) ?? r
                                            );
                                        }
                                    }
                                } else if (
                                    resolved !== null &&
                                    resolved !== undefined &&
                                    typeof resolved === 'object'
                                ) {
                                    const mapped = onResults([resolved]);
                                    if (mapped && mapped.length > 0)
                                        return mapped[0];
                                }
                                return resolved;
                            }
                        );
                    }
                    return result;
                };
            }
        }
    ) as unknown as VariantDbSet<TEntity, K>;
    return proxy;
}

/**
 * Construct a typed {@link VariantDbSet} scoped to `variantKey`.
 *
 * Every method invocation allocates a fresh `SchemaQueryBuilder` with
 * `selectVariants([variantKey])` pre-applied so that reads are automatically
 * filtered to the correct discriminator value.
 *
 * @internal — obtain via `DbSet.ofVariant('key')`.
 */
function makeVariantDbSet<
    TEntity extends Entity<any, any, any>,
    K extends string
>(
    knex: Knex,
    entity: TEntity,
    variantKey: K,
    onResults?: (items: unknown[]) => unknown[] | undefined
): VariantDbSet<TEntity, K> {
    const proxy: VariantDbSet<TEntity, K> = new Proxy({} as object, {
        get(_target, prop) {
            if (prop === 'withTransaction') {
                return (trx: Knex.Transaction) =>
                    makeVariantDbSet(
                        trx as unknown as Knex,
                        entity,
                        variantKey,
                        onResults
                    );
            }
            // Allocate a fresh SQB with the variant filter baked in, then
            // wrap it in the variant-aware query proxy.
            const fresh = schemaQuery(
                knex,
                entity.schema as EntitySchema<TEntity>
            );
            (
                fresh as unknown as {
                    selectVariants?: (keys: string[]) => void;
                }
            ).selectVariants?.([variantKey]);
            const query = wrapVariantQuery(
                fresh as SchemaQueryBuilder<
                    EntitySchema<TEntity>,
                    VariantResult<TEntity, K>
                >,
                entity,
                variantKey,
                knex,
                onResults
            );
            const value = (
                query as unknown as Record<string | symbol, unknown>
            )[prop];
            if (typeof value !== 'function') return value;
            return (value as Function).bind(query);
        }
    }) as VariantDbSet<TEntity, K>;
    return proxy;
}
