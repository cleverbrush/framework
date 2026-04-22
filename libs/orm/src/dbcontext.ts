// @cleverbrush/orm — DbContext
//
// `createDb(knex, { todos: TodoEntity, users: UserEntity })` returns a
// strongly typed context object whose properties are typed `DbSet`s for
// each registered entity.

import type { Entity } from '@cleverbrush/knex-schema';
import type { Knex } from 'knex';

import { type DbSet, makeDbSet } from './dbset.js';

/**
 * The map of entity name → entity definition passed to {@link createDb}.
 *
 * @public
 */
export type EntityMap = Record<string, Entity<any, any>>;

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
            return createDb(trx as unknown as Knex, entities);
        },
        async transaction<T>(
            callback: (db: DbContext<TMap>) => Promise<T>
        ): Promise<T> {
            return knex.transaction(async (trx: Knex.Transaction) => {
                return callback(createDb(trx as unknown as Knex, entities));
            });
        }
    } satisfies DbContext<TMap>;

    return ctx as DbContext<TMap>;
}
