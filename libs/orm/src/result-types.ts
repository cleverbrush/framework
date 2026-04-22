// @cleverbrush/orm — Result type helpers
//
// Compute the structural shape produced by chaining `.include(...)` /
// `.includeVariant(...)` calls onto a `DbSet`. These types are pure
// type-level helpers — they have no runtime presence.

import type {
    Entity,
    EntityRelations,
    EntitySchema,
    RelationInfo
} from '@cleverbrush/knex-schema';
import type { InferType, ObjectSchemaBuilder } from '@cleverbrush/schema';

/**
 * The natural result row for a freshly initiated query against an entity:
 * {@link InferType} of the entity's underlying schema.
 *
 * @public
 */
export type EntityResult<TEntity extends Entity<any, any>> = InferType<
    EntitySchema<TEntity>
>;

/**
 * Project the navigation-property type added by a single relation: arrays
 * for one-to-many / many-to-many, optional singletons for to-one.
 *
 * @public
 */
export type ResolvedRel<R> =
    R extends RelationInfo<infer Kind, infer F>
        ? F extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
            ? Kind extends 'hasMany' | 'belongsToMany'
                ? Array<InferType<F>>
                : InferType<F> | undefined
            : never
        : never;

/**
 * `{ [relName]: relName }` — the accessor object passed to `t => t.relName`
 * selectors on `.include()`. Restricted to the relation keys declared on
 * `TEntity`.
 *
 * @public
 */
export type RelKeyTree<TEntity extends Entity<any, any>> = {
    readonly [K in keyof EntityRelations<TEntity> & string]: K;
};

/**
 * Result type after `.include('rel')` is applied.
 *
 * @public
 */
export type WithIncluded<
    TEntity extends Entity<any, any>,
    TResult,
    K extends keyof EntityRelations<TEntity> & string
> = TResult & { [P in K]: ResolvedRel<EntityRelations<TEntity>[P]> };
