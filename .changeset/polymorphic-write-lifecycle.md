---
"@cleverbrush/orm": major
"@cleverbrush/knex-schema": patch
---

Honor hooks, timestamps and base-schema soft deletion in explicit variant writes
and tracked polymorphic saves, for single-table and class-table inheritance.
Add `ofVariant(key).restore()` and `hardDelete()`; CTI soft deletion retains the
child row, while permanent deletion removes both rows atomically.

**Migration:** Variant `delete()` now respects the base schema's `.softDelete()`.
Use `hardDelete()` for physical removal, and `withDeleted()` to include hidden
rows. Review lifecycle hooks that now run, and remove identity/discriminator/join
keys from update patches. This change is part of the coordinated v5 major release.

Capture mutation targets inside the write transaction, preserve query restrictions
and transaction bindings, and use savepoints for caller-owned transactions. Fix
base/variant column mapping and visibility of extension-managed deletion columns;
retain exact numeric keys and tracked optimistic-concurrency/rollback semantics.
