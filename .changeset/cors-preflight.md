---
"@cleverbrush/server": minor
---

Add opt-in server-wide CORS through `ServerBuilder.useCors()` and
`ServerCorsOptions`. Handle route-aware preflights before authentication while
preserving the normal pipeline for actual requests. Support exact origins,
origin predicates, explicit request/response header policies, credentials and
preflight cache duration. Reject disallowed origins before handlers and finalize
CORS headers per physical response, including errors and cache/idempotency replays.
