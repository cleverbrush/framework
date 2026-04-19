---
"@cleverbrush/async": patch
"@cleverbrush/auth": patch
"@cleverbrush/client": patch
"@cleverbrush/deep": patch
"@cleverbrush/di": patch
"@cleverbrush/env": patch
"@cleverbrush/knex-clickhouse": patch
"@cleverbrush/knex-schema": patch
"@cleverbrush/mapper": patch
"@cleverbrush/react-form": patch
"@cleverbrush/scheduler": patch
"@cleverbrush/schema": patch
"@cleverbrush/schema-json": patch
"@cleverbrush/server": patch
"@cleverbrush/server-openapi": patch
---

`@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
