---
"@cleverbrush/web": minor
---

Added middleware system and lifecycle hooks for request/response interception.
Added resilience middlewares: retry (with exponential backoff, jitter, Retry-After), timeout, dedupe, and throttling cache — available as subpath exports (`@cleverbrush/web/retry`, `@cleverbrush/web/timeout`, `@cleverbrush/web/dedupe`, `@cleverbrush/web/cache`).
Added granular error types: WebError, TimeoutError, NetworkError with type guard functions.
Added per-call override support for middleware options (retry, timeout).
