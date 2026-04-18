---
'@cleverbrush/client': major
'@cleverbrush/server': major
---

Add first-class WebSocket subscription support across the server and client libraries.

### `@cleverbrush/server`

- Add `endpoint.subscription()` for defining typed WebSocket subscription endpoints in API contracts.
- Add `SubscriptionBuilder`, `SubscriptionHandler`, `SubscriptionContext`, `tracked()`, and related subscription exports.
- Extend `mapHandlers()` and `HandlerMap` to support subscription handlers alongside HTTP handlers.
- Add WebSocket runtime support to `Server` for upgrade routing, frame parsing, incoming/outgoing validation, and tracked events.

### `@cleverbrush/client`

- Detect subscription endpoints in `createClient()` and return typed `Subscription` handles instead of HTTP callables.
- Add exported subscription utility types including `Subscription`, `SubscriptionCall`, `SubscriptionCallArgs`, `SubscriptionIncoming`, and `SubscriptionOutgoing`.
- Add React `useSubscription()` and update the unified React client typing so subscription endpoints do not expose query hooks.
- Fix proxy property resolution to ignore inherited prototype properties when accessing grouped client members.