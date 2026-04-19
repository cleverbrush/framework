# @cleverbrush/auth

## 3.0.1

### Patch Changes

- 53d2b8f: `@cleverbrush/knex-schema`: compose default schema extensions (`stringExtensions`, `numberExtensions`, `arrayExtensions`) alongside `dbExtension` so that builders exported from the package expose built-in methods such as `.uuid()`, `.email()`, `.positive()`, and `.nonempty()` in addition to `.hasColumnName()` / `.hasTableName()`.
- Updated dependencies [53d2b8f]
  - @cleverbrush/schema@3.0.1

## 3.0.0

### Major Changes

- 4f266be: Add `@cleverbrush/auth` — transport-agnostic authentication and authorization

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

- 44077df: Add OAuth 2.0 and OpenID Connect authentication scheme factories. `authorizationCodeScheme()` and `clientCredentialsScheme()` create OAuth 2.0 schemes with typed flow configuration. `oidcScheme()` creates an OpenID Connect scheme with a discovery URL. All three factories follow the existing pattern (private class + public factory) and expose marker properties (`flows` / `openIdConnectUrl`) for automatic OpenAPI security scheme detection.

### Patch Changes

- Updated dependencies [60efc99]
- Updated dependencies [2f06dc4]
- Updated dependencies [f0f93ba]
- Updated dependencies [0df3d59]
- Updated dependencies [0cc7cbe]
- Updated dependencies [181f89e]
- Updated dependencies [8979127]
- Updated dependencies [b8f1285]
- Updated dependencies [3473d7e]
- Updated dependencies [308c9ea]
- Updated dependencies [26a7d85]
  - @cleverbrush/schema@3.0.0
