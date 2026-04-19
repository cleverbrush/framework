# @cleverbrush/knex-schema

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
