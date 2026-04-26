# @cleverbrush/knex-schema

Type-safe, schema-driven query builder for [Knex](https://knexjs.org/). Use `@cleverbrush/schema` object builders to describe your PostgreSQL tables — column name mapping, eager loading, and full CRUD are handled automatically with complete TypeScript inference.

## Installation

```bash
npm install @cleverbrush/knex-schema
```

**Peer dependency:** `knex >= 3.1.0`

## Quick Start

```typescript
import knex from 'knex';
import { query, object, string, number, date } from '@cleverbrush/knex-schema';

// 1. Describe your table with a schema
const UserSchema = object({
    id:        number(),
    firstName: string().hasColumnName('first_name'),
    lastName:  string().hasColumnName('last_name'),
    age:       number().optional(),
    createdAt: date().hasColumnName('created_at'),
}).hasTableName('users');

// 2. Create a Knex instance
const db = knex({ client: 'pg', connection: process.env.DB_URL });

// 3. Query — fully typed, column names resolved automatically
const adults = await query(db, UserSchema)
    .where(t => t.age, '>', 18)
    .orderBy(t => t.lastName);
// → typed as Array<{ id: number; firstName: string; lastName: string; age?: number; createdAt: Date }>
```

## Schema Definition

Import schema builders from `@cleverbrush/knex-schema` (re-exported with the database extensions applied) instead of from `@cleverbrush/schema`:

```typescript
import { object, string, number, date, boolean, any } from '@cleverbrush/knex-schema';
// NOT from '@cleverbrush/schema' — those builders lack hasColumnName / hasTableName
```

### `.hasColumnName(sqlCol)`

Set the SQL column name for a property when it differs from the property key:

```typescript
const OrderSchema = object({
    id:          number(),
    customerId:  number().hasColumnName('customer_id'),  // snake_case column
    totalAmount: number().hasColumnName('total_amount'),
    createdAt:   date().hasColumnName('created_at'),
}).hasTableName('orders');
```

### `.hasTableName(table)`

Set the SQL table name on an object schema. Required before calling `query()`.

---

## CRUD Operations

### Fetch All Rows

```typescript
const users = await query(db, UserSchema);
// or explicitly:
const users = await query(db, UserSchema).execute();
```

### Fetch First Row

```typescript
const user = await query(db, UserSchema)
    .where(t => t.id, 1)
    .first();
// → UserType | undefined
```

### Insert

```typescript
// Single row — returns the inserted record (including database-generated fields)
const newUser = await query(db, UserSchema).insert({
    firstName: 'Alice',
    lastName:  'Smith',
    age:       30,
    createdAt: new Date(),
});

// Multiple rows
const newUsers = await query(db, UserSchema).insertMany([
    { firstName: 'Bob', lastName: 'Jones', createdAt: new Date() },
    { firstName: 'Carol', lastName: 'White', createdAt: new Date() },
]);
```

### Update

```typescript
// Updates rows matching the WHERE clause, returns updated records
const updated = await query(db, UserSchema)
    .where(t => t.id, userId)
    .update({ firstName: 'Alicia' });
```

### Delete

```typescript
// Returns the number of deleted rows
const count = await query(db, UserSchema)
    .where(t => t.id, userId)
    .delete();
```

---

## Filtering

Column references accept either a **property accessor** (`t => t.firstName`) or a **string property key** (`'firstName'`) — both are resolved to the correct SQL column name:

```typescript
query(db, UserSchema)
    .where(t => t.firstName, 'like', 'A%')
    .andWhere(t => t.age, '>', 18)
    .orWhere({ lastName: 'Smith' })          // record syntax — keys mapped to columns
    .whereIn(t => t.id, [1, 2, 3])
    .whereNotNull(t => t.createdAt)
    .whereBetween(t => t.age, [20, 40])
    .whereILike(t => t.lastName, 'sm%')     // case-insensitive (PostgreSQL)
    .whereRaw('extract(year from created_at) = ?', [2025]);
```

Available WHERE methods: `where`, `andWhere`, `orWhere`, `whereNot`, `whereIn`, `whereNotIn`, `orWhereIn`, `orWhereNotIn`, `whereNull`, `whereNotNull`, `orWhereNull`, `orWhereNotNull`, `whereBetween`, `whereNotBetween`, `whereLike`, `whereILike`, `whereRaw`, `whereExists`.

---

## Ordering, Pagination, Grouping

```typescript
query(db, UserSchema)
    .orderBy(t => t.lastName)
    .orderBy(t => t.firstName, 'desc')
    .limit(20)
    .offset(40)
    .groupBy(t => t.age)
    .having(t => t.age, '>', 18)
    .select(t => t.firstName, t => t.age)
    .distinct(t => t.age);
```

---

## Eager Loading (No N+1)

Related rows are loaded in a **single query** using PostgreSQL CTEs and `jsonb_agg`.

### `joinOne` — one-to-one / many-to-one

```typescript
const PostSchema = object({
    id:       number(),
    title:    string(),
    authorId: number().hasColumnName('author_id'),
}).hasTableName('posts');

const posts = await query(db, PostSchema)
    .joinOne({
        foreignSchema: UserSchema,
        localColumn:   t => t.authorId,
        foreignColumn: t => t.id,
        as:            'author',
    });
// posts[0].author.firstName — typed as string ✓
```

### `joinMany` — one-to-many

```typescript
const users = await query(db, UserSchema)
    .joinMany({
        foreignSchema: PostSchema,
        localColumn:   t => t.id,
        foreignColumn: t => t.authorId,
        as:            'posts',
        limit:         5,
        orderBy:       { column: t => t.id, direction: 'desc' },
    });
// users[0].posts — typed as Array<{ id: number; title: string; authorId: number }> ✓
```

The `joinMany` spec supports:
- `limit` / `offset` — per-parent pagination using `row_number()` window functions
- `orderBy` — `{ column, direction }` for the sub-collection
- `foreignQuery` — pre-filtered `Knex.QueryBuilder` (e.g. for soft-delete scopes)
- `required` (`joinOne` only) — `true` = inner join, `false` = left join (nullable result)

---

## Escape Hatch

When you need a Knex feature not exposed by this API, use `.apply()`:

```typescript
const rows = await query(db, UserSchema)
    .apply(qb => qb.forUpdate().noWait())
    .where(t => t.id, id);
```

---

## Scopes

Define **reusable WHERE/ORDER/LIMIT conditions** on the schema. A default scope is applied
automatically unless bypassed with `.unscoped()`.

```typescript
const PostSchema = object({
    id:       number(),
    title:    string(),
    status:   string(),
    isActive: boolean().hasColumnName('is_active'),
})
    .hasTableName('posts')
    .scope('published',  q => q.where(t => t.status, 'published'))
    .scope('recent',     q => q.orderBy(t => t.id, 'desc').limit(10))
    .defaultScope(       q => q.where(t => t.isActive, true));

// Apply named scopes
const posts = await query(db, PostSchema)
    .scoped('published')
    .scoped('recent');

// Bypass default scope (also skips soft-delete filter if present)
const all = await query(db, PostSchema).unscoped();
```

`scoped()` is statically typed: TypeScript only allows registered scope names.

---

## Projections

Define **named column subsets** on the schema with `.projection(name, columns)`. At query time,
`.projected(name)` restricts the `SELECT` clause **and** narrows the TypeScript result type to
`Pick<Row, Keys>` — accessing columns outside the projection is a compile-time error.

### String-tuple form

```typescript
const PostSchema = object({
    id:    number().primaryKey(),
    title: string(),
    body:  string(),
    status: string(),
})
    .hasTableName('posts')
    .projection('summary',    ['id', 'title'] as const)
    .projection('withStatus', ['id', 'title', 'status'] as const);

const rows = await query(db, PostSchema)
    .scoped('published')
    .projected('summary');

// rows: Array<Pick<Post, 'id' | 'title'>>
// rows[0].body  // ← TypeScript error: 'body' not in projection ✓
```

### Accessor form

```typescript
.projection('withStatus', t => [t.id, t.title, t.status])
```

The accessor receives the schema's property-descriptor tree; each element resolves to the
property name at runtime. This form is more refactor-safe but does not provide the compile-time
`Pick<>` narrowing that the tuple form offers.

### Conflict rules

`.projected()` cannot be combined with `.select()`, `.distinct()`, or any aggregate
(`.count()`, `.min()`, etc.) on the same query. Attempting to do so throws at runtime.

### Column-name mapping

`hasColumnName()` is respected: if `isActive` is mapped to `is_active`, the generated SQL
uses `is_active` automatically.

---

## ORM Extensions

In addition to query building, this package provides the schema-level primitives that
[`@cleverbrush/orm`](https://www.npmjs.com/package/@cleverbrush/orm) and
[`@cleverbrush/orm-cli`](https://www.npmjs.com/package/@cleverbrush/orm-cli) build on top of:

### `defineEntity(schema)` — relations

Wrap a schema to declare typed `belongsTo` / `hasOne` / `hasMany` / `belongsToMany`
relations that downstream packages use for eager-loading joins and ORM navigation properties.

```typescript
import { defineEntity, object, number, string } from '@cleverbrush/knex-schema';

const UserSchema = object({
    id:    number().primaryKey(),
    email: string(),
}).hasTableName('users');

const PostSchema = object({
    id:       number().primaryKey(),
    title:    string(),
    authorId: number().hasColumnName('author_id'),
    author:   UserSchema.optional(),
}).hasTableName('posts');

export const PostEntity = defineEntity(PostSchema)
    .belongsTo(t => t.author, l => l.authorId, r => r.id);
```

The returned `Entity` carries the relation map in its type, so downstream `query(db, entity)`
calls (and `@cleverbrush/orm`'s `DbSet.include()`) get full inference.

### Polymorphism (STI / CTI)

Mark a schema as polymorphic to support single-table or class-table inheritance — variants
are discoverable via `getVariants()` / `getPolymorphicVariantSchemas()`:

```typescript
import { POLYMORPHIC_TYPE_BRAND } from '@cleverbrush/knex-schema';
```

See the `@cleverbrush/orm` docs for the full inheritance API (`.ofVariant()` etc.).

### Migration generation (snapshot-based)

| Function | Purpose |
|---|---|
| `entitiesToSnapshot(entities)` | Materialise entity definitions into a JSON-serialisable schema snapshot |
| `loadSnapshot(path)` / `writeSnapshot(path, snap)` | Read/write the committed snapshot file |
| `generateMigrationsForContext(entities, prevSnapshot)` | Diff entities against the snapshot and emit a TS migration source plus the next snapshot |
| `generateMigration(snapshotA, snapshotB)` | Lower-level snapshot-vs-snapshot diff |
| `diffSchema(schema, dbState)` / `applyDiff(knex, diff, table)` | Live-database diff/apply (used by `cb-orm db push`) |
| `introspectDatabase(knex, table)` / `tableExistsInDb(knex, table)` | Database introspection helpers |
| `generateCreateTable(schema)` / `generateCreatePolymorphicTables(schema)` | Knex-statement builders for fresh `CREATE TABLE` |

Most users invoke these indirectly through the [`cb-orm`](https://www.npmjs.com/package/@cleverbrush/orm-cli)
CLI (`cb-orm migrate generate`, `cb-orm db push`).

### Row-version optimistic concurrency

Mark a column as a row version with `.rowVersion()` to opt-in to optimistic concurrency
checks in `@cleverbrush/orm`'s change tracker:

```typescript
const TodoSchema = object({
    id:         number().primaryKey(),
    title:      string(),
    rowVersion: number().rowVersion(),
}).hasTableName('todos');
```

`getRowVersionColumn(schema)` returns the marked column at runtime.

---

## Column Reference Patterns

Both styles are equivalent and resolve to the same SQL column:

```typescript
// 1. Property accessor (recommended — refactor-safe, IDE auto-complete)
.where(t => t.firstName, 'Alice')

// 2. String property key
.where('firstName', 'Alice')
```

The schema's `hasColumnName()` metadata is used to map `firstName` → `first_name` in both cases.

---

## API Reference

### `query(knex, schema, baseQuery?)`

Creates a `SchemaQueryBuilder`. `schema` must have `.hasTableName()` set.
Optionally pass a `baseQuery` (e.g. a scoped `knex('users').where('deleted_at', null)`) as the starting point.

### `SchemaQueryBuilder<TLocalSchema, TResult>`

| Category | Methods |
|---|---|
| Eager loading | `.joinOne(spec)`, `.joinMany(spec)` |
| Filtering | `.where()`, `.andWhere()`, `.orWhere()`, `.whereNot()`, `.whereIn()`, `.whereNotIn()`, `.orWhereIn()`, `.orWhereNotIn()`, `.whereNull()`, `.whereNotNull()`, `.orWhereNull()`, `.orWhereNotNull()`, `.whereBetween()`, `.whereNotBetween()`, `.whereLike()`, `.whereILike()`, `.whereRaw()`, `.whereExists()` |
| Ordering | `.orderBy(col, dir?)`, `.orderByRaw(sql)` |
| Grouping | `.groupBy(...cols)`, `.groupByRaw(sql)`, `.having(col, op, val)`, `.havingRaw(sql)` |
| Pagination | `.limit(n)`, `.offset(n)` |
| Selection | `.select(...cols)`, `.distinct(...cols)`, `.projected(name)` |
| Aggregates | `.count(col?)`, `.countDistinct(col?)`, `.min(col)`, `.max(col)`, `.sum(col)`, `.avg(col)` |
| Writes | `.insert(data)`, `.insertMany(data[])`, `.update(data)`, `.delete()` |
| Execution | `.execute()`, `.first()`, `await builder` (thenable) |
| Debugging | `.toQuery()`, `.toString()` |
| Escape hatch | `.apply(fn)` |
