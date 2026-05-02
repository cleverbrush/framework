---
'@cleverbrush/client': minor
---

feat(client): optimistic update + offline support

Add `optimisticUpdate()` middleware — tags mutations with IDs and tracks network failures
Add `offlineQueue()` middleware — queues mutations when offline, replays on reconnect
Add `useOptimisticMutation()` React hook — automatic TanStack Query cache snapshot/rollback
Add `OfflineError` class extending `NetworkError`
Extend `PerCallOverrides` with `optimisticUpdate` and `offlineQueue` keys
