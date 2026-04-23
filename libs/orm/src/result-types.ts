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
export type EntityResult<TEntity extends Entity<any, any, any>> =
    TEntity extends Entity<any, any, infer U>
        ? [U] extends [never]
            ? InferType<EntitySchema<TEntity>>
            : U
        : InferType<EntitySchema<TEntity>>;

/**
 * Discriminated-union variant rows for a polymorphic entity. Resolves to
 * `never` for non-polymorphic entities.
 *
 * @public
 */
export type EntityResultByVariant<TEntity extends Entity<any, any, any>> =
    TEntity extends Entity<any, any, infer U>
        ? [U] extends [never]
            ? never
            : U
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
export type RelKeyTree<TEntity extends Entity<any, any, any>> = {
    readonly [K in keyof EntityRelations<TEntity> & string]: K;
};

/**
 * Result type after `.include('rel')` is applied.
 *
 * @public
 */
export type WithIncluded<
    TEntity extends Entity<any, any, any>,
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
    TEntity extends Entity<any, any, any>,
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
 * @internal Extract the branch of a discriminated union whose discriminator
 * property has exactly the literal type `K`. Works without knowing the
 * discriminator property name by scanning all properties of each branch.
 *
 * Example:
 * ```ts
 * // Union = { type: 'assigned'; ... } | { type: 'commented'; ... }
 * ExtractBranch<Union, 'assigned'>  // → { type: 'assigned'; ... }
 * ```
 */
type ExtractBranch<Union, K extends string> = Union extends infer B
    ? {
          [P in keyof B]-?: B[P] extends K
              ? K extends B[P]
                  ? true
                  : never
              : never;
      }[keyof B] extends never
        ? never
        : B
    : never;

/**
 * The concrete result shape for a specific polymorphic variant.
 *
 * For a polymorphic entity that uses `.withVariants()`, resolves to the
 * branch of the discriminated union where the discriminator equals `K`.
 * Resolves to `never` for non-polymorphic entities or unknown keys.
 *
 * @example
 * ```ts
 * type AssignedActivity = VariantResult<typeof ActivityEntity, 'assigned'>;
 * // → { type: 'assigned'; id: number; todoId: number; assigneeId: number; … }
 * ```
 *
 * @public
 */
export type VariantResult<
    TEntity extends Entity<any, any, any>,
    K extends string
> = ExtractBranch<EntityResultByVariant<TEntity>, K>;

/**
 * Write payload for `DbSet.insertVariant(key, payload)`.
 *
 * All columns from the matching variant branch are **optional** (so
 * auto-generated PKs and columns with DB defaults can be omitted), and the
 * discriminator field is **excluded** (it is set automatically from `key`).
 *
 * @example
 * ```ts
 * // Only valid fields for the 'assigned' variant; type-checked at compile time:
 * await db.activities.insertVariant('assigned', {
 *     todoId: 42,
 *     userId: 7,
 *     assigneeId: 9,
 * });
 * ```
 *
 * @public
 */
export type VariantInsertPayload<
    TEntity extends Entity<any, any, any>,
    K extends string
> =
    VariantResult<TEntity, K> extends infer B extends Record<string, unknown>
        ? Omit<
              { [P in keyof B]?: B[P] },
              {
                  [P in keyof B]-?: B[P] extends K
                      ? K extends B[P]
                          ? P
                          : never
                      : never;
              }[keyof B]
          >
        : never;

/**
 * Write payload for `EntityQuery.updateVariant(key, set)`.
 *
 * Same shape as {@link VariantInsertPayload} — partial of the variant
 * branch with the discriminator excluded.
 *
 * @public
 */
export type VariantUpdatePayload<
    TEntity extends Entity<any, any, any>,
    K extends string
> = VariantInsertPayload<TEntity, K>;

/**
 * @internal Re-export ExtractBranch for use in DbSet/EntityQuery types.
 */
export type { ExtractBranch };

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
export type SaveGraph<TEntity extends Entity<any, any, any>> = Partial<
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
