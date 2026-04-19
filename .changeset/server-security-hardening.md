---
"@cleverbrush/server": minor
---

Security hardening for the server package:

- **Body size limits (DoS prevention)**: `RequestContext.body()` and the batch endpoint's `readBuffer()` now reject requests exceeding `maxBodySize` (default 5 MB) with `413 Payload Too Large`. The limit is configurable via the new `ServerOptions.maxBodySize` option. The WebSocket server is created with the matching `maxPayload` cap so oversized frames are dropped by the `ws` library before they reach application code.
- **Prototype pollution**: All `JSON.parse` calls on untrusted input have been replaced with `safeJsonParse()`, which uses a reviver to strip `__proto__` and `constructor` keys. This covers the request body (`RequestContext.json()`), the default JSON content-type handler (`ContentNegotiator`), WebSocket client frames (`parseClientFrame`), and the batch request body.
- **JSON depth bomb**: `checkJsonDepth()` is called after parsing in body-reading paths and rejects any structure nested deeper than 64 levels.
- **WebSocket queue overflow (DoS)**: The incoming message queue in `#runSubscription()` is now capped at 1 024 entries. Clients that exceed the cap receive a `429` error frame and the connection is closed.
- **WebSocket error leakage**: The subscription handler's catch block no longer forwards raw `Error.message` values to clients. A generic `"Internal error"` is sent instead; the real error is logged server-side.
