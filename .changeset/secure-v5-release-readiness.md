---
'@cleverbrush/async': major
'@cleverbrush/auth': major
'@cleverbrush/client': major
'@cleverbrush/deep': major
'@cleverbrush/di': major
'@cleverbrush/env': major
'@cleverbrush/knex-clickhouse': major
'@cleverbrush/knex-schema': major
'@cleverbrush/log': major
'@cleverbrush/mapper': major
'@cleverbrush/orm': major
'@cleverbrush/orm-cli': major
'@cleverbrush/otel': major
'@cleverbrush/react-form': major
'@cleverbrush/scheduler': major
'@cleverbrush/scheduler-postgres': major
'@cleverbrush/schema': major
'@cleverbrush/schema-json': major
'@cleverbrush/server': major
'@cleverbrush/server-openapi': major
'@cleverbrush/storage': major
'@cleverbrush/storage-s3': major
---

Require Node.js 24+ consistently across all published packages. Correct the root and all published-package license files to BSD-3-Clause, matching package metadata and documentation, and verify license consistency in source and npm tarballs. See docs/MIGRATION-v5.md for migration guidance.

Harden JWT key/algorithm and claim validation, cookie parsing/serialization, and request-body lifecycle handling. Require explicit authorization scope for bounded server idempotency; coalesce concurrent retries and capture full response bodies. Bound response caching and bypass private, no-store and cookie-setting responses.

Preserve DI scope validation through factories and propagate registered optional-service failures. Fix batch response status/header capture, timeout abort-listener cleanup, concurrent deduplication response cloning, CLI database cleanup on validation/production-guard failures, and the missing client idempotency JavaScript export. Update security-sensitive dependencies and ensure OpenTelemetry disable flags override SDK defaults.

Add regression tests, package-consumer smoke checks, package-level unit coverage floors, migration/security documentation and release validation gates.
