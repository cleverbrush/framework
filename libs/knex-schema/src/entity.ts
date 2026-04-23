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
    type InferType,
    ObjectSchemaBuilder,
    type PropertyDescriptorTree,
    type SchemaBuilder,
    SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR
} from '@cleverbrush/schema';

import { buildColumnMap } from './columns.js';
import {
    applyVariantsToSchema,
    getColumnName,
    type VariantInputForResolver
} from './extension.js';
import type { ResolvedVariantRelationSpec } from './types.js';

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
 * Merge type for a single polymorphic variant branch: variant schema fields
 * overlay base schema fields (narrowing the discriminator from `string` to its
 * specific literal value).
 *
 * @public
 */
export type VariantBranch<
    TBaseSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TVarSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>
> = Omit<InferType<TBaseSchema>, keyof InferType<TVarSchema>> &
    InferType<TVarSchema>;

/**
 * Return type for an Entity method that adds a relation: keeps `TSchema`,
 * extends `TRels` with one more entry, and preserves `TVariantUnion`.
 *
 * @public
 */
export type WithRelation<
    TSchema extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TRels extends Record<string, RelationInfo>,
    TKey extends string,
    TKind extends 'belongsTo' | 'hasOne' | 'hasMany' | 'belongsToMany',
    TForeign extends ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    TVariantUnion = never
> = Entity<
    TSchema,
    TRels & Record<TKey, RelationInfo<TKind, TForeign>>,
    TVariantUnion
>;

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
    TRels extends Record<string, RelationInfo> = {},
    TVariantUnion = never
