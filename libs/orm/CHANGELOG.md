# @cleverbrush/orm

## 4.4.3

### Patch Changes

- @cleverbrush/schema@4.4.3
- @cleverbrush/knex-schema@4.4.3

## 4.4.2

### Patch Changes

- @cleverbrush/schema@4.4.2
- @cleverbrush/knex-schema@4.4.2

## 4.4.1

### Patch Changes

- @cleverbrush/schema@4.4.1
- @cleverbrush/knex-schema@4.4.1

## 4.4.0

### Minor Changes

- c75bff4: Add framework affordances discovered while reviewing Xpenser:

  - `@cleverbrush/env`: add `envBoolean()` for environment-style boolean values
    such as `1`, `0`, `yes`, `no`, `on`, and `off`.
  - `@cleverbrush/server`: parse `application/x-www-form-urlencoded` request
    bodies by default, add `ActionResult.raw()`, and allow ordered
    authentication fallback with `trySchemes`.
  - `@cleverbrush/client`: add `externalCacheTags()` to
    `@cleverbrush/client/cache` for framework-agnostic external cache tag
    invalidation, including Next.js `revalidateTag()` as one supported callback.
  - `@cleverbrush/knex-schema` / `@cleverbrush/orm`: add
    `InferDatabaseRow` / `InferDatabaseValue` row typing helpers and support raw
    update expressions plus conditional `where` callbacks in
    `onConflict().merge()`.
  - `@cleverbrush/orm-cli`: add read-only `cb-orm validate` for live schema drift
    checks.

  Docs and package READMEs were updated; see https://docs.cleverbrush.com.

### Patch Changes

- Updated dependencies [c75bff4]
  - @cleverbrush/knex-schema@4.4.0
  - @cleverbrush/schema@4.4.0

## 4.3.2

### Patch Changes

- 1556ad1: Prepare a patch release with website SEO, AI-readiness, accessibility, and
  privacy compliance updates.
- Updated dependencies [1556ad1]
  - @cleverbrush/schema@4.3.2
  - @cleverbrush/knex-schema@4.3.2

## 4.3.1

### Patch Changes

- @cleverbrush/schema@4.3.1
- @cleverbrush/knex-schema@4.3.1

## 4.3.0

### Patch Changes

- @cleverbrush/schema@4.3.0
- @cleverbrush/knex-schema@4.3.0

## 4.2.0

### Patch Changes

- 9c7359c: Fix wrong version numbers for `@cleverbrush/orm` and `@cleverbrush/orm-cli` — they were at 1.0.0 instead of matching the rest of the framework. Both packages are now added to the fixed release group so they stay in sync with all other `@cleverbrush/*` packages going forward.
  - @cleverbrush/schema@4.2.0
  - @cleverbrush/knex-schema@4.2.0

## 1.0.0

### Major Changes

- 6e66e9a: Add `@cleverbrush/orm` — EF-Core-like typed ORM — and `@cleverbrush/orm-cli` migration tooling.

  ## `@cleverbrush/orm` (new library)

  A typed ORM layer built on top of `@cleverbrush/knex-schema` that provides:

  - **`createDb(knex, entityMap, opts?)`** — creates a `DbContext` with typed `DbSet<TEntity>`
    properties for each entry in the entity map. Pass `{ tracking: true }` to get a
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
    - `.ofVariant(key)` — return a typed `VariantDbSet` scoped to a polymorphic variant
      (analogous to EF Core's `Set<DerivedType>()`)
    - All `SchemaQueryBuilder` methods (`.where()`, `.include()`, `.execute()`, etc.)

  - **`VariantDbSet<TEntity, K>`** — typed handle for a single polymorphic variant:

    - `.insert(payload)` — insert with discriminator set automatically (STI/CTI aware)
    - `.update(patch)` / `.delete()` — scoped writes for rows matched by `.where()`
    - `.find(pk)` / `.findOrFail(pk)` / `.findMany([pk…])` — variant-typed lookups
    - `.where()` / `.include()` / `.withTransaction()` — full chain support
    - Calling `.insert()` / `.update()` / `.delete()` on the base polymorphic `DbSet`
      throws a runtime error; use `.ofVariant(key)` instead

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

### Patch Changes

- Updated dependencies [3bfc1e1]
- Updated dependencies [6e66e9a]
- Updated dependencies [cbdfa69]
  - @cleverbrush/knex-schema@4.0.0
  - @cleverbrush/schema@4.0.0
