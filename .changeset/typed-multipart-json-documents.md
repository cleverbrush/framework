---
"@cleverbrush/server": minor
"@cleverbrush/client": minor
"@cleverbrush/server-openapi": minor
"@cleverbrush/knex-schema": minor
"@cleverbrush/orm": minor
---

Add schema-based single and multiple file upload contracts, typed multipart client
serialization, and matching OpenAPI schemas. Enforce multipart body, file, field,
and part limits, reject truncated or duplicate singleton uploads, and support
file-only endpoints. Existing options-only uploads retain their single-file
shape and explicit MIME rejection reporting.

Add lossless JSONB object reads and writes using native object schemas with
`.acceptUnknownProps().jsonb()`. Preserve nested extension data through returning
rows and projections, validate JSON extensions in the database layer, align
nullable object column DDL with reads, and track nested edits independently in
the ORM. Fix the PostgreSQL
upsert returning path exercised by document round trips.
