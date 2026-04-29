# @cleverbrush/deep

## 4.0.0

## 3.1.0

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.

## 3.0.0

## 2.0.0

### Major Changes

- 13ce119: # Release 2.0.0

  ## @cleverbrush/deep

  ### Breaking Changes

  - **Removed default export** — only named exports (`deepEqual`, `deepExtend`, `deepFlatten`, `Merge`) are available. Update `import deep from '@cleverbrush/deep'` to `import { deepEqual, deepExtend, deepFlatten } from '@cleverbrush/deep'`.

  ### Build & Tooling

  - Migrated to `tsup` for bundling with sourcemap generation.
  - Added `exports` field in `package.json`.
  - Migrated tests from Jest to Vitest.

  ***
