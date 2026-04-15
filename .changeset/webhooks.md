---
'@cleverbrush/server': minor
'@cleverbrush/server-openapi': minor
---

Add webhook support via `defineWebhook` and `ServerBuilder.webhook()`.

- `defineWebhook(name, options)` — creates a `WebhookDefinition` describing an async out-of-band request your API sends to subscribers.
- `ServerBuilder.webhook(def)` — registers a webhook definition for documentation purposes (webhooks are not served as HTTP routes).
- `ServerBuilder.getWebhooks()` — returns all registered webhook definitions.
- `generateOpenApiSpec` now accepts a `webhooks` option and emits a top-level `webhooks` map in the generated OpenAPI 3.1 document.

`WebhookDefinition` is exported from `@cleverbrush/server`.
