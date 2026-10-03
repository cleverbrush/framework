# @cleverbrush/knex-schema

Type-safe, schema-driven query builder for [Knex](https://knexjs.org/). Use `@cleverbrush/schema` object builders to describe your PostgreSQL tables — column name mapping, eager loading, and full CRUD are handled automatically with complete TypeScript inference.

Every Framework query is immutable and exposes `.rowSchema` automatically.
Upgrading? See [Migrating from v4.x to v5](./MIGRATION-v5.md).

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
// → typed as Array<{ id: number; firstName: string; lastName: string; age: number | null; createdAt: Date }>
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

### Guarded upsert for imports

Use `onConflict().merge()` when an import or sync job should insert a row if it
does not exist, but update it only when the incoming data is newer than the row
already stored in PostgreSQL.

In this example, products are imported from an external system. The `sku` is the
unique key. If the product already exists, the price is updated only when the
incoming `sourceUpdatedAt` timestamp is newer:

```typescript
await query(db, ProductSchema)
    .onConflict(t => t.sku)
    .merge(
        {
            sku: 'SKU-123',
            price: 1999,
            sourceUpdatedAt: new Date('2026-01-15T10:00:00Z'),
        },
        {
            price: ({ excluded }) => excluded(t => t.price),
            sourceUpdatedAt: ({ excluded }) =>
                excluded(t => t.sourceUpdatedAt),
            syncedAt: ({ knex }) => knex.fn.now(),
        },
        {
            where: (qb, { column }) => {
                qb.whereRaw('?? < excluded.??', [
                    column(t => t.sourceUpdatedAt),
                    column(t => t.sourceUpdatedAt),
                ]);
            },
        }
    );
```

What each helper does:

- `excluded(t => t.price)` means "use the incoming value from the failed
  insert", producing `excluded."price"` in SQL.
- `knex.fn.now()` sets `synced_at` to the database current timestamp.
- `column(t => t.sourceUpdatedAt)` resolves the schema property to the mapped
  SQL column name, for example `source_updated_at`.
- `where` attaches a PostgreSQL `ON CONFLICT DO UPDATE WHERE ...` guard. If the
  guard is false, PostgreSQL leaves the existing row unchanged.

Approximate SQL:

```sql
insert into "products" ("sku", "price", "source_updated_at")
values (?, ?, ?)
on conflict ("sku") do update set
    "price" = excluded."price",
    "source_updated_at" = excluded."source_updated_at",
    "synced_at" = CURRENT_TIMESTAMP
where "source_updated_at" < excluded."source_updated_at"
returning *
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

## Parameterized compiled queries

Use `parameter('name')` in a typed predicate to make a query callable. Call it
with values to execute a SELECT, use `.query(...)` to get an independent bound
reader, or `.toSQL(...)` to inspect SQL and bindings without execution.

```ts
import { number, object, parameter, query, string } from '@cleverbrush/knex-schema';

const User = object({
    id: number().primaryKey(),
    firstName: string().hasColumnName('first_name'),
    lastName: string().hasColumnName('last_name'),
    age: number()
}).hasTableName('users');

// One numeric argument, inferred from User.id.
const findUser = query(knex, User).where(t => t.id, parameter('id'));
const first = await findUser(10);
const second = await findUser(20);

// Two arguments in first-appearance order: string, number.
const findUsers = query(knex, User)
    .where(t => t.firstName, parameter('firstName'))
    .where(t => t.age, '>=', parameter('minimumAge'));
const users = await findUsers('John', 18);

// Three arguments; constants do not add arguments.
const inAgeRange = query(knex, User)
    .where(t => t.id, '>', 0)
    .where(t => t.firstName, parameter('name'))
    .whereBetween(t => t.age, [parameter('minimum'), parameter('maximum')]);
const matches = await inAgeRange('Jane', 18, 65);

// Repeated names share one argument, including inside groups.
const byName = query(knex, User).where(p => p
    .where(t => t.firstName, parameter('name'))
    .orWhere(t => t.lastName, parameter('name')));
const names = await byName('John');

// Fixed membership tuples retain a fixed SQL shape.
const byIds = query(knex, User)
    .whereIn(t => t.id, [parameter('first'), parameter('second')]);
const pair = await byIds(10, 20);
```

The first direct call or `.toSQL(...)` compiles the SQL and caches its binding
slots and result decoder. Later calls reuse them without rebuilding the query
or rerunning selectors, groups, relation customizers, or variant customizers.
Every invocation executes against the database; results are not cached. Each
call receives independent bindings, including copies of dates and JSON values.

```ts
const { sql, bindings } = findUsers.toSQL('John', 18); // warm without executing
const bound = findUsers.query('John', 18);            // bind without executing
const oldest = await bound.orderBy(t => t.age, 'desc').limit(10).execute();
const debugSql = bound.toQuery();

const firstTen = findUsers.limit(10).select(t => ({ id: t.id }));
const ids = await firstTen('John', 18); // { id: number }[]; independent SQL cache

await knex.transaction(async trx => {
    const rows = await findUsers.transacting(trx)('John', 18);
});
```

`.query(...)` retains ordinary composition, terminals, and permitted writes;
this optional path uses normal query-building machinery. It never changes the
template or another bound reader. Transaction derivatives from the same Knex
client share compiled SQL and use the caller's transaction without committing
or rolling it back. A different client configuration gets an independent plan.

Parameters also work with flat alias joins, relation includes, and STI/CTI
variants. A child's distinct parameter names enter the parent's argument list
when that child is configured. Repeated names across the graph share an argument.
Removing a variant removes arguments used only by that variant; surviving names
keep their order.

```ts
const findProjects = query(knex, ProjectEntity.schema)
    .include(t => t.tasks, tasks => tasks
        .where(t => t.title, parameter('title')))
    .where(t => t.id, parameter('projectId'));
const projects = await findProjects('Review', 10);

const findAssets = query(knex, AssetEntity.schema)
    .forVariant('photo', photos => photos
        .where(t => t.width, '>=', parameter('minimumWidth')))
    .where(t => t.id, '>=', parameter('minimumId'));
const assets = await findAssets(640, 1);
```

Names must be non-empty string literals. Missing/extra arguments, incorrect
value types, and incompatible reuse of one name are type errors. JavaScript
callers also receive runtime arity and storage-type checks before execution.
Types follow stored values: exact decimal/bigint fields take strings, timestamps
take valid `Date` objects, and optional/nullable columns allow `null`, never
`undefined`. Input defaults and preprocessors are not replayed.

Nullable predicates preserve ordinary Knex semantics: shorthand
`where(t => t.age, parameter('age'))` with `null` matches SQL null, while an
explicit operator such as `where(t => t.age, '=', parameter('age'))` keeps that
operator's SQL null semantics. A single compiled statement handles both null
and non-null arguments.

This API supports PostgreSQL SELECTs with fixed SQL shapes. Placeholders belong
in schema-backed scalar comparisons, `whereNot`, LIKE helpers on string fields,
ranges, or fixed membership tuples. Use `.whereIn(column, [parameter('id'), ...])`
for membership; a parameter cannot stand for a variable-length list. Placeholders
are not supported in raw SQL/bindings, object-form filters, JSON-path comparisons,
schema scopes, pagination controls, operators, identifiers, or mutations.

An unbound template is callable, not thenable: `await template` does not execute.
Parameterless terminals, writes and SQL escape hatches are unavailable until
values are bound. SQL inspection uses `?` value placeholders and separate
bindings; normal execution uses the PostgreSQL driver's bindings. This caches
application-side SQL compilation, not named server-side prepared statements.

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

Related rows are loaded in a **single query** using correlated PostgreSQL subqueries and `jsonb_agg`.

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
    }, posts => posts.orderBy(t => t.id, 'desc'));
// users[0].posts — typed as Array<{ id: number; title: string; authorId: number }> ✓
```

The `joinMany` spec accepts per-parent `limit` / `offset`. Return the configured
child from its second argument for filtering, ordering and projection. Child
default scopes and soft-delete filters apply automatically. `joinOne` additionally
accepts `required: false` for nullable related objects; required relations filter
parents without a matching child. Raw `foreignQuery`, `mappers` and `orderBy` spec
properties are replaced by the typed child customizer.

---

## Escape Hatch

When Framework cannot infer a SQL shape, declare a complete object output schema.
The Knex callback runs once on an isolated builder. The output parser receives
each raw row once; it does not get an additional entity-decoding pass:

```typescript
const Totals = object({ count: number().coerce() });
const totals = query(db, UserSchema)
    .where(t => t.age, '>', 18)
    .apply(qb => qb.clearSelect().count({ count: '*' }), { output: Totals });
const rows = await totals;
// totals.rowSchema === Totals
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

// Bypass only the default scope; use .withDeleted() separately for soft deletes
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

### Projection replacement

Each `.select()`, `.projected()`, or aggregate projection returns a new query and
replaces its scalar selection. Previously prepared queries keep their shape.
Included relations remain independent of scalar projections. Projected, grouped,
distinct and joined queries are read-only; begin writes from an unprojected table query.

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

The returned `Entity` carries the relation map in its type, so downstream `query(db, entity.schema)`
calls (and `@cleverbrush/orm`'s `DbSet.include()`) get full inference.

For many-to-many replacement flows, use the link table directly: delete the
current links in a transaction, `insertMany()` the desired links, and use
`onConflict(...).ignore()` when inserts may race with another writer. This keeps
the framework primitive generic while still covering tag/category sync
workflows.

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
| `validateEntitiesAgainstDatabase(knex, entities)` | Read-only live-database validation for CI drift checks |
| `introspectDatabase(knex, table)` / `tableExistsInDb(knex, table)` | Database introspection helpers |
| `generateCreateTable(schema)` / `generateCreatePolymorphicTables(schema)` | Knex-statement builders for fresh `CREATE TABLE` |

Most users invoke these indirectly through the [`cb-orm`](https://www.npmjs.com/package/@cleverbrush/orm-cli)
CLI (`cb-orm migrate generate`, `cb-orm db push`).

### Row typing helpers

Use `InferDatabaseRow<typeof Schema>` when a raw row or mapper can receive SQL
`NULL` for optional schema properties:

```typescript
import type { InferDatabaseRow } from '@cleverbrush/knex-schema';

type UserRow = InferDatabaseRow<typeof UserSchema>;
```

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

## Composable read queries

Use aliases for flat results, aggregate expressions for summaries, and composite
cursors for deterministic sequential paging. Nested eager loading returns graphs.

### Typed flat joins

```ts
import { alias, eq, query } from '@cleverbrush/knex-schema';

const task = alias(TaskSchema, 'task');
const owner = alias(UserSchema, 'owner');
const rows = await query(knex, task)
    .leftJoin(owner, t => eq(t.task.ownerId, t.owner.id))
    .where(t => t.task.projectId, projectId)
    .orderBy(t => t.task.id, 'desc')
    .select(t => ({ id: t.task.id, ownerName: t.owner.name }));
// ownerName includes null because owner is left-joined.
```

Aliases do not mutate schemas. Each source retains default scopes and soft-delete
filters; filtering the right-hand source does not turn a left join into an inner
join. `createQuery(knex)` also accepts aliased schemas. `eq`, `and`, and `or`
compose column-based join conditions. Duplicate aliases are errors.

Both `and` and `or` accept multiple predicates and can be nested. Each group
becomes a parenthesized SQL expression, preserving the intended precedence:

```ts
import { alias, and, eq, or, query } from '@cleverbrush/knex-schema';

const rows = await query(knex, alias(TaskSchema, 'task'))
    .join(alias(UserSchema, 'owner'), t => or(
        eq(t.task.ownerId, t.owner.id),
        and(
            eq(t.task.approverId, t.owner.id),
            or(
                eq(t.task.teamId, t.owner.teamId),
                eq(t.task.creatorId, t.owner.id)
            )
        )
    ))
    .select(t => ({ id: t.task.id, ownerName: t.owner.name }));
```

This example assumes the illustrated ID properties exist on the schemas.
Empty `and()`/`or()` groups are rejected. Predicates describe SQL; they do not
execute a JavaScript callback for each returned row.

`isSqlIdentifier(value)` is an exported type guard used by `alias()`. It accepts
one ASCII identifier (`task_owner2`), not qualified names (`public.tasks`), quoted
names, whitespace or non-string values. This deliberately conservative format
does not describe every valid PostgreSQL identifier and does not replace Knex
identifier quoting. Existing table/column metadata APIs are not restricted by it.

The read-only aliased builder requires an explicit, non-empty projection and
supports `where`, `whereIn`, `whereNull`, `whereNotNull`, `orderBy`, `orderByRaw`,
`groupBy`, `having`, `limit`, `offset`, `first`, `execute`, `transacting`, and
awaiting the query. `apply` requires `{ output }`; `toKnexQuery()` returns an independent native SQL
snapshot whose execution bypasses Framework decoding. Values remain bound
and identifiers quoted. Flat collection joins can repeat parents; they do not
deduplicate or fetch one related row at a time. Choose ORM eager loading for
nested related objects instead.

For reusable connection/transaction handling, ordinary and aliased schemas retain
the same inference through `createQuery(knex)`, `withTransaction(trx)`, and
`transaction(callback)`. Use `rawQuery(knex, Output, sql)`
or `.apply(configure, { output })` for an explicit raw output contract. These APIs and their JSDoc are also available through `@cleverbrush/orm`.

### Aggregates with optional output schemas

```ts
import { aggregate, number } from '@cleverbrush/knex-schema';

const count = await query(knex, TaskSchema).countValue(); // number
const total = await query(knex, TaskSchema)
    .sumValue(t => t.estimate); // string | null

const grouped = await query(knex, TaskSchema)
    .groupBy(t => t.ownerId)
    .select(t => ({
        ownerId: t.ownerId,
        count: aggregate.count(),
        total: aggregate.sum(t.estimate)
    }));

// Explicit floating-point conversion when appropriate for your domain.
const average = await query(knex, TaskSchema)
    .avgValue(t => t.estimate, {
        output: number().isFloat().coerce().nullable()
    }); // number | null
```

| API | Default result |
| --- | --- |
| `countValue(options?)`, `countValue(column, options?)` | Safe number; counts rows or non-null values |
| `countDistinctValue(column, options?)` | Safe number |
| `sumValue(column, options?)`, `avgValue(column, options?)` | Database numeric text, or null |
| `minValue(column, options?)`, `maxValue(column, options?)` | Column's database representation, or null |

The corresponding `aggregate.count/countDistinct/sum/avg/min/max` expressions
work in ordinary and aliased object projections. Expression options are the
second argument: `aggregate.count(undefined, { output: schema })` customizes
`COUNT(*)`. Aliased `having` also accepts aggregate expressions; its comparisons
use native SQL values, not decoded/text-formatted values.

Counts reject malformed results and integers outside JavaScript's safe range.
Sum/average preserve PostgreSQL's result as text without changing global driver
parsers. This does not make floating-point source columns exact. Numeric/decimal/
bigint extrema retain strings; known SQL-type metadata controls their inferred
representation. Ordinary number extrema are `number | null`, exact numeric extrema
are `string | null`, and Date extrema are `Date | null`. Dynamic widened SQL hints
may conservatively infer `number | string | null`.

An optional **output schema replaces the default decoder**. Its synchronous
`parse` receives the raw driver value, including null, before default conversion.
Its schema output type determines the result, including nullable/optional
modifiers. PostgreSQL counts normally reach it as strings, so a number schema
needs explicit coercion. Validation failures reject the query. Custom parsers
may return bigint/domain decimal types; JSON serialization remains application
code. With custom parsers, the application owns their conversion/precision policy.

Scalar helpers clone the source, ignore its limit/offset/order, and retain
filters, semantic joins, scopes, and transactions. They reject grouped, HAVING,
distinct, and already aggregated queries; use aggregate projections for those.
An empty scalar count is zero; other empty/all-null aggregates are null. An
empty grouped query returns no rows. `.count()`, `.sum()`, etc. now produce typed
single-field projections with automatically updated row schemas.

### Eager-loading order

```ts
const tasks = await query(knex, TaskSchema)
    .orderBy(t => t.createdAt, 'desc')
    .orderBy(t => t.id, 'desc')
    .joinMany({
        foreignSchema: NoteSchema,
        localColumn: t => t.id,
        foreignColumn: t => t.taskId,
        as: 'notes'
    })
    .limit(20);
```

The final SELECT retains parent order, including bound raw ordering expressions.
Limits/offsets select parents, not expanded child rows. Internal fields are
removed from mapped results. Parent ordering, child ordering, and relation
filtering are separate operations. Add a unique tie-breaker for deterministic
ordering of tied parents.

### Composite cursors

```ts
const page = await query(knex, TaskSchema)
    .where(t => t.projectId, projectId)
    .select(t => ({ id: t.id, title: t.title }))
    .paginateAfter({
        cursor: previousPage?.nextCursor,
        limit: 50,
        orderBy: [
            { column: t => t.createdAt, direction: 'desc' },
            { column: t => t.id, direction: 'desc' }
        ]
    });
// { data, nextCursor: string | null, hasMore: boolean }
```

The opt-in `orderBy` form controls the full sort, replacing earlier ordering.
Mixed directions, projections, and eager loading are supported. Sort fields must
be non-null scalar columns and include a schema-declared primary/unique key.
Required eager relations filter parents before the cursor page limit is applied.
Offsets, flat joins, distinct/grouped/aggregate queries, malformed cursors, and
cursors from a different table/order are rejected. The source builder is not
mutated. The original `column`/`direction` form is unchanged.

Cursors are versioned opaque strings preserving database timestamp precision
and numeric values without Date/number round-trips. Clients must not parse them.
Reapply access filters on every request and discard cursors when filters change:
they are positions, not authorization. They do not provide snapshot isolation;
sort-key updates can move records across the cursor. Sequential paging does not
support arbitrary page-number jumps; counts remain separate queries. Indexes
and representative query-plan measurements remain application work.

### Integration verification

From the repository root, run `npm run test:queries:integration` with
`QUERY_TEST_DATABASE_URL` pointing to a dedicated PostgreSQL test database.
The suite creates/drops only its randomly named fixture tables and fails if the
URL is missing. CI runs PostgreSQL 16 integration tests alongside unit/type tests.

## Projection-aware reads

Every Framework query is immutable and exposes its decoded `.rowSchema`
automatically.
Capture returned queries when adding filters, projections or includes. Inspecting
metadata never runs SQL. Ordinary table queries also support writes; projected
results are detached, while full ORM entities can still use identity tracking.

### Definitions can live in separate files

```ts
// user-read.ts
import { createQuery, date, number, object, string } from '@cleverbrush/knex-schema';
import { knex } from './database.js';

const UserTable = object({
    id: number().primaryKey(), name: string(),
    tenantId: number().hasColumnName('tenant_id'),
    lastSeen: date().optional().hasColumnName('last_seen'),
    secret: string()
}).hasTableName('users');

export const userRead = createQuery(knex)(UserTable)
    .select(u => ({ id: u.id, name: u.name, lastSeen: u.lastSeen }));
export const UserRow = userRead.rowSchema;
```

```ts
// user-mapping.ts
import { date, number, object, string } from '@cleverbrush/schema';
import { mapper } from '@cleverbrush/mapper';
import { UserRow } from './user-read.js';

export const PublicUser = object({
    id: number(), name: string(), lastSeen: date().optional()
});
export const toPublicUser = mapper().configure(UserRow, PublicUser, m => m
    .for(t => t.lastSeen).compute(row => row.lastSeen ?? undefined))
    .getSyncMapper(UserRow, PublicUser);
```

```ts
// user-service.ts
import { userRead } from './user-read.js';
import { toPublicUser } from './user-mapping.js';

export async function findPublicUser(id: number) {
    const row = await userRead.where(u => u.id, id).first();
    return row === undefined ? undefined : toPublicUser(row);
}
```

Configure reusable mappings once. `where`, ordering, limits, offsets and
transaction clones retain the same `rowSchema` object. A different projection or
include produces a different schema. Independently created queries do not share
schema identity; the mapper registry keys mappings by schema identity.

### What values does the schema describe?

| Stored value | Decoded read value |
| --- | --- |
| Required integer/float | Finite JavaScript `number` |
| `number().bigint()` or `.decimal(p, s)` | Exact `string` |
| Optional or nullable SQL column | Present property containing its value or `null` |
| Date/timestamp | `Date`, including inside JSON relation graphs |
| Missing optional JSON property | Absent property, unlike SQL null |
| Missing optional object relation | `null` |
| Missing collection relation | `[]` |

Exact numeric fields are cast to text **before** PostgreSQL JSON aggregation and
driver parsing. Converting a rounded JavaScript number to a string is not used.
Use the SQL-type builder methods to declare storage accurately; unknown SQL types
are rejected. A widened dynamic numeric SQL type has a conservative
`number | string` read type. Driver custom parsers must still honor the declared
representation, or decoding fails.

Timezone-less SQL dates/timestamps are interpreted as UTC;
explicit offsets preserve their instant. Native date fields are projected as text
before decoding, so root and nested values do not depend on a driver's local-time
date parser. This applies to ordinary reads, nested graphs and write-returning rows.

Input defaults, preprocessors and input-only validators are not replayed on stored
rows. Read schemas are structural output schemas. Optional schemas with input
defaults are rejected: `optional().default(...)` hides the storage requirement
in the inferred input/output type. Keep defaults in a separate input schema,
and use an accurately required/optional storage schema for these reads.
JavaScript `Date` has
millisecond precision: use explicit application representations if an API must
expose microseconds. Composite cursor tokens retain native timestamp precision
in private text columns, independently of the public date values.

### Projections, aliases and aggregates

```ts
const read = query(knex, alias(UserTable, 'user'))
    .leftJoin(alias(ProfileTable, 'profile'), t => eq(t.user.id, t.profile.userId))
    .select(t => ({ id: t.user.id, displayName: t.profile.displayName }));
// displayName is nullable even if ProfileTable declares it required.
const rows = await read;
read.rowSchema.validate(rows[0]);
```

Aliased reads require an explicit selection before execution or accessing
`rowSchema`. Declared named projections use `.projected('name')` on ordinary
readers. Typed aggregates work in object selections: count returns a safe number,
sum/average preserve exact text, and empty extrema/sums remain nullable. An explicit
Framework output schema replaces aggregate decoding and is parsed once; opaque
parser objects without schema introspection cannot supply projection metadata.

### Filtering and ordering without changing the result schema

Ordinary and aliased readers provide the following shape-preserving operations.
All return an independent reader with the **same `rowSchema` object**; retain the
returned reader when adding conditional filters. Filtering a nullable field does
not implicitly narrow its declared result type.

| Operation | API |
| --- | --- |
| Comparisons and parenthesized groups | `where`, `andWhere`, `orWhere` |
| SQL null checks | `whereNull`, `whereNotNull`, `orWhereNull`, `orWhereNotNull` |
| Value-list or SELECT-subquery membership | `whereIn`, `whereNotIn`, `orWhereIn`, `orWhereNotIn` |
| SELECT-subquery existence | `whereExists`, `whereNotExists`, `orWhereExists`, `orWhereNotExists` |
| Bound custom predicates | `whereRaw(sql, bindings)`, `orWhereRaw(sql, bindings)` |
| Bound custom ordering | `orderByRaw(sql, bindings)` |
| Quoted mapped column reference | `ref(columnSelector)` |

Reuse the prepared read from `user-read.ts` in a separate query-composition file:

```ts
// user-search.ts
import { number, object, query, string } from '@cleverbrush/knex-schema';
import { knex } from './database.js';
import { userRead } from './user-read.js';

const UserLabel = object({
    userId: number().hasColumnName('user_id'), label: string()
}).hasTableName('user_labels');

export function searchUsers(tenantId: number, term: string, priorityUserId: number) {
    const labeledUsers = query(knex, UserLabel)
        .where(l => l.userId, userRead.ref(u => u.id))
        .where(l => l.label, term)
        .select(l => l.userId).toKnexQuery();

    return userRead.where(u => u.tenantId, tenantId)
        .andWhere(group => group
            .where(u => u.name, 'ilike', `%${term}%`)
            .orWhereExists(labeledUsers))
        .orderByRaw('case when ?? = ? then 0 else 1 end', [
            userRead.ref(u => u.id), priorityUserId
        ])
        .orderBy(u => u.name)
        .orderBy(u => u.id);
}
```

The outer tenant filter applies to the **entire** search group. Group callbacks
are synchronous and run once when the predicate is attached, not during SQL
execution. Their predicate-only builder is immutable too: it has no selection,
join, ordering, write or execution methods. Return the configured group; a void
return, async result or unrelated builder is rejected. An empty group returned
unchanged adds no condition. Retaining a group and deriving another branch later
cannot change the already-attached predicates.

`ref()` resolves mapped columns and generated aliases for ordinary readers,
explicit aliases for joined readers, and the correct child alias inside relation
customizers. Pass references as `??` identifier bindings or as Knex comparison
values when correlating a subquery. Values use `?` bindings. Raw SQL fragments
must be application-authored, not interpolated user input; this API is **not a SQL
sandbox**. Search escaping and application authorization remain caller policies.

For membership, pass a value array or a single-column Knex SELECT subquery, for
example `read.whereIn(u => u.id, labelPage.toKnexQuery())`. Put ordering and limits
on that subquery to restrict IDs before joining/aggregating. EXISTS accepts a
Knex SELECT subquery; construct it separately instead of passing a Knex callback.
Subquery SQL and bindings are captured on attachment without database execution,
including nested subquery callbacks. Later changes to those builders do not
change the prepared reader. Empty IN lists match no rows; empty NOT IN lists
match all rows, with ordinary SQL null semantics for non-empty lists/subqueries.

These operations also work in ordinary ORM reads and nested relation customizers.
Polymorphic roots also offer common-property predicates, including bound raw
filters. Use `forVariant()` for branch-specific predicates, projections and raw
ordering; root `orderBy()` orders the union globally. Numbered pagination retains raw ordering while
its count drops ordering/limits/offsets. `paginateAfter()` uses its explicit
complete `orderBy` specification, replacing prior ordering, including raw order.
Opaque SQL changes require `.apply(configure, { output })` or
`.selectRaw(sql, bindings, { output })`; the declared schema owns raw row parsing.

### Nested graphs

Declare relations on entities as usual, and return the child query from customizers:

```ts
const read = db.projects
    .select(p => ({ id: p.id, name: p.name }))
    .include(r => r.tasks, tasks => tasks
        .select(t => ({ title: t.title, createdAt: t.createdAt }))
        .orderBy(t => t.id, 'desc').limit(3)
        .include(r => r.notes, notes => notes.select(n => ({ body: n.body }))));
```

This executes one SQL statement. Child scopes, filters, ordering, projections and
limits apply independently per parent. Collections are not lazy-loaded. Required
belongs-to joins filter missing parents; `{ optional: true }` belongs-to and has-one
reads expose nullable objects. `joinOne(spec, customize)` and
`joinMany(spec, customize)` support explicit local/foreign keys without declaring
an entity relation. Use their typed child customizer for ordering/projections;
raw `foreignQuery` and post-load `mappers` cannot supply trustworthy row metadata.

Numbered `.paginate({ page, pageSize })` performs a count and a page query.
`.paginateAfter({ limit, cursor, orderBy })` on ordinary readers reuses lossless
composite cursors, including unique-key validation. Cursor fields need not be in
the public projection. Reapply authorization filters for every page; a cursor is
not a permission or a transaction snapshot. Grouped/aggregate cursor reads are
rejected.

### Polymorphic graphs and explicit dispatch

STI/CTI entities produce a genuine union `rowSchema` and an object schema for each
discriminator in `variantRowSchemas`. All declared branch bodies are selected by
default. Use `selectVariants(['photo'])` to narrow the returned union, or
`forVariant()` to project a branch or load its relations:

```ts
const read = db.assets
    .forVariant('photo', q => q.include(r => r.tags))
    .forVariant('text', q => q.select(a => ({ id: a.id, kind: a.kind, body: a.body })));

const photoSource = read.variantRowSchemas.photo;
const textSource = read.variantRowSchemas.text;
const registry = mapper()
    .configure(photoSource, PublicPhoto, configurePhoto)
    .configure(textSource, PublicText, configureText);
const photo = registry.getSyncMapper(photoSource, PublicPhoto);
const text = registry.getSyncMapper(textSource, PublicText);
const result = (await read).map(row => row.kind === 'photo' ? photo(row) : text(row));
```

Keep the original discriminator in branch projections. Framework intentionally
does not choose a public DTO or automatically dispatch a union mapper. Polymorphic
readers also work inside ordinary includes. A missing required CTI body or unknown
discriminator fails decoding. Explicit `allowOrphan: true` makes body fields
nullable. Union ordering/pagination applies to the combined branches, not to each
branch separately. Use `forVariant()` for branch-specific filtering/includes.

### API boundaries

- Query configuration is immutable across tables, aliases, polymorphic roots and
  ORM entry points. Native Knex remains mutable only inside explicit raw callbacks
  or separately obtained snapshots.
- Scopes are synchronous, shape-preserving callbacks. Return their configured
  query. They can filter, order and paginate; they cannot select, load relations,
  execute or write. Defaults are captured once when creating the query, not on
  every render/execution. `unscoped()` preserves explicit filters and soft deletion.
- Writes require an unprojected, ungrouped, non-distinct table query with no loaded
  relations. A primary key is required to target a limited/offset write safely.
  Polymorphic writes use ORM `ofVariant()` instead of a union query.
- Reads and JSON/CTI SQL are PostgreSQL-oriented; equivalent behavior is not
  promised on other Knex dialects. Schema metadata must match actual storage.
- Raw outputs require synchronous, introspectable Framework object schemas. They
  are detached and read-only. Explicit assertions such as `hasType()` remain the
  caller's responsibility. Use SQL aliases matching output property names and
  text casts for exact numbers before driver parsing.
- `getSyncMapper()` accepts only complete mappings with synchronous final steps
  and nested mappings. It never probes callbacks. Known async mappings are
  rejected; a disguised thenable throws when invoked. Keep `getMapper()` for
  asynchronous work. Fetch/enrich data explicitly before pure mapping.

Run the mapper-only benchmark with
`npm run bench -- --project benchmarks mapper.bench.ts`. It compares prepared
sync/async functions with identical rows and excludes SQL/network time. Do not
interpret its result as an endpoint-latency guarantee.

## API Reference

See [Composable read queries](#composable-read-queries) for typed flat joins with
`alias`, all aggregate families with optional output schemas, preserved eager-load
ordering, and multi-column cursor pagination. These APIs preserve existing calls
and include runtime, type, and PostgreSQL integration coverage.

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


## Lossless JSONB documents

Use ordinary object schemas with `.jsonb()` for document columns. Enable
`.acceptUnknownProps()` on each object that must preserve extension data.

```ts
import { array, number, object, string } from '@cleverbrush/knex-schema';

const Document = object({
    id: number().primaryKey(),
    content: object({
        title: string(),
        tags: array(string()),
        metadata: object({ revision: number().optional() }).acceptUnknownProps()
    }).acceptUnknownProps().jsonb(),
    settings: object({}).acceptUnknownProps().jsonb().nullable()
}).hasTableName('documents');
```

Open objects preserve undeclared JSON keys through inserts, updates, returning
results, reads, projections and mapping. This includes nested objects, arrays,
scalars and nulls inside the document. Document column roots are objects.
Declared properties retain their inferred types and existing read decoding rules;
undeclared properties do not acquire an inferred type. Strict objects project
only their declared properties, and relational projections remain unchanged.

Optional or nullable document columns accept SQL NULL, exposed as JavaScript
`null` on reads. Omitting an optional column follows existing SQL default/null
rules. Required, non-nullable document columns reject null. DDL and generated
migrations use the same nullability rules.

Database validation rejects non-JSON extension values before persistence,
including functions, cycles, non-finite numbers, undefined, accessors and
non-JSON instances. Declared fields retain existing serialization, including
schema-declared dates and omitted optional fields. Input preprocessors and
defaults are not replayed during persistence or database reads.

Object key ordering is not a storage guarantee; compare documents structurally.
JSON numbers use JavaScript precision; use strings for exact decimals or large
integers. JSONB storage behavior belongs to `knex-schema` and `orm`; normal
object schemas describe API responses and JSON Schema without database-specific
builders.
