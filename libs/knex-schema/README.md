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
| Selection | `.select(...cols)`, `.distinct(...cols)` |
| Aggregates | `.count(col?)`, `.countDistinct(col?)`, `.min(col)`, `.max(col)`, `.sum(col)`, `.avg(col)` |
| Writes | `.insert(data)`, `.insertMany(data[])`, `.update(data)`, `.delete()` |
| Execution | `.execute()`, `.first()`, `await builder` (thenable) |
| Debugging | `.toQuery()`, `.toString()` |
| Escape hatch | `.apply(fn)` |
