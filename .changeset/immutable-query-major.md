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

This breaking release requires consumers to retain returned query builders, return synchronous builders from scopes and grouped predicates, and supply an explicit Framework object output schema for opaque raw SELECTs. Remove withRowSchema() calls: ordinary, aliased, polymorphic and ORM queries now expose their row schemas directly. Projections replace scalar selections, and projected/aggregate/raw queries cannot perform entity writes. Reads and write-returning rows consistently preserve exact decimal/bigint strings, Date objects and SQL nulls.

All published Framework packages advance together to the next major version. See the knex-schema and ORM migration guides before upgrading; tracked entity objects remain mutable.
