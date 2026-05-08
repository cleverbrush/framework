---
"@cleverbrush/server": minor
"@cleverbrush/client": minor
---

Add `.public()` method to `EndpointBuilder`, `ScopedEndpointFactory`, and `SubscriptionBuilder` to explicitly mark endpoints as public (no authentication required). The server's authentication middleware now skips costly `authenticate()` calls for public endpoints, and the client skips sending `Authorization` headers and WS `?token=` query parameters for endpoints with `authRoles === null`.
