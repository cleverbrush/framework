// @cleverbrush/orm — Result type helpers
//
// Compute the structural shape produced by chaining `.include(...)` /
// `.includeVariant(...)` calls onto a `DbSet`. These types are pure
// type-level helpers — they have no runtime presence.

import type {
    Entity,
    EntityRelations,
    EntitySchema,
    POLYMORPHIC_TYPE_BRAND,
    RelationInfo
} from '@cleverbrush/knex-schema';
import type { InferType, ObjectSchemaBuilder } from '@cleverbrush/schema';

/**
 * The natural result row for a freshly initiated query against an entity.
 *
 * For ordinary entities this is `InferType<EntitySchema<T>>`. For
 * polymorphic entities (declared via `.withVariants()`), this resolves to
 * the discriminated union of all variant rows, so:
 *
 * ```ts
 * const a = await db.activities.find(1);
 * if (a?.type === 'assigned') {
 *     a.assigneeId; // narrowed
 * }
 * ```
 *
 * @public
 */
export type EntityResult<TEntity extends Entity<any, any>> =
    EntitySchema<TEntity> extends {
        readonly [POLYMORPHIC_TYPE_BRAND]?: infer U;
    }
        ? NonNullable<U>
        : InferType<EntitySchema<TEntity>>;

/**
 * Discriminated-union variant rows for a polymorphic entity. Resolves to
 * `never` for non-polymorphic entities.
 *
 * @public
 */
export type EntityResultByVariant<TEntity extends Entity<any, any>> =
    EntitySchema<TEntity> extends {
        readonly [POLYMORPHIC_TYPE_BRAND]?: infer U;
    }
        ? NonNullable<U>
        : never;

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

/**
 * Result type after `.includeVariant(variant, rel)` is applied — adds
 * `Rel` only on the discriminated branch matching `Variant`, leaving
 * other branches untouched.
 *
 * @public
 */
export type WithVariantIncluded<
    TEntity extends Entity<any, any>,
    TResult,
    Variant extends string,
    Rel extends keyof EntityRelations<TEntity> & string
> = TResult extends infer U
    ? U extends Record<string, unknown>
        ? Extract<U, Record<string, Variant>> extends never
            ? U
            : Extract<U, Record<string, Variant>> extends U
              ? U & { [P in Rel]: ResolvedRel<EntityRelations<TEntity>[P]> }
              :
                    | Exclude<U, Extract<U, Record<string, Variant>>>
                    | (Extract<U, Record<string, Variant>> & {
                          [P in Rel]: ResolvedRel<EntityRelations<TEntity>[P]>;
                      })
        : U
    : never;

/**
 * @internal Resolve the entity wrapper that backs a relation's foreign
 * schema, so {@link SaveGraph} can recurse through nested relations.
 */
type EntityFromForeign<F> =
    F extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
        ? Entity<F, any>
        : never;

/**
 * Shape accepted by `DbSet.save(graph)` — a partial of the entity row
 * plus optional nested relation values:
 *
 * - `belongsTo` / `hasOne` relations accept a single nested object.
 * - `hasMany` / `belongsToMany` relations accept an array of nested objects.
 *
 * Each nested object is itself a {@link SaveGraph} of the foreign entity,
 * so `belongsToMany` can pass `{ id }` to attach an existing row, or a
 * full nested graph to create a new row and link it.
 *
 * @public
 */
export type SaveGraph<TEntity extends Entity<any, any>> = Partial<
    EntityResult<TEntity>
> & {
    [K in keyof EntityRelations<TEntity>]?: EntityRelations<TEntity>[K] extends RelationInfo<
        infer Kind,
        infer F
    >
        ? Kind extends 'hasMany' | 'belongsToMany'
            ? ReadonlyArray<SaveGraph<EntityFromForeign<F>>>
            : SaveGraph<EntityFromForeign<F>>
        : never;
};
