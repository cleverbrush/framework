---
'@cleverbrush/client': patch
---

Respect maxEvents: 0 in useSubscription by retaining only lastEvent and leaving the event history empty.
