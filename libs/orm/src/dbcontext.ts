// @cleverbrush/orm — DbContext
//
// `createDb(knex, { todos: TodoEntity, users: UserEntity })` returns a
// strongly typed context object whose properties are typed `DbSet`s for
// each registered entity.
//
// Pass `{ tracking: true }` as the third argument to get a `TrackedDbContext`
// that adds identity-map tracking, `saveChanges`, `discardChanges`, `reload`,
// `attach`, `detach`, `entry`, and `[Symbol.asyncDispose]`.

import type { Entity } from '@cleverbrush/knex-schema';
import type { Knex } from 'knex';
import {
    ChangeTracker,
    type EntityEntry,
    type EntitySetConfig,
    type SavingChangesHook
} from './change-tracker.js';
import { type DbSet, makeDbSet } from './dbset.js';
import { PendingChangesError } from './errors.js';

/**
 * The map of entity name → entity definition passed to {@link createDb}.
 *
 * @public
 */
export type EntityMap = Record<string, Entity<any, any, any>>;

/**
 * The shape of the context object returned by {@link createDb}: every
 * registered entity becomes a typed `DbSet` property.
 *
 * @public
 */
export type DbContext<TMap extends EntityMap> = {
    readonly [K in keyof TMap]: DbSet<TMap[K]>;
} & {
    /**
     * The underlying Knex instance the context was constructed with.
     */
    readonly knex: Knex;

    /**
     * Run `callback` inside a Knex transaction. The callback receives a new
     * `DbContext` whose `DbSet`s are bound to the transaction.
     */
    transaction<T>(callback: (db: DbContext<TMap>) => Promise<T>): Promise<T>;

    /**
     * Return a new `DbContext` whose `DbSet`s are bound to `trx`. Useful
     * when you already have a Knex transaction in scope.
     */
    withTransaction(trx: Knex.Transaction): DbContext<TMap>;
};

/**
 * Extended context returned when `{ tracking: true }` is passed to
 * {@link createDb}. Adds identity-map tracking, unit-of-work `saveChanges`,
 * and `[Symbol.asyncDispose]` support for `await using` blocks.
 *
 * @public
 */
