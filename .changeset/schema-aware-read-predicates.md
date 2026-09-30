---
"@cleverbrush/knex-schema": minor
---

Add shape-preserving grouped AND/OR predicates, captured IN/EXISTS subqueries,
bound raw predicates and ordering, and typed SQL column references to ordinary
and aliased schema-aware readers. These capabilities also work in ordinary ORM
reads and nested relation customizers while retaining immutable query plans and
stable row-schema identity. Group callbacks are synchronous and predicate-only;
unrestricted raw query mutation remains unavailable.
