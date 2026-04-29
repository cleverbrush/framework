# @cleverbrush/knex-schema

## 4.0.0

### Major Changes

- 3bfc1e1: Add named projections to `@cleverbrush/knex-schema`.

  **`@cleverbrush/knex-schema`** — new feature

  - `ObjectSchemaBuilder.projection(name, columns)` — define a named column subset on the schema.
    Two forms are supported:
    - **String-tuple form**: `.projection('summary', ['id', 'title'] as const)` — the column list
      is a `readonly string[]` const that TypeScript uses to narrow the query result type.
    - **Accessor form**: `.projection('detail', t => [t.id, t.title])` — refactor-safe accessor that
      resolves property names at runtime via the schema's property-descriptor tree.
  - `SchemaQueryBuilder.projected(name)` — apply a named projection at query time.
    - Restricts the `SELECT` clause to the registered columns (respecting `hasColumnName()` mappings).
    - Narrows the TypeScript result type to `Pick<Row, Keys>` for tuple-form projections.
    - Registered projection names are constrained at the type level — unregistered names are a
      compile-time error.
    - Throws at runtime if combined with `.select()`, `.distinct()`, or any aggregate method
      (`.count()`, `.min()`, etc.) on the same query.
  - Calling `.projection()` with a name that is already registered on the schema throws immediately.

  **`@cleverbrush/schema`** — internal extension

  - `PROJECTION_BRAND` unique symbol exported from the core extension system.
  - `FixedMethods` updated with a 4th `TProjections` type parameter that accumulates the
    name → keys map as `.projection()` calls are chained, enabling `SchemaQueryBuilder` to
    extract the column list at the type level.
  - `PropertyDescriptor` / `PropertyDescriptorInner` now accept an optional 4th type parameter
    `TPropertyKey extends string = string` that carries the property key literal so accessor-form
    descriptors can propagate their key name through the type system.

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
- Updated dependencies [cbdfa69]
  - @cleverbrush/schema@4.0.0

## 3.1.0

### Patch Changes

- @cleverbrush/schema@3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/schema@3.0.1

## 3.0.0

### Major Changes

- d3dae57: Add `@cleverbrush/knex-schema` — schema-driven query builder for Knex

  A new library that wraps Knex with a fully type-safe, schema-driven API. Use `@cleverbrush/schema` object builders to describe your tables and get a query builder whose column references, filtering, sorting, and write operations are all strongly typed.

  ### Key Features

  - **Schema-as-table** — decorate schema properties with `.hasColumnName('sql_col')` and the schema itself with `.hasTableName('table')` to map between TypeScript property names and SQL column names automatically.
  - **Type-safe column references** — pass property accessor functions (`t => t.firstName`) or string property keys (`'firstName'`) instead of raw column strings. The builder resolves them to the correct SQL column name at runtime.
  - **Eager loading without N+1** — `.joinOne(spec)` and `.joinMany(spec)` load related rows using a single CTE + `jsonb_agg` query. Supports per-join `limit`, `offset`, and `orderBy` via a `row_number()` window function.
  - **Full WHERE surface** — `where`, `andWhere`, `orWhere`, `whereNot`, `whereIn`, `whereNotIn`, `whereNull`, `whereBetween`, `whereLike`, `whereILike`, `whereRaw`, `whereExists`, and their `or`/`and` variants.
  - **ORDER BY, GROUP BY, HAVING, LIMIT, OFFSET, SELECT, DISTINCT, aggregates** — all accepting schema column references.
  - **Write operations** — `insert(data)`, `insertMany(data)`, `update(data)`, `delete()` with automatic bidirectional column mapping.
  - **Thenable** — builders can be `await`-ed directly without calling `.execute()`.
  - **Escape hatch** — `.apply(fn)` passes the raw `Knex.QueryBuilder` to a callback for any Knex feature not otherwise exposed.

  ### Basic Usage

  ```ts
  import knex from "knex";
  import {
    query,
    object,
    string,
    number,
    date,
  } from "@cleverbrush/knex-schema";

  // Define your table schema
  const UserSchema = object({
    id: number(),
    firstName: string().hasColumnName("first_name"),
    lastName: string().hasColumnName("last_name"),
    age: number().optional(),
    createdAt: date().hasColumnName("created_at"),
  }).hasTableName("users");

  const db = knex({ client: "pg", connection: process.env.DB_URL });

  // Query — type-safe, column names resolved automatically
  const adults = await query(db, UserSchema)
    .where((t) => t.age, ">", 18)
    .orderBy((t) => t.lastName);

  // Insert — returns the full inserted row
  const user = await query(db, UserSchema).insert({
    firstName: "Alice",
    lastName: "Smith",
    age: 30,
    createdAt: new Date(),
  });

  // Eager loading — single query, no N+1
  const PostSchema = object({
    id: number(),
    title: string(),
    authorId: number().hasColumnName("author_id"),
  }).hasTableName("posts");

  const usersWithPosts = await query(db, UserSchema).joinMany({
    foreignSchema: PostSchema,
    localColumn: (t) => t.id,
    foreignColumn: (t) => t.authorId,
    as: "posts",
    limit: 5,
    orderBy: { column: (t) => t.id, direction: "desc" },
  });
  // type — Array<{ id: number; firstName: string; ... posts: Array<{ id: number; title: string; authorId: number }> }>
  ```

  ### Additional Features

  - **`createQuery(knex)` factory** — bind a knex instance once and reuse the resulting query function across your codebase, instead of passing the knex instance on every call.

    ```ts
    import knex from "knex";
    import { createQuery } from "@cleverbrush/knex-schema";

    const db = knex({ client: "pg", connection: process.env.DB_URL });
    const query = createQuery(db);

    const users = await query(UserSchema).where((t) => t.age, ">", 18);
    const posts = await query(PostSchema).orderBy((t) => t.id, "desc");

    // Optional baseQuery overload — start from an existing Knex builder
    const base = db("users").where("deleted_at", null);
    const active = await query(UserSchema, base).where(
      (t) => t.role,
      "=",
      "admin"
    );
    ```

  - **`toKnexQuery()` on `SchemaQueryBuilder`** — convert any `SchemaQueryBuilder` back to a raw `Knex.QueryBuilder`. Useful when passing a typed builder as the `foreignQuery` in a join spec.

    ```ts
    const subquery = query(db, PostSchema).where(
      (t) => t.title,
      "like",
      "%knex%"
    );

    const users = await query(db, UserSchema).joinMany({
      foreignSchema: PostSchema,
      localColumn: (t) => t.id,
      foreignColumn: (t) => t.authorId,
      as: "posts",
      foreignQuery: subquery, // SchemaQueryBuilder accepted directly
    });
    ```

### Patch Changes

- Updated dependencies [60efc99]
- Updated dependencies [2f06dc4]
- Updated dependencies [f0f93ba]
- Updated dependencies [0df3d59]
- Updated dependencies [0cc7cbe]
- Updated dependencies [181f89e]
- Updated dependencies [8979127]
- Updated dependencies [b8f1285]
- Updated dependencies [3473d7e]
- Updated dependencies [308c9ea]
- Updated dependencies [26a7d85]
  - @cleverbrush/schema@3.0.0
