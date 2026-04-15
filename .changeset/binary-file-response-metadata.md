---
'@cleverbrush/server': minor
'@cleverbrush/server-openapi': minor
---

Add `.producesFile()` to `EndpointBuilder` for binary / file response metadata

- New `.producesFile(contentType?, description?)` method on `EndpointBuilder`
- When set, OpenAPI spec emits `content: { '<contentType>': { schema: { type: 'string', format: 'binary' } } }` instead of a JSON schema entry
- Defaults to `application/octet-stream` when no content type is specified
- Takes precedence over `.returns()` for response schema emission
- File download endpoints now show proper response bodies in generated docs
