---
'@cleverbrush/knex-schema': minor
'@cleverbrush/orm': minor
---

Add `parameter('name')` for callable PostgreSQL SELECT templates with schema-inferred positional arguments. Compile SQL, binding slots and decoding once on first invocation or `.toSQL(...)`; reuse them with independent values on later calls. `.query(...)` returns an ordinary composable bound reader.

Support repeated names, grouped filters, fixed membership/range slots, alias joins, relation and STI/CTI customizers, and caller-owned transactions. Preserve storage types, null comparison semantics, result schemas, property navigation, and ORM identity tracking. Reject unsupported placeholder positions and unbound terminals or writes before execution.
