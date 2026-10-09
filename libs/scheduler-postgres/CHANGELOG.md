# @cleverbrush/scheduler-postgres

## 5.0.0

### Major Changes

- 30f83aa: Redesign the scheduler for versioned immediate, delayed and recurring jobs,
  typed separate handlers, durable ordered progress and fenced worker leases.
  Add an independently installed PostgreSQL adapter using Framework ORM and
  knex-schema, explicit migrations, transactional enqueue and restart recovery.
  
  Retries are opt-in and rerun whole handlers. Calendar triggers use explicit UTC
  or IANA zones with persisted cursors and missed/overlap policies. See the
  scheduler v4.x-to-v5 migration guide for the breaking API and rollout steps.
  The adapter joins the fixed Framework release group.
  
  Retain schema-driven minute/day/week/month/year definitions and their
  discriminated Schedule type, exposing individual schemas and the Schemas facade.
  Normalize recurrence defaults, dates and weekday order before fingerprinting;
  unchanged registrations retain their cursor and start anchor. Preserve the
  one-based calculator index and accept the deprecated maxOccurences spelling
  while rejecting ambiguous dual spelling. Name the explicit persistence option
  storageRepository. Derive PostgreSQL row and entity types from schema definitions
  without parallel hand-written row types.
  
  Use native Date/Intl calendar calculations without an additional date-time
  runtime dependency. Preserve DST-gap skipping and earlier-fold selection,
  including non-hour transitions and skipped calendar dates, independently of
  the host time zone. Bound minute schedules to the representable Date range.
- c5b4dbc: Require Node.js 24+ consistently across all published packages. Correct the root and all published-package license files to BSD-3-Clause, matching package metadata and documentation, and verify license consistency in source and npm tarballs. See docs/MIGRATION-v5.md for migration guidance.
  
  Harden JWT key/algorithm and claim validation, cookie parsing/serialization, and request-body lifecycle handling. Require explicit authorization scope for bounded server idempotency; coalesce concurrent retries and capture full response bodies. Bound response caching and bypass private, no-store and cookie-setting responses.
  
  Preserve DI scope validation through factories and propagate registered optional-service failures. Fix batch response status/header capture, timeout abort-listener cleanup, concurrent deduplication response cloning, CLI database cleanup on validation/production-guard failures, and the missing client idempotency JavaScript export. Update security-sensitive dependencies and ensure OpenTelemetry disable flags override SDK defaults.
  
  Add regression tests, package-consumer smoke checks, package-level unit coverage floors, migration/security documentation and release validation gates.

### Patch Changes

- Updated dependencies [e43b72f]
- Updated dependencies [6d3aecf]
- Updated dependencies [cb5d622]
- Updated dependencies [30f83aa]
- Updated dependencies [d916566]
- Updated dependencies [d31323a]
- Updated dependencies [6d7e982]
- Updated dependencies [a90a491]
- Updated dependencies [efe2f2f]
- Updated dependencies [81c2de4]
- Updated dependencies [f9b1f56]
- Updated dependencies [c5b4dbc]
- Updated dependencies [47133eb]
- Updated dependencies [e788a0d]
  - @cleverbrush/knex-schema@5.0.0
  - @cleverbrush/orm@5.0.0
  - @cleverbrush/scheduler@5.0.0
  - @cleverbrush/schema@5.0.0
