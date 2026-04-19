# @cleverbrush/mapper

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/schema@3.0.1

## 3.0.0

### Patch Changes

- Updated dependencies [60efc99]
- Updated dependencies [2f06dc4]
- Updated dependencies [f0f93ba]
- Updated dependencies [0df3d59]
- Updated dependencies [0cc7cbe]
- Updated dependencies [181f89e]
- Updated dependencies [8979127]
- Updated dependencies [b8f1285]
- Updated dependencies [3473d7e]
- Updated dependencies [308c9ea]
- Updated dependencies [26a7d85]
  - @cleverbrush/schema@3.0.0

## 2.0.0

### Major Changes

- 13ce119: # Release 2.0.0

  ## @cleverbrush/mapper

  ### New Package

  A type-safe, declarative object mapper for converting objects between different `@cleverbrush/schema` representations.

  - **Compile-time completeness** — TypeScript produces an error if any target property is not mapped, auto-mapped, or explicitly ignored.
  - **Type-safe selectors** — `.for((t) => t.name).from((s) => s.name)` — fully type-checked, not string-based.
  - **Auto-mapping** — properties with the same name and compatible type are mapped automatically.
  - **Custom transforms** — `.compute((source) => ...)` for arbitrary source-to-target property conversions.
  - **`.ignore()`** — explicitly mark target properties as intentionally unmapped.
  - **Nested schema support** — map deeply nested object and array properties.
  - **Immutable registry** — `configure()` returns a new registry; safe to share and extend.
  - **`mapper()` factory function** — convenient entry point to create and configure mapping registries.
  - **Validation of target schema** — the mapper validates that properties referenced in the target schema actually exist.
  - **Depends on** `@cleverbrush/schema@^2.0.0`.

  ***
