# @cleverbrush/deep

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
