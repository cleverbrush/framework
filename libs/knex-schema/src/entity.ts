// @cleverbrush/knex-schema — Entity wrapper
//
// Provides a typed wrapper around an ObjectSchemaBuilder that tracks
// declared relations as a real generic parameter (TRels). Unlike the
// brand-based approach, TRels survives method chaining because we own
// every method's return type.
//
// Relations are still stored at runtime in the schema's `relations`
// extension (compatible with the existing query/include implementation).

import {
    type ArraySchemaBuilder,
    ObjectSchemaBuilder,
    type PropertyDescriptorTree,
    type SchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';

// ---------------------------------------------------------------------------
// Type-level helpers
// ---------------------------------------------------------------------------

/**
 * Phantom info for a single declared relation, stored on `Entity`'s `TRels`
 * generic. `TForeign` is captured so `.include()` can type the customize
 * callback against the correct foreign schema.
 *
 * @public
 */
export interface RelationInfo<
    TKind extends 'belongsTo' | 'hasOne' | 'hasMany' | 'belongsToMany' = any,
    TForeign extends ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    > = ObjectSchemaBuilder<any, any, any, any, any, any, any>
> {
    readonly kind: TKind;
    readonly foreign: TForeign;
}

/**
 * Extract the property record `{ [name]: SchemaBuilder }` from any
 * `ObjectSchemaBuilder` regardless of variance positions.
 *
 * @public
 */
export type SchemaProps<T> =
    T extends ObjectSchemaBuilder<infer P, any, any, any, any, any, any>
        ? P
        : never;

/**
 * Strips the `withExtensions()` overlay from a schema type, reducing it to a
 * plain `ObjectSchemaBuilder<TProps, TReq>` so `PropertyDescriptorTree<...>`
 * resolves without hitting TypeScript's recursion depth limit.
 *
 * @internal
 */
type EntitySchemaBase<
    T extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> =
    T extends ObjectSchemaBuilder<infer P, infer Req, any, any, any, any, any>
        ? ObjectSchemaBuilder<P, Req>
        : never;

/**
 * `PropertyDescriptorTree` overlay that pins each top-level property's
 * literal `propertyName` into its descriptor. Required because
 * `PropertyDescriptorTree` widens `propertyName` to `string` for sub-trees
 * whose property is itself an `ObjectSchemaBuilder` (since
 * `PropertyDescriptorTree` lacks a `TPropertyKey` generic).
 *
 * @internal
 */
type EntityTree<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = PropertyDescriptorTree<
    EntitySchemaBase<TSchema>,
    EntitySchemaBase<TSchema>
> & {
    readonly [K in keyof SchemaProps<TSchema> & string]: {
        readonly [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
            readonly propertyName: K;
        };
    };
};

/**
 * Selector callback that receives a real {@link PropertyDescriptorTree} so
 * `t => t.someProp` navigates to the property definition and preserves its
 * JSDoc in IDE tooltips. The return shape is matched structurally on the
 * `[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR].propertyName` field, which captures
 * the literal property key as `TKey`.
 *
 * @public
 */
export type EntityPropSelector<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TKey extends string = string
> = (t: EntityTree<TSchema>) => {
    readonly [SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR]: {
        readonly propertyName: TKey;
    };
};

/**
 * Peel `.optional()` / `array(...)` wrappers off a navigation property's
 * schema to recover the underlying foreign `ObjectSchemaBuilder`.
 *
 * @public
 */
export type UnwrapNavSchema<TProp> =
    TProp extends ArraySchemaBuilder<infer TEl, any, any, any>
        ? TEl extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
            ? TEl
            : never
        : TProp extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
          ? TProp
          : TProp extends SchemaBuilder<infer T, any, any, any, any>
            ? T extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
                ? T
                : never
            : never;

/**
 * Return type for an Entity method that adds a relation: keeps `TSchema`,
 * extends `TRels` with one more entry.
 *
 * @public
 */
export type WithRelation<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TRels extends Record<string, RelationInfo>,
    TKey extends string,
    TKind extends 'belongsTo' | 'hasOne' | 'hasMany' | 'belongsToMany',
    TForeign extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = Entity<TSchema, TRels & Record<TKey, RelationInfo<TKind, TForeign>>>;

// ---------------------------------------------------------------------------
// Variant input shape (no `storage` field — derived from { entity } vs { schema })
// ---------------------------------------------------------------------------

/**
 * One variant entry passed to {@link Entity.withVariants}. Two shapes:
 *
 * - `{ entity, foreignKey }` — Class Table Inheritance: variant has its own
 *   table (described by an Entity wrapper) joined back via `foreignKey`.
 * - `{ schema }` — Single Table Inheritance: extra columns merged onto the
 *   base table, no separate table.
 *
 * @public
 */
export type EntityVariantInput<
    _TBase extends ObjectSchemaBuilder<any, any, any, any, any, any, any> = any
> =
    | {
          entity: Entity<
              ObjectSchemaBuilder<any, any, any, any, any, any, any>,
              any
          >;
          foreignKey: (t: any) => any;
          allowOrphan?: boolean;
      }
    | {
          schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>;
          enforceCheck?: boolean;
      };

/**
 * @internal Extract the relations record from a variant's entity (if any).
 */
type VariantRels<V> = V extends {
    entity: Entity<any, infer R>;
}
    ? R
    : {};

/**
 * @internal Union of all variant entities' `TRels` merged into one map.
 */
type MergedVariantRels<TVariants> = UnionToIntersection<
    {
        [K in keyof TVariants]: VariantRels<TVariants[K]>;
    }[keyof TVariants]
>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never;

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------

/**
 * A typed wrapper around an `ObjectSchemaBuilder` that tracks declared
 * relations in its `TRels` generic. Use {@link defineEntity} to create one.
 *
 * Relations are declared via `.hasOne()` / `.hasMany()` / `.belongsTo()` /
 * `.belongsToMany()` on the entity (NOT on the underlying schema). Each
 * call returns a new `Entity` whose `TRels` includes the new relation, so
 * `query(db, entity).include(t => t.assignee)` is fully typed.
 *
 * @public
 */
export class Entity<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TRels extends Record<string, RelationInfo> = {}
> {
    /** The underlying schema (relations registered via `withExtension('relations', ...)`). */
    readonly schema: TSchema;

    /** @internal Phantom slot to retain `TRels` in inferred types. */
    declare readonly __relations__: TRels;

    constructor(schema: TSchema) {
        this.schema = schema;
    }

    private _addRelation(spec: {
        type: 'belongsTo' | 'hasOne' | 'hasMany' | 'belongsToMany';
        name: string;
        schema: any;
        foreignKey?: any;
        through?: { table: string; localKey: string; foreignKey: string };
        optional?: boolean;
    }): Entity<TSchema, any> {
        const existing =
            ((this.schema as any).getExtension?.('relations') as any[]) ?? [];
        const next = (this.schema as any).withExtension('relations', [
            ...existing,
            spec
        ]);
        return new Entity(next);
    }

    /**
     * Declare a one-to-one relation where the FK lives on the FOREIGN table.
     * `navSel` selects the navigation property on THIS schema (must hold the
     * foreign schema, typically `.optional()`). The foreign schema is
     * auto-resolved at runtime from that property; provided explicitly here
     * via `opts.foreign` only when peeling fails.
     *
     * @param navSel    Selector of nav property: `t => t.author`
     * @param localSel  Selector of local-side join key: `l => l.id`
     * @param remoteSel Selector of remote-side FK on foreign schema: `r => r.userId`
     * @param opts      Optional `{ optional?: boolean }` (default false).
     */
    hasOne<
        TKey extends keyof SchemaProps<TSchema> & string,
        TForeign extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        > = UnwrapNavSchema<SchemaProps<TSchema>[TKey]>
    >(
        navSel: EntityPropSelector<TSchema, TKey>,
        _localSel: EntityPropSelector<TSchema>,
        remoteSel: EntityPropSelector<TForeign>,
        opts?: { optional?: boolean }
    ): WithRelation<TSchema, TRels, TKey, 'hasOne', TForeign> {
        const navName = this._resolvePropName(
            navSel as EntityPropSelector<TSchema>,
            this.schema
        );
        const foreignSchema = this._resolveForeignSchema(navName);
        const remoteKey = this._resolvePropName(
            remoteSel as EntityPropSelector<any>,
            foreignSchema
        );
        // For hasOne the FK is on the FOREIGN table → store remoteKey.
        return this._addRelation({
            type: 'hasOne',
            name: navName,
            schema: foreignSchema,
            foreignKey: remoteKey,
            optional: opts?.optional
        }) as any;
    }

    /**
     * Declare a one-to-many relation where the FK lives on the FOREIGN table.
     *
     * @param navSel    Selector of nav array property: `t => t.posts`
     * @param localSel  Selector of local-side join key: `l => l.id`
     * @param remoteSel Selector of remote-side FK on foreign schema: `r => r.userId`
     */
    hasMany<
        TKey extends keyof SchemaProps<TSchema> & string,
        TForeign extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        > = UnwrapNavSchema<SchemaProps<TSchema>[TKey]>
    >(
        navSel: EntityPropSelector<TSchema, TKey>,
        _localSel: EntityPropSelector<TSchema>,
        remoteSel: EntityPropSelector<TForeign>
    ): WithRelation<TSchema, TRels, TKey, 'hasMany', TForeign> {
        const navName = this._resolvePropName(
            navSel as EntityPropSelector<TSchema>,
            this.schema
        );
        const foreignSchema = this._resolveForeignSchema(navName);
        const remoteKey = this._resolvePropName(
            remoteSel as EntityPropSelector<any>,
            foreignSchema
        );
        return this._addRelation({
            type: 'hasMany',
            name: navName,
            schema: foreignSchema,
            foreignKey: remoteKey
        }) as any;
    }

    /**
     * Declare a many-to-one relation where the FK lives on THIS table.
     *
     * @param navSel    Selector of nav property (foreign schema, usually `.optional()`).
     * @param localSel  Selector of local-side FK property: `l => l.userId`
     * @param remoteSel Selector of foreign-side PK property: `r => r.id`
     */
    belongsTo<
        TKey extends keyof SchemaProps<TSchema> & string,
        TForeign extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        > = UnwrapNavSchema<SchemaProps<TSchema>[TKey]>
    >(
        navSel: EntityPropSelector<TSchema, TKey>,
        localSel: EntityPropSelector<TSchema>,
        _remoteSel: EntityPropSelector<TForeign>,
        opts?: { optional?: boolean }
    ): WithRelation<TSchema, TRels, TKey, 'belongsTo', TForeign> {
        const navName = this._resolvePropName(
            navSel as EntityPropSelector<TSchema>,
            this.schema
        );
        const foreignSchema = this._resolveForeignSchema(navName);
        const localKey = this._resolvePropName(localSel, this.schema);
        // For belongsTo the FK is on THIS table → store localKey.
        return this._addRelation({
            type: 'belongsTo',
            name: navName,
            schema: foreignSchema,
            foreignKey: localKey,
            optional: opts?.optional
        }) as any;
    }

    /**
     * Declare a many-to-many relation through a pivot table.
     *
     * @param navSel    Selector of nav array property: `t => t.tags`
     * @param through   Pivot table config `{ table, localKey, foreignKey }`.
     */
    belongsToMany<
        TKey extends keyof SchemaProps<TSchema> & string,
        TForeign extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        > = UnwrapNavSchema<SchemaProps<TSchema>[TKey]>
    >(
        navSel: EntityPropSelector<TSchema, TKey>,
        through: { table: string; localKey: string; foreignKey: string }
    ): WithRelation<TSchema, TRels, TKey, 'belongsToMany', TForeign> {
        const navName = this._resolvePropName(
            navSel as EntityPropSelector<TSchema>,
            this.schema
        );
        const foreignSchema = this._resolveForeignSchema(navName);
        return this._addRelation({
            type: 'belongsToMany',
            name: navName,
            schema: foreignSchema,
            through
        }) as any;
    }

    /**
     * Mark this entity as polymorphic with a discriminator property and a
     * variant map. CTI variants are described by `{ entity, foreignKey }`,
     * STI variants by `{ schema }` (no separate table). Storage type is
     * inferred from the shape.
     *
     * Variant entities' relations are merged into the resulting entity's
     * `TRels`, so `db(entity).include(t => t.someVariantRelation)` works
     * across variants.
     */
    withVariants<
        const TDiscKey extends keyof SchemaProps<TSchema> & string,
        const TVariants extends Record<string, EntityVariantInput<TSchema>>
    >(config: {
        discriminator: TDiscKey | EntityPropSelector<TSchema, TDiscKey>;
        variants: TVariants;
    }): Entity<TSchema, TRels & MergedVariantRels<TVariants>> {
        const discKey =
            typeof config.discriminator === 'string'
                ? config.discriminator
                : this._resolvePropName(
                      config.discriminator as EntityPropSelector<TSchema>,
                      this.schema
                  );

        // Translate to legacy `withVariants` shape used by the schema-level
        // `dbExtension` (no API change in the schema layer).
        const legacyVariants: Record<string, any> = {};
        for (const [vKey, vSpec] of Object.entries(
            config.variants as Record<string, EntityVariantInput<TSchema>>
        )) {
            if ('entity' in vSpec) {
                legacyVariants[vKey] = {
                    schema: vSpec.entity.schema,
                    storage: 'cti',
                    foreignKey: vSpec.foreignKey,
                    allowOrphan: vSpec.allowOrphan
                };
            } else {
                legacyVariants[vKey] = {
                    schema: vSpec.schema,
                    storage: 'sti',
                    enforceCheck: vSpec.enforceCheck
                };
            }
        }

        const next = (this.schema as any).withVariants({
            discriminator: discKey,
            variants: legacyVariants
        });
        return new Entity(next) as any;
    }

    /**
     * @internal
     * Resolve a selector callback against the real `PropertyDescriptorTree`
     * of the given schema, returning the top-level property name. Throws if
     * the accessor does not yield a valid descriptor.
     */
    private _resolvePropName(
        selector: (t: any) => any,
        schema: ObjectSchemaBuilder<any, any, any, any, any, any, any>
    ): string {
        const tree = ObjectSchemaBuilder.getPropertiesFor(schema as any);
        const descriptor = selector(tree as any);
        if (
            !descriptor ||
            typeof descriptor !== 'object' ||
            !(SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR in descriptor)
        ) {
            throw new Error(
                'Entity relation selector must return a property descriptor, e.g. `t => t.author`.'
            );
        }
        const inner = (descriptor as any)[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
        if (typeof inner.propertyName !== 'string') {
            throw new Error(
                'Entity relation selector must return a top-level property descriptor.'
            );
        }
        return inner.propertyName as string;
    }

    /** @internal Resolve the foreign schema from a nav property. */
    private _resolveForeignSchema(navName: string): any {
        const props = (this.schema as any).introspect?.()?.properties ?? {};
        const propSchema = props[navName];
        if (!propSchema) {
            throw new Error(
                `Entity.relation: navigation property "${navName}" not found on schema`
            );
        }
        const intro = propSchema.introspect?.() ?? propSchema;
        // Array → use elementSchema
        if (intro.type === 'array' && intro.elementSchema) {
            return intro.elementSchema;
        }
        // Object schema directly (with or without optional)
        if (
            intro.type === 'object' ||
            propSchema.constructor?.name === 'ObjectSchemaBuilder'
        ) {
            return propSchema;
        }
        // Fall back: assume it's already the schema
        return propSchema;
    }
}

/**
 * Wrap an `ObjectSchemaBuilder` in an {@link Entity}, enabling typed relation
 * declaration via `.hasOne()` / `.hasMany()` / `.belongsTo()` / `.belongsToMany()`.
 *
 * @public
 *
 * @example
 * ```ts
 * const UserEntity = defineEntity(
 *     object({
 *         id: number().primaryKey(),
 *         name: string(),
 *         posts: array(PostEntity.schema)
 *     }).hasTableName('users')
 * ).hasMany(t => t.posts, l => l.id, r => r.userId);
 * ```
 */
export function defineEntity<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
>(schema: TSchema): Entity<TSchema, {}> {
    return new Entity(schema);
}

/**
 * Type-level helper: extract `TRels` from any `Entity` type.
 * @public
 */
export type EntityRelations<E> = E extends Entity<any, infer R> ? R : never;

/**
 * Type-level helper: extract the underlying schema type from any `Entity`.
 * @public
 */
export type EntitySchema<E> = E extends Entity<infer S, any> ? S : never;

/**
 * Type-level helper: union of relation key names declared on an entity.
 * Used by `SchemaQueryBuilder.insert()/update()/upsert()` to omit relation
 * navigation properties from accepted input.
 * @public
 */
export type EntityRelationKeys<E> =
    E extends Entity<any, infer R> ? keyof R & string : never;
