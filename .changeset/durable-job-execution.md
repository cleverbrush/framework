---
"@cleverbrush/scheduler": major
"@cleverbrush/scheduler-postgres": major
---

Redesign the scheduler for versioned immediate, delayed and recurring jobs,
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
