# `@cleverbrush/orm`
<!-- coverage-badge-start -->
![Unit coverage](https://img.shields.io/badge/unit_coverage-81%25-green)
<!-- coverage-badge-end -->

EF-Core-like typed ORM layer on top of [`@cleverbrush/knex-schema`](../knex-schema).

- Define entities with `defineEntity(schema)` and declare relations via
  `.hasOne()` / `.hasMany()` / `.belongsTo()` / `.belongsToMany()`.
- Group entities into a typed context with `createDb(knex, { todos, users })`.
- Access `db.todos`, `db.users` as fully-typed `DbSet<TEntity>` instances.
- Eager-load related entities with `.include(t => t.author)`.
- Use `{ tracking: true }` for an identity map + change-tracking context.
- Model inheritance with STI (single-table) and CTI (class-table) variants.
- Manage schema migrations with [`@cleverbrush/orm-cli`](../orm-cli).

---

Upgrading? See [Migrating from v4.x to v5](../knex-schema/MIGRATION-v5.md).

## Installation

```sh
npm install @cleverbrush/orm
```

`knex` is a peer dependency (install it alongside `@cleverbrush/orm`). `@cleverbrush/knex-schema` is a direct dependency and is installed automatically.

## Quick start

### 1. Define a schema and entity

```ts
import { number, object, string, defineEntity } from '@cleverbrush/orm';

const UserSchema = object({
    id:    number().primaryKey(),
    email: string().hasColumnName('email_address'),
    name:  string(),
}).hasTableName('users');

export const UserEntity = defineEntity(UserSchema);
```

### 2. Create a `DbContext`

```ts
import knex from 'knex';
import { createDb } from '@cleverbrush/orm';
import { UserEntity } from './schemas.js';

const knexClient = knex({ client: 'pg', connection: process.env.DATABASE_URL });

const db = createDb(knexClient, { users: UserEntity });
```

### 3. Query and mutate

```ts
// Find by PK
const alice = await db.users.find(1);

// Find with WHERE clause
const user = await db.users.where(t => t.email, 'alice@example.com').first();

// Insert
const created = await db.users.save({ email: 'bob@example.com', name: 'Bob' });

// Update (PK present → UPDATE)
const updated = await db.users.save({ id: 1, email: 'alice@example.com', name: 'Alice' });
```

---

## `DbSet<TEntity>` API

| Method | Description |
|--------|-------------|
| `.find(pk)` | Find one row by PK; returns `undefined` when not found |
| `.findOrFail(pk)` | Like `.find`, but throws `EntityNotFoundError` when not found |
| `.findMany([pk1, pk2, …])` | Fetch multiple rows by PK in one query |
| `.all()` | Alias for `.execute()` — returns all rows |
| `.first()` | Returns the first matching row or `undefined` |
| `.where(col, value)` | Adds a `WHERE` predicate (chainable) |
| `.include(t => t.rel)` | Eager-loads a relation (chainable) |
| `.save(graph)` | Insert or update a row graph (transactional) |
| `.ofVariant(key)` | Return a typed `VariantDbSet` scoped to a polymorphic variant |
| `.rowSchema` | Automatically describes the decoded result; reading metadata runs no SQL |
| `.query()` | Returns the underlying `EntityQuery` for advanced querying |
| `.withTransaction(trx)` | Returns a new `DbSet` bound to an existing transaction |

Any method from the underlying `SchemaQueryBuilder` (e.g. `.execute()`,
`.where()`, `.orderBy()`, `.pluck()`, `.count()`) is also available and
fully typed.

---

## Relations

Declare relations on the entity using fluent builders.  Relations are optional
by default (omit from the save-graph to skip them).

```ts
const TodoSchema = object({
    id:     number().primaryKey(),
    title:  string(),
    userId: number().hasColumnName('user_id'),
    author: object({ id: number().primaryKey(), name: string() })
                .hasTableName('users').optional(),
}).hasTableName('todos');

const TodoEntity = defineEntity(TodoSchema)
    .belongsTo(t => t.author, 'userId');   // FK is on todos.user_id → users.id

const UserEntity = defineEntity(UserSchema)
    .hasMany(t => t.todos, TodoEntity, 'userId');   // FK on todos.user_id
```

### Eager-loading

```ts
const todo = await db.todos
    .where(t => t.id, 42)
    .include(t => t.author)
    .first();

console.log(todo?.author?.name);   // fully typed
```

### Saving with relations

`db.todos.save(graph)` traverses the whole object graph and persists every
level in the correct FK order inside a single transaction.

```ts
// Create a new user and a new todo in one call.
const result = await db.users.save({
    name: 'Alice',
    todos: [
        { title: 'Buy milk', completed: false, userId: 0 },
    ],
});
```

Topology rules:
- `belongsTo` parents are inserted first; their PK feeds the child FK.
- The root entity is then written.
- `hasOne` / `hasMany` children inherit the root PK into their FK.
- `belongsToMany` children may be new objects (inserted + pivot) or bare
  `{ pk: value }` references (pivot only).

---

## Change-tracking context

Pass `{ tracking: true }` to `createDb` to get a `TrackedDbContext`.  The
context maintains an **identity map** (same PK → same object reference) and
tracks every mutation automatically.

```ts
const db = createDb(knex, { users: UserEntity }, { tracking: true });

// Load entity — it's now in the identity map.
const user = await db.users.find(1);

// Mutate normally.
user.name = 'Updated';

// Flush all dirty entries in a single transaction.
const { inserted, updated, deleted } = await db.saveChanges();
```

### `TrackedDbContext` API

| Method / property | Description |
|---|---|
| `.attach(key, entity)` | Register an existing entity as `Unchanged` |
| `.entry(entity)` | Return the `EntityEntry` for a tracked entity |
| `.entry(entity).state` | `'Added' \| 'Modified' \| 'Unchanged' \| 'Deleted'` |
| `.entry(entity).isModified(field?)` | Check if a specific (or any) field changed |
| `.entry(entity).reset()` | Revert the entity to its last snapshot |
| `.detach(entity)` | Remove an entity from the tracker |
| `.remove(entity)` | Mark a tracked entity as `Deleted` |
| `.saveChanges()` | Flush all pending changes to the DB |
| `.discardChanges()` | Roll back all in-memory changes |
| `.reload(entity)` | Re-fetch the entity from the DB and refresh its snapshot |
| `.onSavingChanges(hook)` | Register a pre-flush callback (e.g. for audit fields) |
| `[Symbol.asyncDispose]()` | Usable in `await using` blocks; throws on pending changes |

### Row versioning

Mark any numeric or timestamp column as a row version:

```ts
const OrderSchema = object({
    id:      number().primaryKey(),
    status:  string(),
    version: number().rowVersion(),   // auto-incremented by the ORM on every UPDATE
}).hasTableName('orders');
```

`saveChanges()` appends `AND version = <snapshot>` to every `UPDATE` and throws
`ConcurrencyError` if `rowCount === 0`.

### `await using` integration

```ts
async function updateUser(userId: number) {
    await using db = createDb(knex, { users: UserEntity }, { tracking: true });
    const user = await db.users.find(userId);
    if (!user) return;
    user.name = 'Updated';
    await db.saveChanges();
}   // Symbol.asyncDispose fires here; throws if changes are still pending
```

---

## Immutable queries and projection schemas

Every DbSet/query chain is immutable and automatically exposes `rowSchema`.
Full entity reads still participate in the identity map when `{ tracking: true }`.
Selected, grouped, distinct and raw results are detached; partial rows never
replace tracked entities. Entity objects themselves remain mutable: edit a full
entity and call `saveChanges()` as before. Reads, reloads and write-returning rows
now consistently use exact bigint/decimal strings, `Date` objects and SQL `null`.

```ts
const read = db.users
    .select(u => ({ id: u.id, name: u.name }));
const Source = read.rowSchema;
const toDto = mapper().configure(Source, UserDto, m => m)
    .getSyncMapper(Source, UserDto);
const users = (await read).map(toDto);
```

Typed relation customizers return their configured query; nested graphs are
decoded in one SQL statement. STI/CTI readers expose `variantRowSchemas` for
explicit application mapping. See the [read-schema consumer guide](../knex-schema/README.md#projection-aware-reads)
for numeric/null/date rules, examples and compatibility boundaries.

Ordinary queries also support grouped `where`/`andWhere`/`orWhere`,
IN/EXISTS subqueries, bound `whereRaw`/`orderByRaw`, and `ref(selector)` for quoted
column references. These operations preserve the reader's `rowSchema` identity
and work in nested relation customizers; polymorphic branches use `forVariant()`.
Group callbacks are synchronous, immutable and predicate-only; always return
the configured group. Conditional filters must reassign the returned query. See
[filtering and ordering](../knex-schema/README.md#filtering-and-ordering-without-changing-the-result-schema)
for scoped search, subquery snapshots, pagination, and raw-SQL boundaries.

---

## Parameterized compiled reads

For module-level reads that receive an injected connection only at execution,
`query` and `parameter` are also re-exported from this package:

```ts
// data/user-queries.ts
import { parameter, query } from '@cleverbrush/orm';
import { UserSchema } from './user-schema.js';

export const findUser = query(UserSchema)
    .where(user => user.id, parameter('id'));

// api/handlers/get-user.ts — db is the injected DbContext
const user = await findUser.query(db.knex, userId).first();
const rows = await findUser(db.knex, userId);
```

These connection-independent reads return detached schema-backed rows, not
entities registered in a DbContext's identity map. Use DbSet queries below when
tracking, `find()` helpers or context-managed changes are required. See the
[multi-file query-definition example](../knex-schema/README.md#connection-independent-query-definitions)
for transactions, connection-specific SQL caching and binding before writes.

`parameter` is re-exported by `@cleverbrush/orm`. Adding a named placeholder to
a DbSet query creates a callable SELECT with schema-inferred positional arguments:

```ts
import { parameter } from '@cleverbrush/orm';

const findUsers = db.users
    .where(t => t.name, parameter('name'))
    .where(t => t.id, '>=', parameter('minimumId'));
const users = await findUsers('John', 10);
const sql = findUsers.toSQL('Jane', 20); // inspect without execution
const one = await findUsers.query('John', 10).find(10);
```

SQL compiles once on the first direct call or SQL inspection. Complete entity
rows participate in the context's identity map exactly as ordinary reads do;
projections remain detached. Bound readers retain ORM lookup helpers and
permitted mutation methods. Unbound templates cannot execute parameterless
terminals or writes. `ofVariant(...)` views support the same callable behavior.

See [parameterized compiled queries](../knex-schema/README.md#parameterized-compiled-queries)
for argument ordering, null semantics, relation/variant parameters, transactions,
and the supported PostgreSQL SELECT shapes.

## Polymorphic entities (STI / CTI)

### Single-Table Inheritance (STI)

All variants share one table; a discriminator column identifies the type.

```ts
const ActivityBase = object({
    id:     number().primaryKey(),
    type:   string(),
    todoId: number().hasColumnName('todo_id'),
}).hasTableName('activities');

const ActivityEntity = defineEntity(ActivityBase)
    .discriminator('type')
    .stiVariant('assigned', object({
        type:       string('assigned'),
        assigneeId: number().hasColumnName('assignee_id').optional(),
    }))
    .stiVariant('commented', object({
        type: string('commented'),
        body: string().optional(),
    }));
```

### Class-Table Inheritance (CTI)

The base row is in one table; each variant has its own extension table.

```ts
const AssignedExtras = defineEntity(
    object({
        activityId: number().hasColumnName('activity_id'),
        assigneeId: number().hasColumnName('assignee_id'),
    }).hasTableName('assigned_activities')
);

const ActivityEntity = defineEntity(ActivityBase)
    .discriminator('type')
    .ctiVariant('assigned', AssignedExtras, t => t.activityId);
```

### Querying variants

Call `db.set.ofVariant('key')` to obtain a **`VariantDbSet`** — a typed view
scoped to that variant, analogous to EF Core's `Set<DerivedType>()`.  All
reads are pre-filtered by the discriminator; writes use the correct STI / CTI
logic automatically.

```ts
// Insert a new variant row (discriminator is set automatically)
const activity = await db.activities.ofVariant('assigned').insert({
    todoId:     42,
    assigneeId: 9,
});
// activity.type === 'assigned'
// activity.assigneeId === 9

// Find a single variant by PK
const found = await db.activities.ofVariant('assigned').find(activityId);

// Update matching rows  (chain .where() before .update())
await db.activities.ofVariant('assigned').where(t => t.id, 3).update({ assigneeId: 99 });

// Delete matching rows
await db.activities.ofVariant('assigned').where(t => t.id, 3).delete();
```

### `VariantDbSet<TEntity, K>` API

| Method | Description |
|--------|-------------|
| `.insert(payload)` | Insert a new variant row; discriminator is set automatically |
| `.update(patch)` | Atomically update matching base and variant fields; returns `Promise<void>` |
| `.delete()` | Delete matching entities, honoring base soft deletion; returns `Promise<void>` |
| `.restore()` | Clear the base deletion marker and return restored variant rows |
| `.hardDelete()` | Permanently delete matching entities and return their count |
| `.find(pk)` | Find a single variant row by PK; `undefined` if not found |
| `.findOrFail(pk)` | Like `.find`, but throws `EntityNotFoundError` |
| `.findMany([pk…])` | Fetch multiple variant rows by PK in one query |
| `.where(col, value)` | Adds a `WHERE` predicate (chainable; returns `VariantDbSet`) |
| `.include(t => t.rel)` | Eager-load a relation; the resulting query is read-only |
| `.withTransaction(trx)` / `.transacting(trx)` | Bind an independent variant view to an existing transaction, preserving filters |

Polymorphic root queries are read-only. Use `ofVariant()` for explicit mutations;
tracked polymorphic inserts, updates and removals use the same lifecycle pipeline
when `saveChanges()` runs. Writes require a single-column base primary key and an
unprojected variant view without loaded relations. Primary keys, discriminators
and CTI join keys cannot be changed by an update, including from a hook.

### Variant deletion and lifecycle

The **base schema** controls entity soft deletion. With `.softDelete()`, `delete()`
sets its deletion marker and keeps CTI child rows intact. Without that metadata,
`delete()` removes the physical rows. `hardDelete()` always removes CTI children
before their base rows. The child schema's own deletion marker is not changed by
soft deletion or restoration of the entity.

All mutations retain query predicates, default scopes, ordering/pagination, and
deleted-row visibility. Select hidden rows explicitly when restoring or purging:

```ts
const assigned = db.activities.ofVariant('assigned');
await assigned.onlyDeleted().where(t => t.id, activityId).restore();
await assigned.withDeleted().where(t => t.id, activityId).hardDelete();
```

Base hooks run before variant hooks, in registration order, once per operation.
`beforeInsert` and `beforeUpdate` receive the combined property-name payload before
it is split into storage tables. `afterInsert` receives the complete decoded row.
`beforeDelete` receives a transaction-bound read query restricted to the captured
mutation targets, for both soft and permanent deletion. Query configuration is
immutable; hooks cannot add delete predicates by changing that query. No hooks run
when an update or delete matches no rows.

Inserts set configured creation/update timestamps on both storage schemas; updates
advance configured update timestamps, including the base timestamp for child-only
changes. Soft deletion and restoration change only the base deletion marker:
restoration runs no lifecycle hook and neither operation advances update timestamps,
matching ordinary query writes. Restoring a schema without base soft deletion fails.

Target selection and all storage writes execute in one transaction. Existing
transactions use a savepoint, so catching a failed mutation cannot retain half a CTI
write. Hooks run before commit: database changes roll back on failure, but external
side effects performed by hooks cannot be rolled back. Tracked saves preserve
optimistic row-version checks and apply returned values and new snapshots only
after their save transaction succeeds.

---

## Transactions

```ts
// One-off transaction (non-tracking context)
await db.transaction(async trx => {
    const user = await trx.users.save({ name: 'Alice' });
    await trx.todos.save({ title: 'Buy milk', userId: user.id });
});

// Wrap existing transaction
const user = await db.users.withTransaction(existingTrx).save({ name: 'Alice' });
```

---

## Error classes

| Class | Thrown when |
|-------|-------------|
| `EntityNotFoundError` | `findOrFail` can't locate the requested PK |
| `ConcurrencyError` | `saveChanges` UPDATE/DELETE hits a row-version mismatch |
| `InvariantViolationError` | PK or discriminator column mutated on a tracked entity |
| `PendingChangesError` | `[Symbol.asyncDispose]` fires with unsaved changes |

---

## Schema migrations

Use [`@cleverbrush/orm-cli`](../orm-cli) to generate and apply migration files
from your entity definitions:

```sh
# Diff schema vs DB → emit a TypeScript migration file
npx cb-orm migrate generate add_users_table

# Apply pending migrations
npx cb-orm migrate run

# Read-only CI check for schema drift
npx cb-orm validate
```

---

## Composable queries

ORM re-exports `alias`, `eq`, `and`, `or`, and `aggregate`. Use
`query(db.knex, alias(TaskSchema, 'task'))` for flat DTO joins and `include` for
nested relations. Transaction-bound contexts expose their transaction as `db.knex`.

`countValue`, `countDistinctValue`, `sumValue`, `avgValue`, `minValue`, and
`maxValue` are available on entity queries. An optional `{ output: schema }`
replaces default decoding and controls the inferred output, including nulls.
Aggregate/DTO projections are not attached as entities in tracked contexts.

```ts
const tasks = await db.tasks
    .orderBy(t => t.createdAt, 'desc')
    .orderBy(t => t.id, 'desc')
    .include(t => t.owner, owners => {
        return owners.where(t => t.name, 'Alice'); // foreign schema, not any
    })
    .limit(20);
```

Eager loading retains parent order and page size. Filtering an included relation
does not necessarily filter parents. Callback types infer the declared foreign
schema, including variant queries when the relation schema is known.

`paginateAfter({ limit, cursor, orderBy: [...] })` supports non-null scalar sorts
with a declared unique tie-breaker. Use `column` for a single-column cursor.
See the [complete query guide](../knex-schema/README.md#composable-read-queries) for defaults,
precision policy, grouped aggregates, cursor restrictions, and examples.

## Related packages

- [`@cleverbrush/knex-schema`](../knex-schema) — the underlying schema DSL and
  query builder
- [`@cleverbrush/orm-cli`](../orm-cli) — migration CLI tool
- [API reference](https://cleverbrush.github.io/framework/api-docs/latest)


## JSON document columns

Declare document columns with `object({...}).jsonb()` using the ORM schema
factories. Add `.acceptUnknownProps()` to preserve undeclared JSON fields. See [JSONB document contracts](../knex-schema/README.md#lossless-jsonb-documents)
for declarations, null behavior and permissive object schemas.

Tracked JSON columns use independent document snapshots and structural comparison.
Editing a nested object or array marks the column modified; replacing it with an
equivalent document does not. `entry(entity).reset()` and `discardChanges()` restore
independent copies, so subsequent edits cannot mutate the saved snapshot. JSON
validation and encoding also apply to ORM saves and tracked updates.
