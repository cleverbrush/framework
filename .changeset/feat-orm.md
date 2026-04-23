---
'@cleverbrush/orm': minor
'@cleverbrush/orm-cli': minor
'@cleverbrush/knex-schema': minor
---

Add `@cleverbrush/orm` — EF-Core-like typed ORM — and `@cleverbrush/orm-cli` migration tooling.

## `@cleverbrush/orm` (new library)

A typed ORM layer built on top of `@cleverbrush/knex-schema` that provides:

- **`createDb(knex, entityMap, opts?)`** — creates a `DbContext` with typed `DbSet<TEntity>`
  properties for each entry in the entity map.  Pass `{ tracking: true }` to get a
  `TrackedDbContext` with an identity map and change tracker.

- **`defineEntity(schema)`** — wraps a `@cleverbrush/knex-schema` schema and enables
  fluent relation and variant declarations:
  - `.hasOne(sel, EntityDef, fkKey)` / `.hasMany(sel, EntityDef, fkKey)` — child relations
  - `.belongsTo(sel, fkKey)` — parent relation
  - `.belongsToMany(sel, EntityDef, opts)` — many-to-many via pivot table
  - `.discriminator(key)` — marks the entity as polymorphic
  - `.stiVariant(key, schema)` — Single-Table Inheritance variant (shared table)
  - `.ctiVariant(key, EntityDef, fkSel, opts?)` — Class-Table Inheritance variant (separate table)

- **`DbSet<TEntity>`** — typed query starter with:
  - `.find(pk)` / `.findOrFail(pk)` / `.findMany([pk…])` — PK-based lookups
  - `.save(graph)` — transactional graph persistence with FK propagation
  - `.insertVariant(key, payload)` — insert STI/CTI polymorphic rows
  - `.updateVariant(key, set)` / `.deleteVariant(key)` — polymorphic UPDATE/DELETE
  - `.findVariant(key, pk)` — polymorphic single-row lookup
  - All `SchemaQueryBuilder` methods (`.where()`, `.include()`, `.execute()`, etc.)

- **`TrackedDbContext`** additions:
  - Identity map — same PK always returns the same object reference
  - Automatic change detection — mutate entities normally; flush with `saveChanges()`
  - `.attach(key, entity)` / `.detach(entity)` / `.entry(entity)` — manual tracker control
  - `.remove(entity)` — mark entity for deletion
  - `.saveChanges()` — flush all `Added / Modified / Deleted` entries in one transaction
  - `.discardChanges()` — roll back all in-memory changes
  - `.reload(entity)` — re-fetch from DB and refresh snapshot
  - `.onSavingChanges(hook)` — pre-flush callback for audit fields, etc.
  - `[Symbol.asyncDispose]()` — `await using` support; throws `PendingChangesError` on unsaved changes
  - `.rowVersion()` column support — auto-increments on UPDATE, throws `ConcurrencyError` on conflict

- **Error classes**: `EntityNotFoundError`, `ConcurrencyError`, `InvariantViolationError`,
  `PendingChangesError`

## `@cleverbrush/orm-cli` (new library)

CLI tool for managing PostgreSQL schema migrations from entity definitions:

- `cb-orm migrate generate [name]` — diff entity schemas vs live DB, emit typed TS migration file
- `cb-orm migrate run [--to <file>]` — apply pending migrations via `knex.migrate.latest`
- `cb-orm migrate rollback [--all]` — roll back last (or all) migration batch(es)
- `cb-orm migrate status` — list applied and pending migration files
- `cb-orm db push [--yes]` — apply schema diff in-place without a migration file (dev only)

Config is loaded from `db.config.ts` in the working directory via `defineConfig({ knex, entities, migrations })`.

## `@cleverbrush/knex-schema` (extensions for ORM)

New schema extension points consumed by `@cleverbrush/orm`:

- **Entity & relation extensions** — `defineEntity`, `Entity`, `POLYMORPHIC_TYPE_BRAND`,
  `getVariants`, `getPolymorphicVariantSchemas` and the full relation-registration API
  (`RelationInfo`, `EntityRelations`, `EntityPropSelector`, etc.)
- **Migration support** — `tableExistsInDb`, `introspectDatabase`, `diffSchema`,
  `generateCreateTableSource`, `generateMigration`, `applyDiff`
- **DDL helpers** — `buildColumnMap`, `getPrimaryKeyColumns`, `extractPkValues`, `buildPkKey`
- **Snapshot utilities** — `snapshotEntity` for change-tracker baseline capture
- **`rowVersion()`** column extension on `NumberSchemaBuilder`
