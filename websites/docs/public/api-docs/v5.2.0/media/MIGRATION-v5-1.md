# Migrating from Framework v4.x to v5: immutable queries

This is a coordinated **major release of all 19 published Framework packages**.
Upgrade them together. Prerelease snapshots still use beta versions; the stable
changeset release is major. There is no mutable compatibility mode.

Schema builders were already immutable. This release makes **query builders**
immutable too, so their inferred TypeScript result and runtime `rowSchema` cannot
drift when a shared query is configured elsewhere. SQL remains lazy: configuration
and metadata access do not execute it; each await/execute runs a new statement.

## 1. Keep every configured query

Before:

```ts
const users = db.users.query();
if (search) users.where('name', 'ilike', `%${search}%`);
users.orderBy('id');
return users;
```

After:

```ts
let users = db.users.query();
if (search) users = users.where('name', 'ilike', `%${search}%`);
return users.orderBy('id');
```

Independent branches can safely share a base:

```ts
const enabled = query(knex, User).where('enabled', true);
const firstPage = enabled.orderBy('id').limit(20);
const matching = enabled.where('name', 'Alice');
// Neither branch changes enabled or its sibling.
```

Audit helpers, loops, conditional filters, transactions, relation customizers,
scopes and retained query variables. Ignoring a returned builder now does nothing.
`toKnexQuery()` returns an independently mutable snapshot; executing that native
snapshot bypasses Framework decoding and ORM tracking.

## 2. Return synchronous Framework configuration results

Before:

```ts
query(knex, User).where(group => {
    group.where('name', 'Alice');
    group.orWhere('name', 'Bob');
});
```

After:

```ts
query(knex, User).where(group =>
    group.where('name', 'Alice').orWhere('name', 'Bob'));

db.projects.include(r => r.tasks, tasks =>
    tasks.where('done', false).orderBy('id').limit(3));
```

Grouped predicates expose predicates only. Scopes expose filters, ordering and
paging, not selection, writes or execution. All Framework customizers must return
a configured builder derived from the supplied one; void, async and unrelated
results are rejected. Configuration callbacks run once when attached. An empty
group must return its input unchanged. Later branches from a retained group cannot
modify the attached query. Transaction work callbacks remain asynchronous.

Default scopes run once when the source is created. Cloning, inspecting metadata,
rendering SQL and repeated execution do not rerun them. `.unscoped()` removes only
the default scope; explicit predicates remain. It **does not** disable soft deletion:
use `.withDeleted()` or `.onlyDeleted()` explicitly. A default scope and caller OR
groups are combined independently, so OR cannot bypass the default scope.

## 3. Remove `.withRowSchema()` and use the actual result schema

Before:

```ts
const userRead = query(knex, User).withRowSchema()
    .select(u => ({ id: u.id, name: u.name }));
```

After:

```ts
export const userRead = query(knex, User)
    .select(u => ({ id: u.id, name: u.name }));
export const UserRow = userRead.rowSchema;
```

