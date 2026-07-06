---
'@cleverbrush/client': minor
'@cleverbrush/env': minor
'@cleverbrush/knex-schema': minor
'@cleverbrush/orm': minor
'@cleverbrush/orm-cli': minor
'@cleverbrush/server': minor
---

Add framework affordances discovered while reviewing Xpenser:

- `@cleverbrush/env`: add `envBoolean()` for environment-style boolean values
  such as `1`, `0`, `yes`, `no`, `on`, and `off`.
- `@cleverbrush/server`: parse `application/x-www-form-urlencoded` request
  bodies by default, add `ActionResult.raw()`, and allow ordered
  authentication fallback with `trySchemes`.
- `@cleverbrush/client`: add `externalCacheTags()` to
  `@cleverbrush/client/cache` for framework-agnostic external cache tag
  invalidation, including Next.js `revalidateTag()` as one supported callback.
- `@cleverbrush/knex-schema` / `@cleverbrush/orm`: add
  `InferDatabaseRow` / `InferDatabaseValue` row typing helpers and support raw
  update expressions plus conditional `where` callbacks in
  `onConflict().merge()`.
- `@cleverbrush/orm-cli`: add read-only `cb-orm validate` for live schema drift
  checks.

Docs and package READMEs were updated; see https://docs.cleverbrush.com.
