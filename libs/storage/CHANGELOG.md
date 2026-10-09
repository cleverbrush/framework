# @cleverbrush/storage

## 5.0.0

### Major Changes

- c5b4dbc: Require Node.js 24+ consistently across all published packages. Correct the root and all published-package license files to BSD-3-Clause, matching package metadata and documentation, and verify license consistency in source and npm tarballs. See docs/MIGRATION-v5.md for migration guidance.
  
  Harden JWT key/algorithm and claim validation, cookie parsing/serialization, and request-body lifecycle handling. Require explicit authorization scope for bounded server idempotency; coalesce concurrent retries and capture full response bodies. Bound response caching and bypass private, no-store and cookie-setting responses.
  
  Preserve DI scope validation through factories and propagate registered optional-service failures. Fix batch response status/header capture, timeout abort-listener cleanup, concurrent deduplication response cloning, CLI database cleanup on validation/production-guard failures, and the missing client idempotency JavaScript export. Update security-sensitive dependencies and ensure OpenTelemetry disable flags override SDK defaults.
  
  Add regression tests, package-consumer smoke checks, package-level unit coverage floors, migration/security documentation and release validation gates.

### Minor Changes

- 867bfd9: Add provider-neutral object storage contracts, portable errors and safe public URL
  mapping. Add an S3-compatible adapter with explicit custom endpoints, credentials,
  addressing style, key prefixes and independently configured public asset URLs.
  Support streamed reads, bounded multipart writes, metadata-preserving copies,
  idempotent deletion, cancellation and asynchronous disposal through `await using`
  on the shared storage contract. Include shared contract
  coverage, real Garage integration tests, and configuration examples for hosted
  and self-hosted services.
