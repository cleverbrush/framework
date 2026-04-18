---
"@cleverbrush/client": major
---

Added middleware system and lifecycle hooks for request/response interception.
Added resilience middlewares: retry (with exponential backoff, jitter, Retry-After), timeout, dedupe, and throttling cache — available as subpath exports (`@cleverbrush/client/retry`, `@cleverbrush/client/timeout`, `@cleverbrush/client/dedupe`, `@cleverbrush/client/cache`).
Added granular error types: WebError, TimeoutError, NetworkError with type guard functions.
Added per-call override support for middleware options (retry, timeout).
