---
'@cleverbrush/knex-schema': minor
'@cleverbrush/orm': minor
---

Add immutable connection-independent query definitions with `query(Schema)`.
Define typed reads once and supply a Knex connection or transaction through
`definition(knex, ...values)`, `.query(knex, ...values)` or `.toSQL(knex, ...values)`.

Preserve inferred parameters, projections, relation/variant schemas and existing
connection-first APIs. Capture selectors/scopes/customizers once, compile SELECTs
lazily per definition and actual Knex instance, and bind ordinary readers before
native SQL composition, pagination or supported writes. Include runtime,
declaration and PostgreSQL integration coverage and multi-file usage guidance.
