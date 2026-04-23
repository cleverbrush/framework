# `@cleverbrush/orm` — Next Features Plan

Mid-term roadmap of 8 features prioritising DX, type-safety, migrations/CLI, polymorphism, and a foundational change-tracking layer. No lazy loading. OK to extend `@cleverbrush/knex-schema` where needed.

---

## Features

### A. DX & Convenience - DONE

#### 1. `.find(pk)` / `.findMany(pks[])` / `.findOrFail()`

PK column(s) resolved from schema introspection via the `primaryKey` extension already present on columns. Returns `EntityResult | undefined`.

```ts
const todo  = await db.todos.find(42);              // EntityResult | undefined
const todos = await db.todos.findMany([1, 2, 3]);   // EntityResult[]
const todo2 = await db.todos.findOrFail(42);        // EntityResult (throws EntityNotFoundError)
```

- Single-column PK: resolved automatically from the schema's `primaryKey` extension.
- Composite PK: `.find([userId, roleId])` — tuple argument, order matches key declaration order.
- `EntityNotFoundError` is a typed, exported error class carrying `{ entity, pk }`.

---

#### 2. Save graph — `db.todos.save(entity)`

Insert **or** update an entity together with its included relations in one transaction. Detects PK presence to choose insert vs update. Processes relations in FK-dependency order: `belongsTo` parents first, then root, then `hasMany`/`belongsToMany` children.

```ts
const todo = await db.todos.save({
    title: 'Hello',
    author: { name: 'Alice', email: 'alice@example.com' }   // belongsTo — insert parent first
});

// Update (PK present):
await db.todos.save({ id: 42, title: 'Updated', completed: true });
```

- No identity map at this stage — each `.save()` call is independent.
- Returns the fully-populated entity graph with server-generated PKs filled in.
- Runs all applicable `beforeInsert` / `beforeUpdate` hooks.

---

#### 3. Bulk helpers

```ts
// Chunked batch insert (default chunkSize = 500):
await db.todos.bulkInsert(rows, { chunkSize: 200, onConflict: 'ignore' });

// Single CASE-based bulk update:
await db.todos.bulkUpdate([
    { where: { id: 1 }, set: { completed: true } },
    { where: { id: 2 }, set: { title: 'Renamed' } },
]);

// Upsert:
await db.todos.bulkUpsert(rows, { conflictColumns: ['id'] });
```

- `bulkInsert` chunks to respect pg parameter-count limits (~65k bindings / chunkSize).
- `bulkUpdate` issues a single `UPDATE … SET col = CASE WHEN … END` statement.
- `bulkUpsert` delegates to the existing `onConflict().merge()` primitive with chunking.

---

### B. Type-safety Enhancements - DONE

#### 4. Ad-hoc DTO projections via `.select(t => ({ … }))`

Typed selector that produces a custom result shape without pre-registering a named projection.

```ts
const dtos = await db.todos
    .where(t => t.userId, userId)
    .select(t => ({ id: t.id, title: t.title }))   // inferred as { id: number, title: string }[]
    .all();
```

- Selector is called with a `PropertyDescriptorTree` proxy that records accessed descriptors.
- Emits `SELECT col AS alias` and replaces `EntityResult` with the inferred DTO shape.
- Requires a small addition to `SchemaQueryBuilder` (typed projection-by-selector).

---

#### 5. Discriminated-union types for polymorphic entities

When an entity uses `.withVariants()`, `EntityResult<T>` becomes a discriminated union keyed by the discriminator field instead of a flat merged type.

```ts
// Before: { type: string; assigneeId?: number; comment?: string; … }
// After:
// | { type: 'assigned'; assigneeId: number; … }
// | { type: 'commented'; comment: string; … }

const activity = await db.activities.find(1);
if (activity?.type === 'assigned') {
    activity.assigneeId;  // ✅ narrowed
}
```

- `.includeVariant(key, rel)` narrows the result so the relation is only present on the matching branch.
- New helper types: `EntityResultByVariant<TEntity>`, `WithVariantIncluded<TEntity, Variant, Rel>`.

---

### C. Migrations & CLI - DONE

#### 6. `@cleverbrush/orm-cli` — new package

A standalone CLI package (`@cleverbrush/orm-cli`) with no runtime ORM dependency. Loads a user-supplied `db.config.ts` that exports `{ knex, entities }`.

