import type { RelationInfo } from './entity.js';
import type { ReadObject } from './read-schema.js';

/** Type-only entity graph metadata retained through optional/nullable navigation schemas. */
export const READ_ENTITY: unique symbol = Symbol.for(
    '@cleverbrush/knex-schema:read-entity'
);
/** A declared polymorphic storage branch used to derive database-read schemas. */
export interface ReadVariant {
    /** Variant object schema, including its relation metadata. */
    schema: ReadObject;
    /** Storage layout for this branch. */
    storage: 'cti' | 'sti';
    /** CTI parent-reference property, omitted from the public read row. */
    foreignKey?: string;
    /** Whether a missing CTI body produces nullable fields instead of an error. */
    allowOrphan?: boolean;
}
/** Type-only declaration of the discriminator and available polymorphic branches. */
export interface ReadVariants {
    /** Name of the discriminator property. */
    discriminator?: string;
    /** Branch descriptions keyed by discriminator literal. */
    variants?: Record<string, ReadVariant>;
}
/** Attach entity graph information to schema extension types without changing validation. */
export type EntityReadSchema<S extends ReadObject, Relations, Variants = {}> = {
    readonly [READ_ENTITY]: { relations: Relations; polymorphic: Variants };
    optional(): EntityReadSchema<
        ReturnType<S['optional']>,
        Relations,
        Variants
    >;
    nullable(): EntityReadSchema<
        ReturnType<S['nullable']>,
        Relations,
        Variants
    >;
    required(): EntityReadSchema<
        ReturnType<S['required']>,
        Relations,
        Variants
    >;
    notNullable(): EntityReadSchema<
        ReturnType<S['notNullable']>,
        Relations,
        Variants
    >;
} & S;
/** Relations available from an entity's schema, including nested navigation schemas. */
export type ReadRelations<S> = S extends {
    readonly [READ_ENTITY]: {
        relations: infer R extends Record<string, RelationInfo>;
    };
}
    ? R
    : {};
/** Polymorphic declarations available from an entity's schema. */
export type ReadVariantMetadata<S> = S extends {
    readonly [READ_ENTITY]: { polymorphic: infer V };
}
    ? V
    : {};
/** Accumulate a variant while retaining its literal key and storage schema. */
export type WithReadVariant<
    V extends ReadVariants,
    K extends string,
    Branch extends ReadVariant
> = {
    discriminator: V['discriminator'];
    variants: Omit<NonNullable<V['variants']>, K> & Record<K, Branch>;
};
