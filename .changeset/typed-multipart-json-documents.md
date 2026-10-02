---
"@cleverbrush/schema": minor
"@cleverbrush/schema-json": minor
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

Add strict JsonValue/JsonObject schemas and lossless JSONB reads and writes,
including objects explicitly accepting unknown properties. Preserve JSON through
returning rows and projections, serialize root JSON arrays/scalars correctly,
and track nested document edits independently in the ORM. Fix the PostgreSQL
upsert returning path exercised by document round trips.
