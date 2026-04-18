---
'@cleverbrush/server-openapi': major
---

Auto-detect OAuth 2.0 and OpenID Connect security schemes from `AuthenticationConfig`. Schemes created with `authorizationCodeScheme()`, `clientCredentialsScheme()`, or `oidcScheme()` are now automatically mapped to the correct OpenAPI `oauth2` or `openIdConnect` security scheme objects, including flow URLs and scopes.