```
cleverbrush migrate generate <name>   # diff DB → schema, emit TS migration file
cleverbrush migrate run               # knex.migrate.latest()
cleverbrush migrate rollback          # knex.migrate.rollback()
cleverbrush migrate status            # list applied/pending migrations
cleverbrush db push                   # sync schema to DB in-place (dev only)
```

- `generate` runs `introspectDatabase` + `diffSchema` per entity, calls `generateMigration`, writes timestamped `.ts` file to the configured migrations directory.
- `db push` calls `generateCreateTable` / `alterTable` directly — no migration file written.
- ESM-only; resolves TypeScript config files via `tsx` / `jiti`.
- Migration directory and naming pattern are configurable in `db.config.ts`.
- Lives at `libs/orm-cli/` with its own `package.json` (bin: `cleverbrush`).

---

### D. Polymorphism Refinements

#### 7. First-class polymorphic write API

Type-safe variant-specific CRUD on `DbSet`. Variant-key parameter narrows the payload type via the variants map declared on the entity.

```ts
// Insert (CTI: transactionally inserts base row then variant row with shared PK):
const activity = await db.activities.insertVariant('assigned', {
    todoId: 42,
    userId: 7,
    assigneeId: 9           // <- only valid for 'assigned' variant; type-checked
});

// Update variant-specific columns:
await db.activities
    .where(t => t.id, activityId)
    .updateVariant('assigned', { assigneeId: 10 });

// Delete (CTI: variant row deleted first, then base row):
await db.activities
    .where(t => t.id, activityId)
    .deleteVariant('assigned');

// Find with discriminated result:
const activity2 = await db.activities.findVariant('assigned', activityId);
// -> { type: 'assigned'; assigneeId: number; … } | undefined
```

Depends on the discriminated-union types from Feature 5.

---

### E. Change Tracking Foundation

#### 8. Tracked `DbContext` (opt-in)

```ts
const db = createDb(knex, { todos, users }, { tracking: true });

// Identity map: same PK -> same object reference
const a = await db.todos.find(1);
const b = await db.todos.find(1);
console.log(a === b);  // true

// Mutate and flush:
a!.title = 'Changed';
await db.saveChanges();  // issues a single UPDATE for dirty rows

// Explicit state control:
db.attach(existingRow);
db.detach(existingRow);
db.todos.remove(existingRow);          // marks for DELETE on next saveChanges()
db.entry(existingRow).state;           // 'Added' | 'Unchanged' | 'Modified' | 'Deleted'

// Per-query opt-out:
const snapshot = await db.todos.asNoTracking().all();
```

- Identity map is `WeakRef`-backed (Node >= 14.6) to avoid memory leaks.
- `saveChanges()` diffs current value vs snapshot, emits batched UPDATEs and INSERTs in FK-dependency order (shared algorithm with `.save()` from Feature 2), all in one transaction.
- **Concurrency tokens**: columns marked `.concurrencyToken()` (new schema extension) are checked on UPDATE; version mismatch throws `ConcurrencyError`.
- `.include()`d related rows are auto-attached unless the query is `.asNoTracking()`.
- **Non-goals for this phase**: lazy navigation loading, automatic relation fixup, async streaming.

---

## Implementation Phases

### Phase 1 — Foundations & quick wins (all parallel)

| Step | Feature | Primary files |
|------|---------|--------------|
| 1 | `.find()` / `.findOrFail()` / `.findMany()` | `libs/orm/src/dbset.ts` |
| 2 | Bulk helpers | `libs/orm/src/dbset.ts` |
| 3 | `@cleverbrush/orm-cli` scaffold | `libs/orm-cli/` (new package) |

### Phase 2 — Type-safety & polymorphism

| Step | Feature | Primary files |
|------|---------|--------------|
| 4 | DTO `.select()` projections | `libs/orm/src/dbset.ts`, `libs/knex-schema/src/SchemaQueryBuilder.ts` |
| 5 | Discriminated-union types | `libs/orm/src/result-types.ts` |
| 6 | Polymorphic write API | `libs/orm/src/dbset.ts` (depends on step 5) |

### Phase 3 — Save graph & change tracking (sequential)

| Step | Feature | Primary files |
|------|---------|--------------|
| 7 | Save graph | `libs/orm/src/dbset.ts`, `libs/orm/src/dbcontext.ts` |
| 8 | Tracked `DbContext` | `libs/orm/src/dbcontext.ts` (depends on step 7 + step 1) |

