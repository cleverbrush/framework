---
"@cleverbrush/mapper": minor
"@cleverbrush/knex-schema": minor
"@cleverbrush/orm": minor
---

Add opt-in immutable, detached PostgreSQL reads with projection-aware runtime
schemas, precise decimal/bigint decoding, nested relation graphs and explicit
STI/CTI branch schemas. Reuse result schemas directly in separately defined
application mappings without duplicating projection schemas.

Add `getSyncMapper()` with synchronous eligibility inferred through the existing
`configure()` API, completeness checks, nested mapping propagation and runtime
thenable guards. Existing queries and asynchronous mapping behavior are unchanged.
