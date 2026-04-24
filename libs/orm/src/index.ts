// @cleverbrush/orm — public API
//
// EF-Core-like typed ORM layer on top of `@cleverbrush/knex-schema`.
//
// The full `@cleverbrush/knex-schema` surface is re-exported so consumers
// can drop down to schema-aware `query(knex, schema)` and `BoundQuery` for
// custom query scenarios that don't fit the entity/DbSet model.

export * from '@cleverbrush/knex-schema';
export type {
    EntityEntry,
    EntryState,
    SavingChangesHook
} from './change-tracker.js';
export type {
    DbContext,
    EntityMap,
    TrackedDbContext
} from './dbcontext.js';
export { createDb } from './dbcontext.js';
export type { DbSet, EntityQuery, VariantDbSet } from './dbset.js';
export {
    ConcurrencyError,
    EntityNotFoundError,
    InvariantViolationError,
    PendingChangesError
} from './errors.js';
export type {
    EntityResult,
    EntityResultByVariant,
    ExtractBranch,
    HasVariants,
    RelKeyTree,
    ResolvedRel,
    SaveGraph,
    VariantInsertPayload,
    VariantResult,
    VariantUpdatePayload,
    WithIncluded,
    WithVariantIncluded
} from './result-types.js';
