# Projection-aware reads and synchronous mapping

`withRowSchema()` is an **opt-in PostgreSQL read API**. Existing queries and
`getMapper()` retain their existing behavior. Schema-aware queries are immutable,
detached read plans: capture the returned value when adding filters or includes.
They do not track entities, save changes, or run SQL when inspecting metadata.

## Before and after

Previously, a projection needed a separately maintained source schema:

```ts
const Source = object({ id: number(), name: string(), lastSeen: date().nullable() });
const registry = mapper().configure(Source, PublicUser, m => m
    .for(t => t.lastSeen).compute(s => s.lastSeen ?? undefined));
const toUser = registry.getMapper(Source, PublicUser);
const result = await Promise.all(rows.map(toUser));
```

The query now supplies that schema, and pure mapping needs no promises:

```ts
const read = db.users.withRowSchema().select(u => ({
    id: u.id, name: u.name, lastSeen: u.lastSeen
}));
const Source = read.rowSchema;
const toUser = mapper().configure(Source, PublicUser, m => m
    .for(t => t.lastSeen).compute(s => s.lastSeen ?? undefined))
    .getSyncMapper(Source, PublicUser);
const result = (await read.where(u => u.active, true)).map(toUser);
```

Select sensitive fields explicitly. The mapper does not fetch data, authorize
access, enrich rows, or decide how database nulls should appear in public DTOs.

## Definitions can live in separate files

```ts
// user-read.ts
import { createQuery, date, number, object, string } from '@cleverbrush/knex-schema';
import { knex } from './database.js';

const UserTable = object({
    id: number().primaryKey(), name: string(),
    lastSeen: date().optional().hasColumnName('last_seen'),
    secret: string()
}).hasTableName('users');

export const userRead = createQuery(knex)(UserTable).withRowSchema()
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

## What values does the schema describe?

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

Timezone-less SQL dates/timestamps are interpreted as UTC in this opt-in mode;
explicit offsets preserve their instant. Native date fields are projected as text
before decoding, so root and nested values do not depend on a driver's local-time
date parser. This is a deliberate opt-in convention, not a change to legacy reads.

Input defaults, preprocessors and input-only validators are not replayed on stored
rows. Read schemas are structural output schemas. Optional schemas with input
defaults are rejected: `optional().default(...)` hides the storage requirement
in the inferred input/output type. Keep defaults in a separate input schema,
and use an accurately required/optional storage schema for these reads.
JavaScript `Date` has
millisecond precision: use explicit application representations if an API must
expose microseconds. Composite cursor tokens retain native timestamp precision
in private text columns, independently of the public date values.

## Projections, aliases and aggregates

```ts
const read = query(knex, alias(UserTable, 'user')).withRowSchema()
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
parser objects without schema introspection are rejected in this mode.

## Nested graphs

Declare relations on entities as usual, and return the child query from customizers:

```ts
const read = db.projects.withRowSchema()
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

## Polymorphic graphs and explicit dispatch

STI/CTI entities produce a genuine union `rowSchema` and an object schema for each
discriminator in `variantRowSchemas`. All declared branch bodies are selected by
default. Use `selectVariants(['photo'])` to narrow the returned union, or
`forVariant()` to project a branch or load its relations:

```ts
const read = db.assets.withRowSchema()
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

## Boundaries and migration

- Enter read mode **before** legacy select/include/join, ordering/pagination,
  raw callbacks or variant-specific operations. Continue configuration on the
  immutable reader. Default scopes may filter rows but must not preselect,
  order or paginate them.
- The opt-in surface is deliberately read-only. It is not a replacement for
  entity writes or tracked queries, and has no raw SQL shape escape hatch.
- Reads are PostgreSQL-oriented; this does not promise equivalent JSON/CTI SQL
  behavior on other Knex dialects.
- Declared graph metadata must match storage. Unsupported opaque shapes throw
  rather than pretending an entity schema describes their output. Explicit
  TypeScript assertions such as `hasType()` remain the caller's responsibility.
- Existing queries keep their old mutability and driver-value behavior. Migrate
  one read at a time; do not replace all application nulls or numeric values
  globally.
- `getSyncMapper()` accepts only complete mappings with synchronous final steps
  and nested mappings. It never probes callbacks. Known async mappings are
  rejected; a disguised thenable throws when invoked. Keep `getMapper()` for
  asynchronous work. Fetch/enrich data explicitly before pure mapping.

Run the mapper-only benchmark with
`npm run bench -- --project benchmarks mapper.bench.ts`. It compares prepared
sync/async functions with identical rows and excludes SQL/network time. Do not
interpret its result as an endpoint-latency guarantee.
