---
'@cleverbrush/server': minor
---

Add `@cleverbrush/server` — schema-first HTTP server framework

A new HTTP server library built on Node.js `http`/`https` that integrates tightly with `@cleverbrush/schema` for request validation and `@cleverbrush/di` for dependency injection.

### Key Features

- **Endpoint builder** — fluent `endpoint.get('/users').body(schema).query(schema).authorize()` API; fully typed handler context inferred from the builder.
- **Action results** — `ActionResult.ok()`, `.created()`, `.noContent()`, `.redirect()`, `.file()`, `.stream()`, `.status()` — no manual `res.end()`.
- **Content negotiation** — pluggable `ContentTypeHandler` registry; JSON registered by default; honours the `Accept` header.
- **Middleware pipeline** — `server.use(middleware)` for global middleware; per-endpoint middleware via `handle(ep, handler, { middlewares })`.
- **DI integration** — `endpoint.inject({ db: IDbContext })` resolves services per-request from `@cleverbrush/di`.
- **Authentication & authorization** — `server.useAuthentication()` / `server.useAuthorization()` wired to `@cleverbrush/auth` schemes and policies.
- **RFC 9457 Problem Details** — validation errors and HTTP errors are serialized as `application/problem+json`.
- **`route()` helper** — typed path builder using `ParseStringSchemaBuilder` segments for fully type-safe path parameters.
- **Health check** — optional `/healthz` endpoint via `server.withHealthcheck()`.
- **OpenAPI-ready** — `getRegistrations()` exposes endpoint metadata consumed by `@cleverbrush/server-openapi`.
