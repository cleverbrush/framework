---
'@cleverbrush/client': minor
'@cleverbrush/server': minor
---

Add request batching support.

**Client** (`@cleverbrush/client/batching`): new `batching()` middleware that coalesces concurrent HTTP requests into a single `POST /__batch`, then fans responses back to each caller transparently. Options: `maxSize`, `windowMs`, `batchPath`, `skip`.

**Server** (`@cleverbrush/server`): new `ServerBuilder.useBatching(options?)` method that registers the `/__batch` endpoint. Sub-requests are processed through the full middleware and handler pipeline. Options: `path`, `maxSize`, `parallel`.
