# Security

Report suspected vulnerabilities privately to `andrew_zol@cleverbrush.com`.
Include affected versions, impact and a minimal reproduction using synthetic data.
Do not publish credentials or real user data in issues, logs or pull requests.

## Consumer responsibilities

- Use supported Node.js 24+ runtimes and keep dependency lockfiles current.
- Authenticate and authorize before response-cache or idempotency middleware.
  Include every tenant, identity and representation boundary in cache keys and
  derive idempotency scopes only from verified identity. Keep client cache/dedupe
  instances request/session scoped when used on a server.
- Configure JWT issuer, audience and an explicit permitted algorithm family;
  store signing keys outside source control. OAuth/OIDC adapters describe schemes
  and delegate validation to the configured callback; they do not implement a
  complete login flow or validate tokens automatically.
- Set upload/body limits, authenticate upload endpoints and validate file contents
  independently of client-supplied MIME types and filenames.
- Use query parameters for untrusted values. Raw SQL and migration/config modules
  are trusted-code boundaries, not sandboxes. Review destructive migrations.
- Restrict CORS origins and configure cookie `Secure`, `HttpOnly`, `SameSite` and
  CSRF protection to suit the application. Cookie authentication alone does not
  provide CSRF protection.
- Do not include secrets in URLs. Review telemetry configuration before exporting
  full URLs, SQL statements, headers or custom attributes to third parties.
- Use transactional deduplication for durable exactly-once business effects;
  in-memory idempotency and job retries cannot guarantee them by themselves.

The demo stack uses development credentials. Do not expose it publicly or reuse
those credentials in deployed applications. Dependency advisories must be reviewed
for reachability; passing an automated scan does not establish absence of defects.
