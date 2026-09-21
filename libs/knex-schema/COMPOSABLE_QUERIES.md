# Composable read queries

These APIs are additive. Existing single-schema selectors, nested eager loading,
legacy aggregate methods, and single-column cursor calls remain available.

## Typed flat joins

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
awaiting the query. `apply`/`toKnexQuery` remain raw escape hatches whose effects
on result shape/cardinality are the caller's responsibility. Values remain bound
and identifiers quoted. Flat collection joins can repeat parents; they do not
deduplicate or fetch one related row at a time. Choose ORM eager loading for
nested related objects instead.

For reusable connection/transaction handling, ordinary and aliased schemas retain
the same inference through `createQuery(knex)`, `withTransaction(trx)`, and
`transaction(callback)`. Only ordinary-schema calls accept a custom Knex base
query. These APIs and their JSDoc are also available through `@cleverbrush/orm`.

## Aggregates with optional output schemas

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
bigint extrema retain strings; because existing SQL overrides are not fully
represented in schema types, numeric extrema are conservatively typed as
`number | string | null`. Date extrema return `Date | null`.

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
empty grouped query returns no rows. Legacy `.count()`, `.sum()`, etc. keep their
existing behavior and signatures.

## Eager-loading order

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

## Composite cursors

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

## Integration verification

From the repository root, run `npm run test:queries:integration` with
`QUERY_TEST_DATABASE_URL` pointing to a dedicated PostgreSQL test database.
The suite creates/drops only its randomly named fixture tables and fails if the
URL is missing. CI runs PostgreSQL 16 integration tests alongside unit/type tests.
