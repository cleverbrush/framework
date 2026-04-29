---
'@cleverbrush/knex-schema': major
'@cleverbrush/schema': patch
---

Add named projections to `@cleverbrush/knex-schema`.

**`@cleverbrush/knex-schema`** — new feature

- `ObjectSchemaBuilder.projection(name, columns)` — define a named column subset on the schema.
  Two forms are supported:
  - **String-tuple form**: `.projection('summary', ['id', 'title'] as const)` — the column list
    is a `readonly string[]` const that TypeScript uses to narrow the query result type.
  - **Accessor form**: `.projection('detail', t => [t.id, t.title])` — refactor-safe accessor that
    resolves property names at runtime via the schema's property-descriptor tree.
- `SchemaQueryBuilder.projected(name)` — apply a named projection at query time.
  - Restricts the `SELECT` clause to the registered columns (respecting `hasColumnName()` mappings).
  - Narrows the TypeScript result type to `Pick<Row, Keys>` for tuple-form projections.
  - Registered projection names are constrained at the type level — unregistered names are a
    compile-time error.
  - Throws at runtime if combined with `.select()`, `.distinct()`, or any aggregate method
    (`.count()`, `.min()`, etc.) on the same query.
- Calling `.projection()` with a name that is already registered on the schema throws immediately.

**`@cleverbrush/schema`** — internal extension

- `PROJECTION_BRAND` unique symbol exported from the core extension system.
- `FixedMethods` updated with a 4th `TProjections` type parameter that accumulates the
  name → keys map as `.projection()` calls are chained, enabling `SchemaQueryBuilder` to
  extract the column list at the type level.
- `PropertyDescriptor` / `PropertyDescriptorInner` now accept an optional 4th type parameter
  `TPropertyKey extends string = string` that carries the property key literal so accessor-form
  descriptors can propagate their key name through the type system.
