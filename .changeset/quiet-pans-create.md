---
'@cleverbrush/client': minor
'@cleverbrush/server': minor
---

feat(client): optimistic update + offline support + tag-based cache invalidation

- Add `optimisticUpdate()` middleware — tags mutations with IDs and tracks network failures
- Add `offlineQueue()` middleware — queues mutations when offline, replays on reconnect
- Add `useOptimisticMutation()` React hook — automatic TanStack Query cache snapshot/rollback
- Add `OfflineError` class extending `NetworkError`
- Extend `PerCallOverrides` with `optimisticUpdate` and `offlineQueue` keys

feat(server, client): tag-based cache invalidation via `.cacheTag()` endpoint annotations

- Add `.cacheTag(name[, selector])` to `EndpointBuilder` — declare cache tags with optional property selectors
- Add `CacheTagDefinition`, `CacheTagPropertyAccessor`, `createCacheTagTree`, `serializeTag`, `computeCacheKey` to `@cleverbrush/server`
- Add `cacheTags()` middleware to `@cleverbrush/client/cache` — tag-keyed HTTP caching with automatic invalidation on mutations
- Add `CacheTagMiddlewareOptions` with `ttlByTag`, `defaultTtl`, `condition`
- Add `cacheTags` and `headers` fields to `EndpointMeta` for middleware introspection
- Add implicit TanStack Query invalidation in `useMutation` when endpoint declares cache tags
- Add `CacheTagSelector` type for IDE autocomplete in `.cacheTag()` selector callbacks

feat(server, client): request idempotency middleware

- Add `idempotency()` server middleware — stores responses keyed by `X-Idempotency-Key` header, replays stored response on duplicate keys
- Add `idempotency()` client middleware — auto-generates UUID v4 as `X-Idempotency-Key` header for mutating requests, preserves key across retries
- Export `IdempotencyOptions` (client) and `ServerIdempotencyOptions` (server)
- Add `cacheResponse()` server middleware — tag-based server-side response caching with handler-level invalidation
