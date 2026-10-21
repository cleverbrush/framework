# Migrating from Framework v4.x to v5

Upgrade the fixed-version `@cleverbrush/*` package group together. Framework is
application-agnostic; authentication scope, authorization policy and deployment
remain application responsibilities.

## Runtime and packaging

Node-based consumers and development tooling require Node.js 24+. Browser entry
points remain browser-safe; this does not introduce Node dependencies into them.
Use npm 11 for this repository. Regenerate consumer lockfiles when upgrading so
patched HTTP, multipart and telemetry dependencies are resolved.

## Existing migration guides

- [Immutable schemas and query builders, projections and read/write boundaries](../libs/knex-schema/MIGRATION-v5.md)
- [Durable jobs and recurring schedules](../libs/scheduler/MIGRATION-v5.md)
- [Cache key formats, equality and React form lifecycle](cache-form-migration.md)

Current package READMEs describe the supported APIs, including connection-independent
query definitions and modular contract implementations.

## Authentication and cookies

JWT verification now rejects non-object headers/payloads, invalid registered claim
types, unsupported critical JOSE extensions and expiry at the exact expiration
instant. Clock tolerance must be finite and non-negative. Configure one supported
key family per scheme: RSA public/private keys cannot serve as HMAC secrets.
Configure separate schemes for independently keyed algorithm families.

Cookie parsing returns a null-prototype dictionary. Use `Object.hasOwn()` rather
than inherited methods; the first duplicate wins. Malformed percent escapes remain
literal and do not prevent other cookies from being parsed. Serialization rejects
attribute injection, invalid expiry dates and non-integer `maxAge` values. Cookie
paths remain omitted unless explicitly configured.

## Server idempotency

The server middleware now requires an explicit `scope` callback. Install it after
authentication and authorization and derive the scope from verified identity and
tenant context. Returning `undefined` bypasses replay. Use a constant only for an
intentionally public operation:

```ts
import { idempotency } from '@cleverbrush/server';

const replay = idempotency({
    scope: () => 'public-operation',
    ttl: 60_000
});
```

Keys also include the HTTP method and full request URL. Concurrent identical keys
share one execution. Reusing a key asserts the same input; bodies are not compared.
The store is process-local, not durable exactly-once execution. Restart, expiry or
a thrown handler failure can allow a later execution; use database deduplication
for durable business guarantees.

The default bounds are 1,000 retained/pending keys and 65,536 response-body bytes per
key (`maxEntries`, `maxResponseBytes`). Capacity exhaustion returns 503 without
running the handler. Oversized/incomplete responses keep a reservation: retries
return 409 instead of repeating a potentially successful mutation. Completed HTTP
responses, including errors, are replayed until expiry; thrown failures are not.

## Response caching

Replay preserves status, header overloads, `setHeader()` headers and all chunks
written through `write()`/`end()`. Hooks are restored even when handlers throw.
The response cache retains at most 1000 keys (evicting oldest keys) and skips
incomplete responses, bodies over 65,536 bytes,
`Set-Cookie`, and `Cache-Control: private`/`no-store` responses. Cache tags must
still distinguish every response shape and authorization/tenant scope.
Configure `maxEntries` and `maxResponseBytes` to adjust these bounds. TTL values
must be finite and non-negative. Retention uses the longest TTL among an endpoint's
tags; all zero disables retention.

## Dependency injection and request context

Optional service resolution returns `undefined` only for unregistered services.
Factory failures, circular dependencies and scope violations now propagate even
through factory proxies. Root factories respect `validateScopes`; resolve scoped
dependencies inside an explicit scope rather than relying on an implicit cache.

`IRequestContext.url` is typed as the actual `URL` object, not a string. Concurrent
body readers share the full buffered body or the same error. Aborted reads reject
instead of hanging. Query/header dictionaries use own properties without a prototype.
