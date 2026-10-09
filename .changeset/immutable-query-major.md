---
"@cleverbrush/async": major
"@cleverbrush/auth": major
"@cleverbrush/client": major
"@cleverbrush/deep": major
"@cleverbrush/di": major
"@cleverbrush/env": major
"@cleverbrush/knex-clickhouse": major
"@cleverbrush/knex-schema": major
"@cleverbrush/log": major
"@cleverbrush/mapper": major
"@cleverbrush/orm-cli": major
"@cleverbrush/orm": major
"@cleverbrush/otel": major
"@cleverbrush/react-form": major
"@cleverbrush/scheduler": major
"@cleverbrush/schema-json": major
"@cleverbrush/schema": major
"@cleverbrush/server-openapi": major
"@cleverbrush/server": major
---

Make Framework query builders immutable and infer row schemas automatically.

Retain returned query builders, return synchronous builders from scopes and grouped predicates, and supply an explicit Framework object output schema for opaque raw SELECTs. Ordinary, aliased, polymorphic and ORM queries expose their row schemas directly. Projections replace scalar selections, and projected/aggregate/raw queries cannot perform entity writes. Reads and write-returning rows consistently preserve exact decimal/bigint strings, Date objects and SQL nulls.

All published Framework packages advance together to the next major version. Tracked entity objects remain mutable.

### Migrating from v4.x to v5

Remove `withRowSchema()` calls and retain each configured query instead of relying on mutation. Replace raw base-query overloads with explicit output contracts. See `libs/knex-schema/MIGRATION-v5.md` for the complete migration guide.
