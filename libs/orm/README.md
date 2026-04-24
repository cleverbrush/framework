# `@cleverbrush/orm`

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

## Installation

```sh
npm install @cleverbrush/orm
```

`knex` is a peer dependency (install it alongside `@cleverbrush/orm`). `@cleverbrush/knex-schema` is a direct dependency and is installed automatically.

---

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
| `.update(patch)` | Update variant columns for rows matched by the current `WHERE` clause |
| `.delete()` | Delete rows matched by the current `WHERE` clause (CTI: atomic) |
| `.find(pk)` | Find a single variant row by PK; `undefined` if not found |
| `.findOrFail(pk)` | Like `.find`, but throws `EntityNotFoundError` |
| `.findMany([pk…])` | Fetch multiple variant rows by PK in one query |
| `.where(col, value)` | Adds a `WHERE` predicate (chainable; returns `VariantDbSet`) |
| `.include(t => t.rel)` | Eager-loads a relation (chainable; returns `VariantDbSet`) |
| `.withTransaction(trx)` | Returns a new `VariantDbSet` bound to an existing transaction |

Calling `.insert()` / `.update()` / `.delete()` directly on the polymorphic
base `DbSet` (without `ofVariant`) throws a runtime error — use `ofVariant`
for all writes on polymorphic entities.

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
```

---

## See also

- [`@cleverbrush/knex-schema`](../knex-schema) — the underlying schema DSL and
  query builder
- [`@cleverbrush/orm-cli`](../orm-cli) — migration CLI tool
- [API reference](https://cleverbrush.github.io/framework/api-docs/latest)
