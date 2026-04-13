# @cleverbrush/auth

[![CI](https://github.com/cleverbrush/framework/actions/workflows/ci.yml/badge.svg)](https://github.com/cleverbrush/framework/actions/workflows/ci.yml)
[![License: BSD-3-Clause](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](../../LICENSE)

Transport-agnostic authentication and authorization for TypeScript. Ships with JWT and cookie schemes, a fluent policy builder, and a typed `Principal` value object. Designed for [`@cleverbrush/server`](../server) but usable in any Node.js context.

## Features

- **Transport-agnostic** — authentication schemes receive a plain `AuthenticationContext` (headers + cookies + items), not a raw HTTP request.
- **`Principal<T>`** — immutable, typed value object exposing `.hasRole()`, `.hasClaim()`, `.isAuthenticated`, and `.claims`.
- **JWT scheme** — `jwtScheme()` supports HS256/HS384/HS512 and RS256/RS384/RS512; configurable issuer, audience, clock tolerance, and role claim.
- **Cookie scheme** — `cookieScheme()` with a user-supplied async `validate()` function (session lookup, signature check, etc.).
- **Authorization** — `PolicyBuilder` with `.requireRole()` / `.require(predicate)` fluent API; `AuthorizationService.authorize()` accepts requirements or a named policy.
- **`requireRole()` helper** — convenience factory for single-call role requirements.
- **Cookie utilities** — `parseCookies()` and `serializeCookie()` for low-level cookie handling.
- **Zero runtime dependencies** — uses only Node.js built-in `crypto`.

## Installation

```bash
npm install @cleverbrush/auth
```

## Quick Start

```ts
import { jwtScheme, Principal } from '@cleverbrush/auth';

type UserClaims = { sub: string; role: string };

const jwt = jwtScheme<UserClaims>({
    secret: process.env.JWT_SECRET!,
    mapClaims: claims => ({
        sub: claims.sub as string,
        role: claims.role as string
    })
});

// Authenticate a request context (built from HTTP headers)
const result = await jwt.authenticate({
    headers: { authorization: 'Bearer <token>' },
    cookies: {},
    items: new Map()
});

if (result.succeeded) {
    const principal: Principal<UserClaims> = result.principal;
    principal.isAuthenticated; // true
    principal.hasRole('admin'); // boolean
    principal.value.sub;       // string
}
```

## JWT Authentication

```ts
import { jwtScheme, signJwt } from '@cleverbrush/auth';

// Sign a token (for testing or token issuance)
const token = signJwt({ sub: 'user-1', role: 'admin' }, 'my-secret');

// Verify and authenticate
const scheme = jwtScheme({
    secret: 'my-secret',
    algorithms: ['HS256'],          // default
    issuer: 'https://my-app.com',   // optional iss check
    audience: 'my-api',             // optional aud check
    clockTolerance: 5,              // seconds
    roleClaim: 'role',              // default
    mapClaims: c => ({ sub: c.sub as string, role: c.role as string })
});
```

Supported algorithms: `HS256`, `HS384`, `HS512`, `RS256`, `RS384`, `RS512`.

## Cookie Authentication

```ts
import { cookieScheme } from '@cleverbrush/auth';

const cookie = cookieScheme<{ userId: string; role: string }>({
    cookieName: 'session',
    validate: async (cookieValue) => {
        // Look up session from DB, verify signature, etc.
        const session = await sessionStore.get(cookieValue);
        if (!session) return null;
        return { userId: session.userId, role: session.role };
    }
});
```

## Authorization

### Policy Builder

```ts
import { PolicyBuilder, requireRole } from '@cleverbrush/auth';

const adminPolicy = new PolicyBuilder()
    .requireRole('admin')
    .require(principal => principal.hasClaim('verified', 'true'))
    .build('admin-only');
```

### Authorization Service

```ts
import { AuthorizationService } from '@cleverbrush/auth';

const policies = new Map([['admin-only', adminPolicy]]);
const authz = new AuthorizationService(policies);

// Check by requirements array
const result = await authz.authorize(principal, [requireRole('admin')]);

// Check by named policy
const result2 = await authz.authorize(principal, 'admin-only');

if (!result.allowed) {
    console.log(result.reason); // 'Not authenticated' | 'Requirement failed'
}
```

## Cookie Utilities

```ts
import { parseCookies, serializeCookie } from '@cleverbrush/auth';

// Parse Cookie header
const cookies = parseCookies('session=abc123; theme=dark');
// { session: 'abc123', theme: 'dark' }

// Build Set-Cookie header value
const header = serializeCookie('session', 'abc123', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 3600
});
```

## Integration with @cleverbrush/server

```ts
import { ServerBuilder } from '@cleverbrush/server';
import { jwtScheme } from '@cleverbrush/auth';

const server = new ServerBuilder();

server
    .useAuthentication({
        defaultScheme: 'jwt',
        schemes: [jwtScheme({ secret: process.env.JWT_SECRET!, mapClaims: c => c })]
    })
    .useAuthorization();

await server.listen(3000);
```

## License

BSD-3-Clause — see [LICENSE](../../LICENSE).
