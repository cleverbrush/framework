---
'@cleverbrush/auth': minor
---

Add `@cleverbrush/auth` — transport-agnostic authentication and authorization

A new authentication and authorization library for TypeScript. Ships with JWT and cookie authentication schemes; designed to plug into `@cleverbrush/server` but usable in any context.

### Key Features

- **Transport-agnostic `AuthenticationScheme<T>`** — schemes receive an `AuthenticationContext` (headers + cookies + items map) and return a typed `Principal<T>`.
- **`Principal<T>`** — immutable value object exposing `.hasRole()`, `.hasClaim()`, `.isAuthenticated`, and `.claims`.
- **JWT scheme** — `jwtScheme()` supports HS256/HS384/HS512 and RS256/RS384/RS512; configurable issuer, audience, clock tolerance, and role claim.
- **Cookie scheme** — `cookieScheme()` delegates validation to a user-supplied async `validate()` function (session lookup, signature check, etc.).
- **Authorization** — `PolicyBuilder` with `.requireRole()` / `.require(predicate)` fluent API; `AuthorizationService.authorize()` accepts either a requirements array or a named policy.
- **`requireRole()` helper** — convenience factory for role-based requirements.
- **Cookie utilities** — `parseCookies()` and `serializeCookie()` for low-level cookie handling.
- **Zero runtime dependencies** — pure TypeScript; uses Node.js built-in `crypto` for JWT signature verification.