export type TrackedDbContext<TMap extends EntityMap> = DbContext<TMap> & {
    /**
     * Attach an entity to the identity map so its changes will be tracked.
     * If an entity with the same primary key is already tracked, the existing
     * tracked object is returned (identity-map guarantee).
     *
     * @param entitySetKey — the property name used when registering the entity
     *   (e.g. `'todos'` for `createDb(knex, { todos: TodoEntity })`).
     */
    attach<T extends object>(entitySetKey: string, entity: T): T;

    /**
     * Remove an entity from the identity map. Any subsequent changes to the
     * object will not be persisted by `saveChanges`.
     */
    detach(entity: object): void;

    /**
     * Mark a tracked entity for deletion on the next `saveChanges()` call.
     */
    remove(entity: object): void;

    /**
     * Get the public entry-state view for a tracked entity.
     */
    entry<T extends object>(entity: T): EntityEntry<T>;

    /**
     * Register a callback that is invoked for each changed entry just before
     * the changes are flushed to the database. Use to apply audit fields etc.
     */
    onSavingChanges(hook: SavingChangesHook): void;

    /**
     * Reload a tracked entity from the database, overwriting its current
     * values and refreshing the internal snapshot.
     */
    reload(entity: object): Promise<void>;

    /**
     * Discard all pending changes. Modified entries are reset to their
     * snapshots; Added entries are detached; Deleted entries are restored
     * to `Unchanged`.
     */
    discardChanges(): void;

    /**
     * Flush all pending changes to the database inside a single transaction.
     *
     * @returns Counts of inserted, updated, and deleted rows.
     */
    saveChanges(): Promise<{
        inserted: number;
        updated: number;
        deleted: number;
    }>;

    /**
     * Implements `Symbol.asyncDispose` for `await using` blocks.
     *
     * Throws {@link PendingChangesError} when there are unsaved changes at
     * the time of disposal — callers must call `saveChanges()` or
     * `discardChanges()` before the scope exits.
     */
    [Symbol.asyncDispose](): Promise<void>;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a non-tracking `DbContext` (existing behaviour). */
function buildContext<TMap extends EntityMap>(
    knex: Knex,
    entities: TMap
): DbContext<TMap> {
    const sets = {} as { [K in keyof TMap]: DbSet<TMap[K]> };
    for (const key of Object.keys(entities) as Array<keyof TMap>) {
        sets[key] = makeDbSet(knex, entities[key]) as DbSet<TMap[keyof TMap]>;
    }

    const ctx = {
        ...sets,
        knex,
        withTransaction(trx: Knex.Transaction): DbContext<TMap> {
            return buildContext(trx as unknown as Knex, entities);
        },
        async transaction<T>(
            callback: (db: DbContext<TMap>) => Promise<T>
        ): Promise<T> {
            return knex.transaction(async (trx: Knex.Transaction) => {
                return callback(buildContext(trx as unknown as Knex, entities));
            });
        }
    } satisfies DbContext<TMap>;

    return ctx as DbContext<TMap>;
}

/** Build a tracking `DbContext`. */
function buildTrackedContext<TMap extends EntityMap>(
    knex: Knex,
    entities: TMap,
    tracker: ChangeTracker
): TrackedDbContext<TMap> {
    const sets = {} as { [K in keyof TMap]: DbSet<TMap[K]> };
    for (const key of Object.keys(entities) as Array<keyof TMap>) {
        const entitySetKey = key as string;
        const onResults = (items: unknown[]): unknown[] => {
            return items.map(item => {
                if (item !== null && typeof item === 'object') {
                    return tracker.attach(
                        entitySetKey,
                        item as object,
                        'Unchanged'
                    );
                }
                return item;
            });
        };
        sets[key as keyof TMap] = makeDbSet(
            knex,
            entities[key],
            onResults
        ) as DbSet<TMap[keyof TMap]>;
    }

    const ctx: TrackedDbContext<TMap> = {
        ...(sets as { [K in keyof TMap]: DbSet<TMap[K]> }),
        knex,

        withTransaction(trx: Knex.Transaction): DbContext<TMap> {
            return buildTrackedContext(
                trx as unknown as Knex,
                entities,
                tracker
            );
        },

        async transaction<T>(
            callback: (db: DbContext<TMap>) => Promise<T>
        ): Promise<T> {
            return knex.transaction(async (trx: Knex.Transaction) => {
                return callback(
                    buildTrackedContext(
                        trx as unknown as Knex,
                        entities,
                        tracker
                    )
                );
            });
        },

        attach<T extends object>(entitySetKey: string, entity: T): T {
            return tracker.attach(entitySetKey, entity, 'Unchanged');
        },

        detach(entity: object): void {
            tracker.detach(entity);
        },

        remove(entity: object): void {
            tracker.remove(entity);
        },

        entry<T extends object>(entity: T): EntityEntry<T> {
            return tracker.entry(entity);
        },

        onSavingChanges(hook: SavingChangesHook): void {
            tracker.onSavingChanges(hook);
        },

        async reload(entity: object): Promise<void> {
            return tracker.reload(entity, knex);
        },

        discardChanges(): void {
            tracker.discardChanges();
        },

        async saveChanges(): Promise<{
            inserted: number;
            updated: number;
            deleted: number;
        }> {
            return tracker.saveChanges(knex);
        },

        async [Symbol.asyncDispose](): Promise<void> {
            if (tracker.hasPendingChanges()) {
                const summary = tracker.pendingSummary();
                const count = parseInt(summary.match(/\d+/)?.[0] ?? '1', 10);
                tracker.clear();
                throw new PendingChangesError(count, summary);
            }
            tracker.clear();
        }
    };

    return ctx;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a typed database context.
 *
 * @example
 * ```ts
 * const TodoEntity = defineEntity(TodoSchema)
 *     .belongsTo(t => t.author, l => l.userId, r => r.id);
 *
 * const UserEntity = defineEntity(UserSchema);
 *
 * const db = createDb(knex, { todos: TodoEntity, users: UserEntity });
 *
 * const todo = await db.todos
 *     .where(t => t.id, '=', 42)
 *     .include(t => t.author)
 *     .first();
 *
 * await db.transaction(async dbTrx => {
 *     const u = await dbTrx.users.insert({ email: 'a@b.c', role: 'user', authProvider: 'local', createdAt: new Date() });
 *     await dbTrx.todos.insert({ title: 'Hi', userId: u.id, completed: false, createdAt: new Date(), updatedAt: new Date() });
 * });
 * ```
 *
 * @public
 */
export function createDb<TMap extends EntityMap>(
    knex: Knex,
    entities: TMap,
    opts: { tracking: true }
): TrackedDbContext<TMap>;
export function createDb<TMap extends EntityMap>(
    knex: Knex,
    entities: TMap,
    opts?: { tracking?: false | undefined }
): DbContext<TMap>;
export function createDb<TMap extends EntityMap>(
    knex: Knex,
    entities: TMap,
    opts?: { tracking?: boolean }
): DbContext<TMap> | TrackedDbContext<TMap> {
    if (opts?.tracking) {
        const tracker = new ChangeTracker();
        // Register all entity sets with the tracker
        for (const key of Object.keys(entities)) {
            const cfg: EntitySetConfig = {
                schema: entities[key].schema,
                entitySetKey: key
            };
            tracker.registerEntitySet(cfg);
        }
        return buildTrackedContext(knex, entities, tracker);
    }
    return buildContext(knex, entities);
}
