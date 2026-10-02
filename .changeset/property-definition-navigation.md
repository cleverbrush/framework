---
'@cleverbrush/knex-schema': patch
'@cleverbrush/orm': patch
'@cleverbrush/mapper': patch
'@cleverbrush/schema-json': patch
'@cleverbrush/server': patch
'@cleverbrush/deep': patch
---

Preserve original property declarations and JSDoc through derived types so
editors can navigate to definitions and show property documentation. This covers
query selectors, rows, projections and write payloads; declared relation includes;
mapper targets; JSON Schema inferred values; composed API groups and injected
services; and merged object properties. Runtime behavior is unchanged.
