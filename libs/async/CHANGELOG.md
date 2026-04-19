# @cleverbrush/async

## 3.0.0

### Major Changes

- 4ee352a: Added `withTimeout()` utility for generic promise timeout with AbortSignal support.
  Added `dedupe()` utility for deduplicating concurrent async calls by key.

## 2.0.0

### Major Changes

- 13ce119: # Release 2.0.0

  ## @cleverbrush/async

  ### Build & Tooling

  - Migrated to `tsup` for bundling with sourcemap generation.
  - Added `exports` field in `package.json`.
  - Migrated tests from Jest to Vitest; replaced `jest.fn()` with `vi.fn()`.
  - Fixed `Collector` test that incorrectly expected a rejection.

  ***
