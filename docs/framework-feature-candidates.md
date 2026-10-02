# Framework feature candidates

Status: F01–F03 merged; F04–F05 implemented on the storage feature branch for PR review; F06–F07 remain proposed.
Assessment date: 2026-10-02.

This is an unprioritized list of reusable Framework capabilities and correctness
fixes. Numbering identifies candidates; it does not indicate implementation order.
Priority fields are intentionally blank. There are no estimates or release
commitments, and proposed interfaces are not current supported APIs.

## Review overview

| ID | Candidate | Main packages | Priority |
| --- | --- | --- | --- |
| F01 | Reliable multiple-file multipart uploads | `server` | |
| F02 | Typed upload contracts, client support, and OpenAPI | `server`, `client`, `server-openapi` | |
| F03 | Lossless JSONB document storage | `knex-schema`, `orm` | |
| F04 | Provider-independent object storage | Proposed `storage` package | |
| F05 | S3-compatible storage adapter | Proposed `storage-s3` package | |
| F06 | CORS preflight support | `server` | |
| F07 | Consistent polymorphic ORM writes | `orm`, `knex-schema` | |

Package names in the table omit the `@cleverbrush/` scope. New package names are
proposals for review.

## F01 — Reliable multiple-file multipart uploads

**Priority:**

**Original assessment.** `.upload()` parses multipart requests and exposes
buffered files. The [parser](../libs/server/src/Server.ts) stores one file per field
name and does not handle all parser limit signals. Read-only HTTP probes found:

| Request | Observed result |
| --- | --- |
| Two files under the same `files` field | Only the second file reached the handler |
| Eight-byte file with a four-byte limit | Success with four truncated bytes |
| Three files with a two-file limit | Third file silently discarded |
| Multipart body exceeding `maxBodySize` | Request accepted |
| Upload endpoint without a body schema | Uploaded files not populated |

**Proposed capability.** Preserve multiple files per field and their order. Enforce
file, request, field, and part limits; never present truncated files as successful
uploads. Provide explicit rejection information, terminate interrupted parsing,
and release resources. File-only requests must work without an unrelated text
body schema. Bounded buffering is sufficient for the initial capability; streaming
or temporary-file upload modes can be considered separately.

**Public API implications.** Extend upload options and handler file collections
without breaking existing single-file usage. Coordinate collection types and
rejection behavior with F02.

**Acceptance criteria.**

- Repeated fields preserve every accepted file, filename, and byte sequence.
- Size/count limits, including total multipart size, produce explicit failures or
  documented rejections without silent data loss.
- File-only requests, malformed bodies, disallowed types, truncated fields, and
  disconnected requests have coverage.
- Existing single-file endpoints continue to work.

