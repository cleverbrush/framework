// @cleverbrush/orm — Entity wrapper
//
// Re-exports the `defineEntity` / `Entity` types from `@cleverbrush/knex-schema`
// (which is where the underlying schema metadata lives). Consumers of the
// ORM should import these from `@cleverbrush/orm` instead.
//
// The Entity wrapper provides typed relation declaration via:
//   `.hasOne()` / `.hasMany()` / `.belongsTo()` / `.belongsToMany()`
// and inheritance via `.withVariants()`. Each declaration extends the
// entity's `TRels` generic, so `db.todos.include(t => t.author)` is fully
// typed.

export type {
    EntityPropSelector,
    EntityRelationKeys,
    EntityRelations,
    EntitySchema,
    RelationInfo,
    SchemaProps,
    UnwrapNavSchema,
    WithRelation
} from '@cleverbrush/knex-schema';
export {
    defineEntity,
    Entity,
    POLYMORPHIC_TYPE_BRAND
} from '@cleverbrush/knex-schema';
