---
"@cleverbrush/storage": minor
"@cleverbrush/storage-s3": minor
---

Add provider-neutral object storage contracts, portable errors and safe public URL
mapping. Add an S3-compatible adapter with explicit custom endpoints, credentials,
addressing style, key prefixes and independently configured public asset URLs.
Support streamed reads, bounded multipart writes, metadata-preserving copies,
idempotent deletion, cancellation and asynchronous disposal through `await using`
on the shared storage contract. Include shared contract
coverage, real Garage integration tests, and configuration examples for hosted
and self-hosted services.
