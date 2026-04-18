---
'@cleverbrush/auth': major
---

Add OAuth 2.0 and OpenID Connect authentication scheme factories. `authorizationCodeScheme()` and `clientCredentialsScheme()` create OAuth 2.0 schemes with typed flow configuration. `oidcScheme()` creates an OpenID Connect scheme with a discovery URL. All three factories follow the existing pattern (private class + public factory) and expose marker properties (`flows` / `openIdConnectUrl`) for automatic OpenAPI security scheme detection.