`userRead` is a prepared query, not a schema or a row. `UserRow` describes exactly
the decoded result. Export both from a query module and import the schema into
separate mapper modules; no monolithic query/mapper expression is needed. The
[README](./README.md#definitions-can-live-in-separate-files) has a compiled
four-file example. Filters, ordering, paging and transaction clones retain schema
identity, allowing reuse of prepared mapper registrations.

`select()` and `projected()` replace the scalar selection on a new query; existing
queries are unchanged. Included relation fields remain independent. Aliased flat
joins need an explicit non-empty selection before reading metadata or executing.
Polymorphic roots expose a union `rowSchema` and per-variant `variantRowSchemas`.
Use `forVariant()` for typed branch projections and retain the discriminator.
Use `selectVariants()` for union narrowing, and common root filters/order/pagination
for the combined result. Table-only operations are not advertised on ORM unions.

## 4. Adopt one storage representation for reads and writes

| Storage | Framework row value |
| --- | --- |
| Integer / floating-point column | finite `number` |
| Declared decimal / numeric / bigint | exact `string` |
| Optional / nullable SQL column | present property with a value or `null` |
| SQL date / timestamp | `Date` |
| Missing optional JSON property | absent property |
| Optional object relation / missing collection | `null` / `[]` |

These rules apply to ordinary reads, nested graphs, ORM reloads, inserts, upserts
and other returning writes. SQL text casts protect exact numbers before driver
parsing. Timezone-less timestamps are interpreted as UTC; JavaScript dates still
have millisecond precision. Input defaults, coercers and preprocessors are not
replayed on persisted rows. Separate request/input schemas from storage schemas;
optional storage fields with input defaults are ambiguous and rejected.

Before, application code often relied on an omitted optional property:

```ts
// Previous entity output type: { amount?: number; deletedAt?: Date }
```

After, derive the row type from `rowSchema` (or `EntityResult` / `InferDatabaseRow`):

```ts
// Decimal optional storage: { amount: string | null; deletedAt: Date | null }
// Map SQL null to undefined explicitly when an HTTP DTO omits optional fields.
```

Do not blindly convert exact strings to numbers. Use explicit domain conversion
only where rounding is acceptable. Insert/update payloads accept exact storage
values, and bigint optimistic-concurrency versions increment without rounding.

## 5. Declare complete raw output contracts

Implicit raw base-query overloads and untyped shape-changing escapes are removed.
Before:

```ts
const report = query(knex, User, knex('users').count({ total: '*' }));
```

After:

```ts
const Report = object({ total: number().coerce() });
const report = query(knex, User).apply(
    sql => sql.clearSelect().count({ total: '*' }),
    { output: Report }
);
// report.rowSchema === Report
const rows = await report;

const rawRows = await rawQuery(knex, Report,
    'select count(*)::text as total from users where enabled = ?', [true]);
```

`selectRaw(sql, bindings, { output })` uses the same contract. The output must be
a synchronous, introspectable Framework object schema. It parses each raw row
**once**, with no entity decoding pass or implicit column-to-property remapping.
Alias SQL columns to output property names and cast exact numeric expressions to
text yourself. SQL and bindings are captured; modifying a retained native builder
after configuration does not affect the query. Async raw callbacks are rejected.
Native Knex configuration is the explicit mutable boundary; return that builder
or `undefined`. Raw queries are read-only and detached. Raw SQL remains trusted
application code, not a sandbox or an authorization mechanism.

## 6. Keep entity writes and projection reads separate

Full ORM entity reads still use the identity map when tracking is enabled. Their
objects remain mutable, including the familiar `saveChanges()`, `reload()` and
concurrency flow. Repeated queries can return the same tracked object even though
the query builders are independent. Generated IDs/versions are applied to tracked
objects only after the write transaction commits.

Selected, grouped, distinct and raw rows are detached. Selecting every scalar
field explicitly is still a projection; it is not implicitly promoted to an entity.
Page containers and scalar results are not tracked. A partial row cannot overwrite
a full tracked entity. Writes through projections, relation-loaded queries or
aggregate queries are rejected both statically and at runtime. Start writes from
an unprojected table query; use ORM `ofVariant()` for polymorphic writes. Paginated
writes require a declared primary key.

Replace `joinOne` / `joinMany` `foreignQuery`, `mappers` and `orderBy` spec properties
with typed child customizers. Use application mappers after decoding for DTO changes.
Child default scopes and soft deletion apply automatically; disable them explicitly
on the child when that is the intended policy.

## 7. Review polymorphic mutation lifecycle

Variant writes and tracked polymorphic `saveChanges()` now honor lifecycle hooks,
timestamps and base-schema soft deletion for STI and CTI. Previously, explicit
variant updates/deletes and tracked mutations bypassed that pipeline; variant
`delete()` physically removed rows even when soft deletion was configured.

If physical removal is required, replace `.ofVariant(key).delete()` with
`.ofVariant(key).hardDelete()`. Use `.withDeleted()` to include previously deleted
rows. Restore with `.ofVariant(key).onlyDeleted().restore()`. CTI soft deletion
retains the child row; the base deletion marker controls entity visibility.

Variant updates now accept base and branch fields together, with correct column
mapping. Remove primary-key, discriminator and CTI join-key changes from update
payloads. Review hooks that may now execute: base hooks precede variant hooks,
insert/update hooks receive the combined payload, and after-insert hooks receive
the completed row. Do not assume hook side effects are undone on transaction rollback.
See the [ORM lifecycle contract](../orm/README.md#variant-deletion-and-lifecycle).

## Upgrade checklist

- Upgrade the fixed Framework package group together; remove `.withRowSchema()` calls.
- Retain returned queries and return synchronous configuration results.
- Replace raw base queries and shape-changing SQL with explicit output contracts.
- Audit API DTOs for exact numbers, dates, SQL nulls and storage/input separation.
- Migrate relation customizers and polymorphic branch projections.
- Review polymorphic deletion intent and hooks; use `hardDelete()` for permanent removal.
- Verify identity tracking, writes, transaction rollback and concurrency in the app.
- Run TypeScript, unit and real PostgreSQL tests; test representative endpoint flows.

This release does not change native Knex itself, make entity objects immutable,
introduce automatic DTO mapping, or guarantee equivalent graph SQL on other dialects.
