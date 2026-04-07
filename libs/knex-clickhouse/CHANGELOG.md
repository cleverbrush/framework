# @cleverbrush/knex-clickhouse

## 2.0.0

### Major Changes

- 13ce119: # Release 2.0.0

  ## @cleverbrush/knex-clickhouse

  ### Breaking Changes

  - **Removed `preQueryCallback` parameter** from `getClickhouseConnection()` — the third parameter for pre-query callbacks is no longer supported. If you relied on this to wake idle servers before queries, implement that logic externally.
  - **Removed `ClickHouseClient` re-export** — import `ClickHouseClient` directly from `@clickhouse/client` instead.

  ### Changes

  - Updated `@clickhouse/client` dependency from `^1.7.0` to `^1.18.2`.
  - Cleaned up internal type casts (`as any` removals).
  - Changed `null` return to `undefined` for absent retry options.

  ### Build & Tooling

  - Migrated to `tsup` for bundling with sourcemap generation.
  - Added `exports` field in `package.json`.

  ***
