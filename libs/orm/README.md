# @cleverbrush/orm

EF-Core-like typed ORM layer on top of `@cleverbrush/knex-schema`.

- Define entities with `defineEntity(schema)` and declare relations via
  `.hasOne()` / `.hasMany()` / `.belongsTo()` / `.belongsToMany()`.
- Group entities into a context with `createDb(knex, { todos, users })`
  and access typed `DbSet`s as `db.todos`, `db.users`.
- Eager-load related entities with `db.todos.include(t => t.author)`.
- Model inheritance with `.withVariants()` (table-per-type and single-table).

See the source for the full API surface.