> {
    /** The underlying schema (relations registered via `withExtension('relations', ...)`). */
    readonly schema: TSchema;

    /** @internal Phantom slot to retain `TRels` in inferred types. */
    declare readonly __relations__: TRels;

    /** @internal Phantom slot to retain `TVariantUnion` in inferred types. */
    declare readonly __variantUnion__: TVariantUnion;

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
    ): WithRelation<TSchema, TRels, TKey, 'hasOne', TForeign, TVariantUnion> {
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
    ): WithRelation<TSchema, TRels, TKey, 'hasMany', TForeign, TVariantUnion> {
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
    ): WithRelation<
        TSchema,
        TRels,
        TKey,
        'belongsTo',
        TForeign,
        TVariantUnion
    > {
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
    ): WithRelation<
        TSchema,
        TRels,
        TKey,
        'belongsToMany',
        TForeign,
        TVariantUnion
    > {
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
     * Mark this entity as polymorphic by selecting the discriminator
     * property. Returns a new `Entity` whose `.ctiVariant()` /
     * `.stiVariant()` methods declare each variant.
     *
     * Declare ordinary relations (`.belongsTo()` etc.) on this entity BEFORE
     * `.discriminator()`. After `.discriminator()` you are in the
     * polymorphic-builder phase: `.hasOne/.hasMany/.belongsTo/.belongsToMany`
     * still work, but the per-variant relations live on the `.ctiVariant()`
     * / `.stiVariant()` calls.
     *
     * @example
     * ```ts
     * const FileEntity = defineEntity(FileSchema)
     *     .discriminator(t => t.type)
     *     .ctiVariant('image',    ImageEntity,    t => t.fileId)
     *     .ctiVariant('document', DocumentEntity, t => t.fileId);
     * ```
     */
    discriminator<TKey extends keyof SchemaProps<TSchema> & string>(
        sel: TKey | EntityPropSelector<TSchema, TKey>
    ): Entity<TSchema, TRels, never> {
        const discKey =
            typeof sel === 'string'
                ? (sel as string)
                : this._resolvePropName(
                      sel as EntityPropSelector<TSchema>,
                      this.schema
                  );
        const next = new Entity(this.schema) as Entity<TSchema, TRels>;
        // Carry the variant-builder state on the new Entity so subsequent
        // `.ctiVariant()`/`.stiVariant()` calls can extend it. Stored on
        // the instance (not in the schema) so the original schema is
        // unchanged until the first variant is added.
        (next as any)._variantBuilder = {
            discKey,
            variants: {} as Record<string, VariantInputForResolver>
        };
        return next;
    }

    /**
     * Declare a CTI (Class Table Inheritance) variant. Only valid after
     * `.discriminator()`. Returns a new `Entity` whose schema carries the
     * updated `'variants'` extension.
     *
     * @param key      Discriminator literal (e.g. `'image'`).
     * @param variant  Entity wrapping the variant table schema.
     * @param fkSel    Accessor returning the FK property on the variant
     *                 schema that joins back to the base PK.
     * @param opts     `{ allowOrphan?: boolean; relations?: ... }` — see CTI docs.
     */
    ctiVariant<
        TVarSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >
    >(
        key: string,
        variant: Entity<TVarSchema, any>,
        fkSel: (t: EntityTree<TVarSchema>) => any,
        opts?: {
            allowOrphan?: boolean;
            relations?: Record<string, VariantRelationInput<TVarSchema>>;
        }
    ): Entity<
        TSchema,
        TRels,
        TVariantUnion | VariantBranch<TSchema, TVarSchema>
    > {
        const builder = (this as any)._variantBuilder as
            | VariantBuilderState
            | undefined;
        if (!builder) {
            throw new Error(
                'ctiVariant: call `.discriminator(...)` first to begin a polymorphic builder chain'
            );
        }
        const fkColumn = resolveCtiForeignKeyColumn(
            variant.schema,
            fkSel as (t: any) => any
        );
        const nextVariants: Record<string, VariantInputForResolver> = {
            ...builder.variants,
            [key]: {
                schema: variant.schema,
                storage: 'cti',
                foreignKeyColumn: fkColumn,
                allowOrphan: opts?.allowOrphan,
                relations: [
                    ...entityRelationsToVariantRelations(variant),
                    ...resolveInlineVariantRelations(
                        variant.schema,
                        opts?.relations
                    )
                ]
            }
        };
        return this._withVariantBuilder<
            TVariantUnion | VariantBranch<TSchema, TVarSchema>
        >(builder.discKey, nextVariants);
    }

    /**
     * Declare an STI (Single Table Inheritance) variant. Only valid after
     * `.discriminator()`. Accepts either an {@link Entity} or a bare
     * {@link ObjectSchemaBuilder}.
     */
    stiVariant<
        TVarSchema extends ObjectSchemaBuilder<
            any,
            any,
            any,
            any,
            any,
            any,
            any
        >
    >(
        key: string,
        body: Entity<TVarSchema, any> | TVarSchema,
        opts?: {
            enforceCheck?: boolean;
            relations?: Record<string, VariantRelationInput<TVarSchema>>;
        }
    ): Entity<
        TSchema,
        TRels,
        TVariantUnion | VariantBranch<TSchema, TVarSchema>
    > {
        const builder = (this as any)._variantBuilder as
            | VariantBuilderState
            | undefined;
        if (!builder) {
            throw new Error(
                'stiVariant: call `.discriminator(...)` first to begin a polymorphic builder chain'
            );
        }
        const isEntity = body instanceof Entity;
        const varSchema = (
            isEntity ? (body as Entity<any, any>).schema : body
        ) as ObjectSchemaBuilder<any, any, any, any, any, any, any>;
        const nextVariants: Record<string, VariantInputForResolver> = {
            ...builder.variants,
            [key]: {
                schema: varSchema,
                storage: 'sti',
                enforceCheck: opts?.enforceCheck,
                relations: [
                    ...(isEntity
                        ? entityRelationsToVariantRelations(
                              body as Entity<any, any>
                          )
                        : []),
                    ...resolveInlineVariantRelations(varSchema, opts?.relations)
                ]
            }
        };
        return this._withVariantBuilder<
            TVariantUnion | VariantBranch<TSchema, TVarSchema>
        >(builder.discKey, nextVariants);
    }

    /** @internal Apply the variant extension to the schema and return a new Entity. */
    private _withVariantBuilder<TNewUnion>(
        discKey: string,
        variants: Record<string, VariantInputForResolver>
    ): Entity<TSchema, TRels, TNewUnion> {
        let newSchema = applyVariantsToSchema(
            this.schema,
            discKey,
            variants
        ) as any;
        // Preserve any existing `relations` extension across the rebuild.
        const existingRelations =
            (this.schema as any).getExtension?.('relations') ?? [];
        if (existingRelations.length) {
            newSchema = newSchema.withExtension('relations', existingRelations);
        }
        const next = new Entity(newSchema as TSchema) as Entity<
            TSchema,
            TRels,
            TNewUnion
        >;
        (next as any)._variantBuilder = { discKey, variants };
        return next;
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

// ---------------------------------------------------------------------------
// Polymorphic variant helpers (used by Entity.discriminator/ctiVariant/stiVariant)
// ---------------------------------------------------------------------------

/** @internal Variant-builder state carried on an Entity instance during a
 * `.discriminator().ctiVariant()/.stiVariant()` chain. */
interface VariantBuilderState {
    discKey: string;
    variants: Record<string, VariantInputForResolver>;
}

/**
 * @internal Convert an Entity's stored relations (which use property-name
 * foreign keys) into the column-name form required by
 * {@link ResolvedVariantRelationSpec}.
 */
function entityRelationsToVariantRelations(
    varEntity: Entity<any, any>
): ResolvedVariantRelationSpec[] {
    const rels: any[] =
        (varEntity.schema as any).getExtension?.('relations') ?? [];
    if (rels.length === 0) return [];

    const { propToCol } = buildColumnMap(varEntity.schema as any);

    return rels.map(r => {
        // belongsToMany has no `foreignKey` on the spec itself (uses through.*).
        const fkPropName: string | undefined =
            typeof r.foreignKey === 'string' ? r.foreignKey : undefined;
        const fkColName = fkPropName
            ? (propToCol.get(fkPropName) ?? fkPropName)
            : undefined;
        return {
            name: r.name,
            type: r.type,
            schema: r.schema,
            foreignKey: fkColName,
            through: r.through
        } satisfies ResolvedVariantRelationSpec;
    });
}

/**
 * @internal Resolve a foreign-key accessor (`t => t.fileId`) against a
 * variant schema to a SQL column name.
 */
function resolveCtiForeignKeyColumn(
    varSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    fkSel: (t: any) => any
): string {
    const tree = ObjectSchemaBuilder.getPropertiesFor(varSchema as any);
    const desc = fkSel(tree as any);
    const inner = (desc as any)?.[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
    if (!inner?.propertyName) {
        throw new Error(
            'ctiVariant: foreignKey accessor must return a top-level property descriptor on the variant schema'
        );
    }
    const propKey: string = inner.propertyName;
    const props = (varSchema as any).introspect?.()?.properties ?? {};
    const propSchema = props[propKey];
    if (!propSchema) {
        throw new Error(
            `ctiVariant: foreignKey property "${propKey}" not found on variant schema`
        );
    }
    return getColumnName(propSchema, propKey);
}

/**
 * Inline relation spec accepted by {@link Entity.ctiVariant} /
 * {@link Entity.stiVariant} via `opts.relations`. The `foreignKey`
 * accessor (when given) is typed against the variant's own schema and
 * resolved to a SQL column name.
 *
 * @public
 */
export interface VariantRelationInput<
    TVarSchema extends ObjectSchemaBuilder<
        any,
        any,
        any,
        any,
        any,
        any,
        any
    > = ObjectSchemaBuilder<any, any, any, any, any, any, any>
> {
    type: 'belongsTo' | 'hasOne' | 'hasMany' | 'belongsToMany';
    /**
     * Foreign side — accept either a bare schema, an Entity wrapper, or a
     * lazy thunk for forward references.
     */
    schema?:
        | ObjectSchemaBuilder<any, any, any, any, any, any, any>
        | (() => ObjectSchemaBuilder<any, any, any, any, any, any, any>);
    entity?: Entity<any, any>;
    foreignKey?: (t: EntityTree<TVarSchema>) => any;
    through?: { table: string; localKey: string; foreignKey: string };
}

/**
 * @internal Resolve a map of {@link VariantRelationInput} into the
 * column-resolved {@link ResolvedVariantRelationSpec[]} shape stored on a
 * resolved variant spec.
 */
function resolveInlineVariantRelations(
    varSchema: ObjectSchemaBuilder<any, any, any, any, any, any, any>,
    relations: Record<string, VariantRelationInput<any>> | undefined
): ResolvedVariantRelationSpec[] {
    if (!relations) return [];
    const { propToCol } = buildColumnMap(varSchema);
    const result: ResolvedVariantRelationSpec[] = [];
    const tree = ObjectSchemaBuilder.getPropertiesFor(varSchema as any);

    for (const [name, spec] of Object.entries(relations)) {
        let foreignKey: string | undefined;
        if (spec.foreignKey) {
            const desc = spec.foreignKey(tree as any);
            const inner = (desc as any)?.[SYMBOL_SCHEMA_PROPERTY_DESCRIPTOR];
            if (!inner?.propertyName) {
                throw new Error(
                    `variant relation "${name}": foreignKey accessor must return a top-level property descriptor on the variant schema`
                );
            }
            const propKey: string = inner.propertyName;
            foreignKey = propToCol.get(propKey) ?? propKey;
        }
        const targetSchema = spec.entity ? spec.entity.schema : spec.schema;
        result.push({
            name,
            type: spec.type,
            schema: targetSchema,
            foreignKey,
            through: spec.through
        });
    }
    return result;
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
export type EntityRelations<E> =
    E extends Entity<any, infer R, any> ? R : never;

/**
 * Type-level helper: extract the underlying schema type from any `Entity`.
 * @public
 */
export type EntitySchema<E> = E extends Entity<infer S, any, any> ? S : never;

/**
 * Type-level helper: extract the accumulated variant union from any `Entity`.
 * Resolves to `never` for non-polymorphic entities.
 * @public
 */
export type EntityVariantUnion<E> =
    E extends Entity<any, any, infer U> ? U : never;

/**
 * Type-level helper: union of relation key names declared on an entity.
 * Used by `SchemaQueryBuilder.insert()/update()/upsert()` to omit relation
 * navigation properties from accepted input.
 * @public
 */
export type EntityRelationKeys<E> =
    E extends Entity<any, infer R, any> ? keyof R & string : never;
