---
'@cleverbrush/server': patch
---

Close WebSocket subscriptions when middleware rejects the request without
calling the next handler, preventing idle unauthorized connections.
