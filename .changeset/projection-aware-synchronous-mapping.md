---
"@cleverbrush/mapper": minor
"@cleverbrush/knex-schema": minor
"@cleverbrush/orm": minor
"@cleverbrush/schema": minor
"@cleverbrush/di": minor
---

Add opt-in immutable, detached PostgreSQL reads with projection-aware runtime
schemas, precise decimal/bigint decoding, nested relation graphs and explicit
STI/CTI branch schemas. Reuse result schemas directly in separately defined
application mappings without duplicating projection schemas.

Add `getSyncMapper()` with synchronous eligibility inferred through the existing
`configure()` API, completeness checks, nested mapping propagation and runtime
thenable guards. Existing queries and asynchronous mapping behavior are unchanged.

Add application-agnostic typed metadata extension methods that retain metadata
through immutable chains. Use these in database extensions without modifying
global schema prototypes.

Preserve typed function-schema compatibility in dependency injection when a
function declares its return schema.