---

## Affected Files

| File | Change |
|------|--------|
| `libs/orm/src/dbset.ts` | Add `.find()`, `.findOrFail()`, `.findMany()`, bulk helpers, `.save()`, polymorphic write methods, `.remove()`, `.asNoTracking()` |
| `libs/orm/src/dbcontext.ts` | Add `tracking` option, identity map, `attach` / `detach` / `entry` / `saveChanges` |
| `libs/orm/src/result-types.ts` | Add `EntityResultByVariant`, `WithVariantIncluded`, `SelectProjection<TEntity, TSelector>` |
| `libs/orm/src/entity.ts` | Re-export new variant write helpers and concurrency-token marker |
| `libs/orm/src/index.ts` | Export `EntityNotFoundError`, `ConcurrencyError`, tracking types |
| `libs/knex-schema/src/SchemaQueryBuilder.ts` | Typed projection-by-selector, CASE-based bulk update |
| `libs/knex-schema/src/migration.ts` | Add `generateMigrationsForContext(entities, knex)` helper for the CLI |
| `libs/knex-schema/src/extension.ts` | Add `.concurrencyToken()` extension for number / string / date |
| **NEW** `libs/orm-cli/` | Bin entry + `src/commands/{generate,run,rollback,status,push}.ts` |
| `demos/todo-backend/src` | Adopt `.find()`, `.save()`, `.insertVariant()` in handlers |

---

## Verification

1. **Unit tests** (`libs/orm/src/*.test.ts`):
   - `.find(id)` returns the row; `.findOrFail()` throws `EntityNotFoundError`.
   - `.bulkInsert([...1 000 rows])` chunks at the configured size; `.bulkUpdate` emits a single CASE statement (assert via `.toQuery()`).
   - `.save(graph)` inserts parent + children in FK-dependency order; rolls back atomically on error.
   - Tracked context: `db.todos.find(1) === db.todos.find(1)` (identity map); mutating a tracked entity then `await db.saveChanges()` issues a single UPDATE; concurrency mismatch throws `ConcurrencyError`.
   - Polymorphic `.findVariant('assigned', id)` returns the correctly narrowed branch.

2. **Type-level tests** (`tsd`):
   - `EntityResult` of a variant entity is a discriminated union.
   - `.includeVariant('assigned', 'assignee')` adds `assignee` only on the `'assigned'` branch.
   - `.select(t => ({ id: t.id, n: t.name }))` infers `{ id: number; n: string }[]`.

3. **CLI integration test** (postgres via `docker-compose.yml`):
   - `cleverbrush migrate generate init` from todo-backend entities produces a TS migration that compiles.
   - `cleverbrush migrate run` brings the DB to expected state (verified via `introspectDatabase`).

4. **Demo end-to-end**: extend `demos/todo-backend` to call `.find()`, `.save()`, `.insertVariant()`; existing `libs/server-integration-tests` pass.

---

## Design Decisions

- **No lazy loading** — keeps the proxy footprint small and avoids hidden N+1 queries.
- **Change tracking is opt-in** (`{ tracking: true }`) — default path stays zero-overhead.
- **CLI is a separate package** (`@cleverbrush/orm-cli`) — runtime ORM remains dependency-light.
- **Save graph before tracking** — both share the FK-dependency-ordering algorithm; shipping `.save()` first lets users adopt it independently.
- **DTO projections touch `knex-schema`** — the typed projection-by-selector is a small, clean addition to `SchemaQueryBuilder`.
- **Polymorphic write API supersedes** the current pattern of manually inserting base + variant rows.

---

## Further Considerations

1. **Concurrency-token extension location** — recommend adding `.concurrencyToken()` as a `defineExtension` on `knex-schema` (number / string / date), so the tracking layer reads it via `introspect()`. Alternative: ORM-side registry. **Recommendation: extension.**
2. **Auto-attach on `.include()`** — recommend included related rows are auto-attached in tracking mode (EF Core parity), with `.asNoTracking()` as per-query opt-out. Alternative: never auto-attach.
3. **Identity-map GC** — `WeakRef`-backed map (Node >= 14.6) is preferred over requiring `db.clear()`. Fall back to explicit `db.clear()` only if `WeakRef` support is a concern.