**Implementation:** Added schema-based `file()` / `array(file())` uploads,
resource-limit enforcement, typed client serialization and matching OpenAPI.
See the [server upload guide](../libs/server/README.md#file-upload).

**Review notes:**

## F02 — Typed upload contracts, client support, and OpenAPI

**Priority:**

**Original assessment.** The typed client accepts one `FilePart` or `Blob` per
field. Its [request builder](../libs/client/src/client.ts) only creates multipart
bodies when a body argument is supplied. The
[OpenAPI generator](../libs/server-openapi/src/generateOpenApiSpec.ts) describes
multipart text fields but does not describe the uploaded file fields.

**Proposed capability.** Declare file field names, requiredness, and cardinality
in endpoint contracts. Infer matching handler and browser-client types. Serialize
file collections as repeated multipart fields, including file-only requests, and
generate equivalent OpenAPI binary-file schemas.

**Public API implications.** Extend endpoint upload metadata, inferred handler and
client argument types, and OpenAPI generation together. Preserve legacy single-file
calls. Keep shared contracts browser-safe and avoid duplicated application DTOs or
manual `FormData` construction in ordinary client calls.

**Acceptance criteria.**

- Type tests cover required/optional file fields and single/multiple cardinality.
- A real typed-client request reaches the server with all files intact.
- File-only requests work without a dummy body argument.
- OpenAPI describes the same file fields and requirements as the runtime contract.
- Existing client calls and browser builds remain compatible.

**Review notes:**

## F03 — Lossless JSONB document storage

**Priority:**

**Original assessment.** JSONB DDL already exists through `.jsonb()`. However,
the [read-schema compiler](../libs/knex-schema/src/read-schema.ts) reconstructs
objects from declared properties. A decoder probe using a stored document with
`type`, `scenes`, and extension data returned only `type` when that was the only
declared property. Nested `any` schemas and record-based JSONB columns were also
rejected. This probe exercised decoding, not a complete PostgreSQL round trip.

**Proposed capability.** Use native `object({...}).jsonb()` schemas for document
columns. Add `.acceptUnknownProps()` at each object node whose undeclared JSON
fields must survive reads and write-returning results. Document roots are objects;
nested values can include arrays, scalars and nulls. Reject non-JSON extension
values before persistence, while retaining declared-field serialization and
strict object projection behavior.

**Public API implications.** Reuse existing object schemas and database extensions.
Keep JSON storage validation, serialization and decoding in `knex-schema` and ORM
tracking in `orm`. Schema and JSON Schema packages remain database-agnostic.
Declared fields retain normal type inference; unknown fields are preserved at
runtime. Identifiers, ownership and revision metadata remain relational columns.

**Acceptance criteria.**

- Real PostgreSQL insert, update, select, projection, and ORM round trips preserve
  nested objects, arrays, nulls, optional fields, and undeclared extension keys.
- Write-returning results and subsequent reads have the same document shape.
- Invalid values such as functions, cycles, and non-finite numbers are rejected.
- Type inference and mapping preserve the JSON-document contract without `any`.
- Equality is structural; JSON object key ordering is not a storage guarantee.
- Existing relational projection and strict-schema behavior remains unchanged.

**Implementation:** Added native open-object preservation, database-local JSON
validation, PostgreSQL round-trip coverage and document-aware ORM tracking.
See the [JSONB guide](../libs/knex-schema/README.md#lossless-jsonb-documents).

**Review notes:**

## F04 — Provider-independent object storage

**Priority:**

**Existing support and gap.** HTTP file/stream results exist, but the Framework has
no reusable object-storage contract or implementation. Applications must currently
own provider access and object lifecycle plumbing themselves.

**Proposed capability.** Introduce a small server-side storage abstraction for
writing, streaming reads, metadata lookup, copying, and deletion. Identify objects
by stable keys and carry content type, size, and relevant metadata. Support
cancellation and explicit resource ownership for streams. Allow applications to
configure stable public asset URLs independently of provider endpoints.

**Public API implications.** Add a proposed `@cleverbrush/storage` package with
provider-neutral interfaces, results, and errors suitable for dependency injection.
The core package must not require an S3 SDK. Application ownership checks,
reference tracking, rendering, and database/filesystem consistency policies remain
application responsibilities.

**Acceptance criteria.**

- A shared adapter contract suite exercises read/write/stat/copy/delete behavior.
- Missing objects, failed writes, cancellation, and stream cleanup are explicit.
- Content metadata survives storage and retrieval.
- Public URL construction handles object keys correctly and does not expose
  credentials or depend on temporary signed URLs.

**Implementation:** Added the provider-neutral storage contract, portable errors, key and public URL helpers, and a shared adapter contract suite. See the [storage guide](../libs/storage/README.md).

**Review notes:**

## F05 — S3-compatible storage adapter

**Priority:**

**Existing support and gap.** There is no S3 adapter in the Framework. This
candidate supplies the first production implementation of F04.

**Proposed capability.** Add an adapter using the modular AWS SDK, configurable
with endpoint, region, bucket, credentials, path-style addressing, and key prefix.
Support streaming transfers and metadata, plus a separately configured public
asset base URL. All durable assets can use object storage while processing tools
materialize temporary local inputs when needed.

**Public API implications.** Add a proposed `@cleverbrush/storage-s3` package
implementing F04. Keep SDK types and credentials out of browser contracts. Preserve
public reads at stable URLs; bucket/CDN/proxy provisioning remains deployment
configuration. Direct browser uploads, private signed URLs, and provider-specific
features are separate future candidates.

**Acceptance criteria.**

- Run the storage contract suite against an S3-compatible test service.
- Exercise custom endpoints, path-style addressing, prefixes, public URL mapping,
  metadata, streaming, copies, and deletion.
- Cover missing objects, failed/interrupted transfers, repeated operations, and
  provider errors without leaking credentials.
- Verify object contents with an independent checksum or byte comparison rather
  than assuming an ETag always represents a content checksum.

**Implementation:** Added the configurable S3 adapter, bounded multipart transfers, cancellation and stream cleanup, Garage integration tests and a dedicated CI job. Hetzner configuration is documented; a live Hetzner account is not included in CI. See the [S3 guide](../libs/storage-s3/README.md).

**Review notes:**

## F06 — CORS preflight support

**Priority:**

**Existing support and gap.** Applications can set response headers in middleware,
but [route matching](../libs/server/src/Server.ts) occurs first. An HTTP probe sent
an OPTIONS preflight to a POST route and received `405`; ordinary middleware never
ran. Application middleware alone therefore cannot handle that preflight.

**Proposed capability.** Provide opt-in CORS configuration that handles preflight
before route rejection, while retaining normal authentication and authorization
for the actual request. Apply appropriate CORS headers to successful and error
responses. Support configured origins, methods, allowed/exposed headers, and
credential behavior.

**Public API implications.** Add server configuration or a first-class CORS helper
with documented execution order. Avoid silently changing the execution order of
existing ordinary middleware.

**Acceptance criteria.**

- Preflight for a registered route succeeds when origin/method/headers are allowed.
- Disallowed origins, methods, and headers are not inadvertently authorized.
- Relevant validation, authentication, not-found, and method errors have consistent
  CORS behavior.
- Actual protected requests still require authentication.
- Same-origin applications without CORS configuration remain unaffected.

**Review notes:**

## F07 — Consistent polymorphic ORM writes

**Priority:**

**Existing support and gap.** Ordinary entities support soft deletion and lifecycle
hooks. Source review of [variant writes](../libs/orm/src/variant-write.ts) found
direct Knex updates/deletes: variant deletion physically removes rows and these
paths bypass the ordinary write pipeline. This finding needs PostgreSQL
integration coverage before its complete behavior and compatibility impact are
considered verified.

**Proposed capability.** Make polymorphic mutations honor applicable soft-delete,
timestamp, and lifecycle-hook metadata. Keep an explicit permanent-deletion path.
Define consistent behavior across single-table and class-table variants, including
transactional updates to related base/variant rows.

**Public API implications.** Review variant update/delete/restore/permanent-delete
operations alongside ordinary DbSet behavior. Changing physical deletion to soft
deletion may affect existing consumers and requires an explicit compatibility and
release decision. Ordinary entity relationships remain a viable alternative while
this candidate is pending.

**Acceptance criteria.**

- PostgreSQL tests cover soft deletion, restoration, and permanent deletion for
  both polymorphic storage strategies.
- Hooks and timestamps follow the documented ordinary-entity contract.
- Failures roll back base/variant writes together and respect query predicates.
- Type tests describe the supported mutation surface accurately.

**Review notes:**

## Dependencies and review boundaries

- F01 and F02 form one coordinated upload capability; priorities remain open.
- F05 depends on F04. Its integration tests should reuse the storage contract suite.
- Existing bearer-token authentication, typed API calls, durable jobs, dependency
  injection, logging, and tracing can be reused. Additional authentication methods
  are not part of this list.
- Rendering engines, document revision rules, asset ownership, shared-asset cleanup,
  and data-import tools belong to applications, rather than Framework packages.
- Each accepted candidate needs focused tests, documentation, and a changeset for
  published-package changes. Required repository gates remain `npm run lint`,
  `npm run build`, and `npm run test`; database/storage features also need their
  relevant integration suites.

**Overall review notes:**
